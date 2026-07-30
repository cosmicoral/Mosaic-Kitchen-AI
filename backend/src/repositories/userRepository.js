const pool = require('../db/pool');

async function findByEmail(email){
    const result = await pool.query(
        'SELECT id, email, password_hash, created_at FROM users WHERE email = $1',
        [email]);
    return result.rows[0] || null;
}

async function create(email, passwordHash){
    const result = await pool.query(
        'INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id, email, created_at',
        [email, passwordHash]);
    return result.rows[0]
}

module.exports = { findByEmail, create };