const { Pool } = require('pg');

// Create a connection pool using your Render environment variable
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false // Required for secure Supabase connections
  }
});

// Test the connection
pool.connect((err, client, release) => {
  if (err) {
    return console.error('Error acquiring client', err.stack);
  }
  console.log('Successfully connected to Supabase PostgreSQL database!');
  release();
});

module.exports = pool;
