import pool from '../db/pool.ts';

export type AiFeature = 'meal-plan' | 'vision-scan';

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