import pool from '../db/pool.ts';

export interface CancellationWaiver {
  id: string;
  user_id: string;
  stripe_price_id: string;
  stripe_session_id: string | null;
  waiver_version: string;
  locale: string;
  accepted_at: Date;
}

const COLUMNS = `id, user_id, stripe_price_id, stripe_session_id,
                 waiver_version, locale, accepted_at`;

export interface WaiverRecord {
  userId: string;
  priceId: string;
  version: string;
  locale: string;
}

/**
 * Write the acknowledgement, and return its id so the caller can attach the
 * Stripe session to it once Stripe has produced one.
 *
 * Called before the Checkout session is created, not after. If Stripe then
 * fails, the row stays with a null session id — a record that we asked and
 * they agreed, for a purchase that never happened. That is a harmless orphan.
 * The reverse order would produce the harmful one: a live subscription with no
 * evidence that the customer was ever told what they were giving up.
 */
export async function record(entry: WaiverRecord): Promise<string> {
  const result = await pool.query<{ id: string }>(
    `INSERT INTO cancellation_waivers
       (user_id, stripe_price_id, waiver_version, locale)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [entry.userId, entry.priceId, entry.version, entry.locale]
  );
  return result.rows[0]!.id;
}

export async function attachSession(id: string, sessionId: string): Promise<void> {
  await pool.query(
    `UPDATE cancellation_waivers SET stripe_session_id = $2 WHERE id = $1`,
    [id, sessionId]
  );
}

/**
 * The most recent acknowledgement for an account. This is what gets read if
 * someone ever disputes a charge, so it returns the row rather than a boolean
 * — the date, the version and the language are the parts that matter, and a
 * `true` would throw all three away.
 */
export async function findLatestByUser(userId: string): Promise<CancellationWaiver | null> {
  const result = await pool.query<CancellationWaiver>(
    `SELECT ${COLUMNS}
       FROM cancellation_waivers
      WHERE user_id = $1
      ORDER BY accepted_at DESC
      LIMIT 1`,
    [userId]
  );
  return result.rows[0] ?? null;
}
