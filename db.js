const { Pool } = require('pg');

console.log('*** NEW DB.JS LOADED ***');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ PostgreSQL Connection Failure:', err.message);
    return;
  }

  console.log('✅ PostgreSQL Connected Successfully');
  release();
});

module.exports = pool;