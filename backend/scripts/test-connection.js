const pool = require('../src/db/pool');

pool.query('SELECT NOW()')
.then((result) => {
    console.log('Connected! Current time from Neon:', result.rows[0]);
})
.catch((err) => {
    console.error('Connection failed:', err);
})
.finally(()=> {
    pool.end();
});