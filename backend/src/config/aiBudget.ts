/**
 * Per-user AI spend guardrails, as distinct from request counts.
 *
 * Counting requests bounds the *number* of calls, not what they cost. A plan
 * for a six-person household with fourteen meals and a retry is several times
 * the cost of a plan for one person, and two accounts on identical quotas can
 * differ by that much. This is the second axis.
 *
 * Three bands rather than one cliff:
 *
 *   below target   normal service
 *   soft cap       degrade — a shorter prompt, one attempt instead of two, and
 *                  the cheap translation scope rather than the full one
 *   hard cap       stop, because at this point something is wrong rather than
 *                  merely expensive
 *
 * The soft band is the point. A hard block at the target would turn an ordinary
 * heavy month into a broken product, and the user would have no idea why — the
 * cost is our concern, not theirs, and none of these numbers are ever shown in
 * the interface.
 *
 * Not on the degrade list, though it is the obvious first idea: switching to a
 * cheaper model. There is not one. MODEL_PRICING holds two entries and the
 * "mini" is the dearer of the two, so a model swap here would cost more per
 * token while looking like a saving in the code. If a genuinely cheaper model
 * is configured later this is where it belongs; until then, saying so is worth
 * more than a line of code that pretends.
 */

export type SpendBand = 'normal' | 'degraded' | 'blocked';

interface Band {
  targetGbp: number;
  softCapGbp: number;
  hardCapGbp: number;
}

// Read at call time, not at import, so tests and deployments can change them
// without controlling module load order.
function num(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

/**
 * Free accounts only.
 *
 * The defaults come from the business constraint: 500 free users under £200 a
 * year is £0.033 each per month, and the quotas are set to land near £0.016 —
 * so the target below is a warning line well before the budget, not the budget
 * itself. The hard cap at £0.05 is three times the expected spend: reaching it
 * means a loop or an abusive account, not a keen cook.
 */
export function freeTierBand(): Band {
  return {
    targetGbp: num('FREE_AI_COST_TARGET_GBP', 0.025),
    softCapGbp: num('FREE_AI_COST_SOFT_CAP_GBP', 0.03),
    hardCapGbp: num('FREE_AI_COST_HARD_CAP_GBP', 0.05),
  };
}

/**
 * Paying accounts.
 *
 * They have one too, but set far above realistic use. This is not a ration —
 * a Plus subscriber's expected AI cost is about £0.14 against £7.99 of revenue,
 * so the only thing this catches is a runaway loop. A paying customer who
 * somehow reaches it should get a conversation, not a wall, which is why the
 * hard cap is generous enough that hitting it is evidence of a bug.
 */
export function paidTierBand(): Band {
  return {
    targetGbp: num('PAID_AI_COST_TARGET_GBP', 1.0),
    softCapGbp: num('PAID_AI_COST_SOFT_CAP_GBP', 2.0),
    hardCapGbp: num('PAID_AI_COST_HARD_CAP_GBP', 5.0),
  };
}

export function bandFor(isFree: boolean): Band {
  return isFree ? freeTierBand() : paidTierBand();
}

export function classifySpend(spentGbp: number, band: Band): SpendBand {
  if (spentGbp >= band.hardCapGbp) return 'blocked';
  if (spentGbp >= band.softCapGbp) return 'degraded';
  return 'normal';
}
