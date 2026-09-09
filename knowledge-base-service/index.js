const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 8000;

app.use(express.json());

const pool = new Pool({
  host: process.env.DB_HOST || 'kb-db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'kb_db',
  port: 5432
});

app.get('/', (req, res) => {
  res.json({ message: 'Knowledge Base Service is running' });
});

app.get('/health', async (req, res) => {
  try {
    const client = await pool.connect();
    client.release();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Knowledge Base Service listening on port ${port}`);
});
