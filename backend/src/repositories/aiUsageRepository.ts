import pool from '../db/pool.ts';

// Must stay in step with the ai_usage_feature_valid CHECK constraint in the
// migrations. tests/aiUsageFeatures.test.ts compares the two, because adding a
// key here without widening the constraint is a failure that only shows up
// after a model call has already been paid for.
export type AiFeature =
  | 'meal-plan'
  | 'pantry-cook'
  | 'plan-translate'
  | 'vision-scan'
  // Glossing ingredient names was calling the model and recording nothing at
  // all, which made it invisible to both the per-user quota and the whole-
  // product spend ceiling. Not a large cost — most names are answered from the
  // lexicon or the shared cache — but an unmeasured one, and a ceiling that
  // cannot see a spend cannot bound it.
  | 'ingredient-gloss';

export interface UsageRecord {
  feature: AiFeature;
  model: string;
  promptTokens: number;
  completionTokens: number;
  costUsd: number;
  succeeded: boolean;
}

export async function record(userId: string, usage: UsageRecord): Promise<void> {
  await pool.query(
    `INSERT INTO ai_usage
       (user_id, feature, model, prompt_tokens, completion_tokens, cost_usd, succeeded)
     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
    [
      userId,
      usage.feature,
      usage.model,
      usage.promptTokens,
      usage.completionTokens,
      usage.costUsd,
      usage.succeeded,
    ]
  );
}

// Every call this month, failed ones included. A failed call still cost money
// even though it earned the user nothing, and a spend ceiling that ignored
// failures would let a broken retry loop spend past it.
export async function totalCostUsdThisMonth(): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(cost_usd), 0) AS total
       FROM ai_usage
      WHERE created_at >= date_trunc('month', now())`
  );
  return Number(result.rows[0]?.total ?? 0);
}

// One account's spend this month, across every feature, in USD.
//
// Failures included, and for the same reason the global total includes them: a
// retry loop that fails every time still bills. Counting only successes would
// make the runaway case — the only case this exists to catch — the one case it
// could not see.
export async function costUsdThisMonthForUser(userId: string): Promise<number> {
  const result = await pool.query<{ total: string | null }>(
    `SELECT COALESCE(SUM(cost_usd), 0) AS total
       FROM ai_usage
      WHERE user_id = $1
        AND created_at >= date_trunc('month', now())`,
    [userId]
  );
  return Number(result.rows[0]?.total ?? 0);
}

// Counts successful calls only: a failed generation should not eat a free-tier
// allowance the user never got the benefit of.
export async function countSuccessfulThisMonth(
  userId: string,
  feature: AiFeature
): Promise<number> {
  const result = await pool.query<{ count: string }>(
    `SELECT COUNT(*) AS count
       FROM ai_usage
      WHERE user_id = $1
        AND feature = $2
        AND succeeded = true
        AND created_at >= date_trunc('month', now())`,
    [userId, feature]
  );
  return Number(result.rows[0]?.count ?? 0);
}