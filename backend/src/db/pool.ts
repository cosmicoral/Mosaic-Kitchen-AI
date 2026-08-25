import 'dotenv/config';
import pg from 'pg';

const { Pool, types } = pg;

// Postgres DATE (type OID 1082) carries no time and no timezone, but
// node-postgres parses it into a JS Date at *local* midnight. In London that
// turns 2026-09-05 into 2026-09-04T23:00:00Z, and every client reading it as
// UTC shows the wrong day. Handing back the raw 'YYYY-MM-DD' string removes
// the conversion, and the ambiguity, entirely.
types.setTypeParser(1082, (value) => value);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: true,
});

export default pool;