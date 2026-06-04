// backend/db.js
const { Pool } = require('pg');

// Create a connection pool using your Render environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for secure Supabase cloud connections
  }
});

// Test the connection securely on startup
pool.connect((err, client, release) => {
  if (err) {
    return console.error('❌ Supabase Connection Error:', err.message);
  }
  console.log('✅ Successfully connected to Supabase PostgreSQL database via Pooler!');
  release();
});

module.exports = pool;
