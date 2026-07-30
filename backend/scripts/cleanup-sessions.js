// Deletes expired sessions. Rows are already unusable (findActiveWithUser
// filters on expires_at), this just stops the table growing forever.
// Run periodically, e.g. a daily cron: node scripts/cleanup-sessions.js
const pool = require('../src/db/pool');
const sessionRepository = require('../src/repositories/sessionRepository');

sessionRepository
  .deleteExpired()
  .then((count) => {
    console.log(`Deleted ${count} expired session(s)`);
  })
  .catch((error) => {
    console.error('Session cleanup failed:', error);
    process.exitCode = 1;
  })
  .finally(() => {
    pool.end();
  });
