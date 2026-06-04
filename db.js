// backend/db.js
const { Pool } = require('pg');

// Hardcoded connection configurations to completely bypass URL string parsing bugs
const pool = new Pool({
  user: 'postgres.qurwgavfmjpmfiduzhly',
  host: '://supabase.com',
  database: 'postgres',
  password: 'Syedafouqiya10',
  port: 6543,
  ssl: {
    rejectUnauthorized: false // Required for secure Supabase cloud connections
  }
});

// Test the connection securely on startup
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Supabase Connection Failure:', err.message);
  }
  console.log('✅ Connected to Supabase PostgreSQL database successfully via hardcoded pool configs!');
  release();
});

module.exports = pool;
