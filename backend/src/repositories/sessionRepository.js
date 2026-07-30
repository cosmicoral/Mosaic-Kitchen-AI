const pool = require('../db/pool');

async function create(id, userId, expiresAt) {
  const result = await pool.query(
    'INSERT INTO sessions (id, user_id, expires_at) VALUES ($1, $2, $3) RETURNING id, user_id, expires_at',
    [id, userId, expiresAt]
  );
  return result.rows[0];
}

// Expiry is filtered in SQL so callers can never accidentally use a stale
// session, and so the database clock is the single source of truth.
// Joins to users so the auth middleware needs only one round trip.
async function findActiveWithUser(id) {
  const result = await pool.query(
    `SELECT s.id            AS session_id,
            s.expires_at    AS expires_at,
            u.id            AS user_id,
            u.email         AS email,
            u.created_at    AS user_created_at
       FROM sessions s
       JOIN users u ON u.id = s.user_id
      WHERE s.id = $1
        AND s.expires_at > now()`,
    [id]
  );
  return result.rows[0] || null;
}

async function deleteById(id) {
  await pool.query('DELETE FROM sessions WHERE id = $1', [id]);
}

async function deleteExpired() {
  const result = await pool.query('DELETE FROM sessions WHERE expires_at <= now()');
  return result.rowCount;
}

module.exports = { create, findActiveWithUser, deleteById, deleteExpired };
