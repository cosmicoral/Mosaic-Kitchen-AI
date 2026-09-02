import pool from '../db/pool.ts';
import type { Subscription } from '../types/index.ts';

const COLUMNS = `id, user_id, stripe_subscription_id, stripe_price_id, status,
                 current_period_end, cancel_at_period_end, created_at, updated_at`;

// Ordered by period end rather than created_at: webhooks are not delivered in
// order, so if a cancelled subscription's row has not been closed off yet, the
// one that actually runs furthest into the future is the truthful answer.
export async function findActiveByUser(userId: string): Promise<Subscription | null> {
  const result = await pool.query<Subscription>(
    `SELECT ${COLUMNS}
       FROM subscriptions
      WHERE user_id = $1
        AND status IN ('active', 'trialing', 'past_due')
      ORDER BY current_period_end DESC
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}

export interface SubscriptionUpsert {
  userId: string;
  stripeSubscriptionId: string;
  stripePriceId: string;
  status: string;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export async function upsert(input: SubscriptionUpsert): Promise<Subscription> {
  const result = await pool.query<Subscription>(
    `INSERT INTO subscriptions (
       user_id, stripe_subscription_id, stripe_price_id,
       status, current_period_end, cancel_at_period_end
     )
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
       stripe_price_id      = EXCLUDED.stripe_price_id,
       status               = EXCLUDED.status,
       current_period_end   = EXCLUDED.current_period_end,
       cancel_at_period_end = EXCLUDED.cancel_at_period_end,
       updated_at           = now()
     RETURNING ${COLUMNS}`,
    [
      input.userId,
      input.stripeSubscriptionId,
      input.stripePriceId,
      input.status,
      input.currentPeriodEnd,
      input.cancelAtPeriodEnd,
    ]
  );

  const row = result.rows[0];
  if (!row) throw new Error('INSERT ... RETURNING returned no row');
  return row;
}

// Returns false when the event id was already present, which is the signal to
// skip the handler entirely. Done as an INSERT ... ON CONFLICT rather than a
// SELECT followed by an INSERT, which would leave a window in which two
// concurrent deliveries of the same event both see "not processed yet".
export async function recordEventIfNew(id: string, type: string): Promise<boolean> {
  const result = await pool.query(
    `INSERT INTO stripe_events (id, type) VALUES ($1, $2)
     ON CONFLICT (id) DO NOTHING`,
    [id, type]
  );
  return (result.rowCount ?? 0) > 0;
}
