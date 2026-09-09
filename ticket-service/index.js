const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = 8000;

app.use(express.json());

const dbConfig = {
  host: process.env.DB_HOST || 'ticket-db',
  user: process.env.DB_USER || 'ticket_user',
  password: process.env.DB_PASSWORD || 'ticket_pass',
  database: process.env.DB_NAME || 'ticket_db'
};

app.get('/', (req, res) => {
  res.json({ message: 'Ticket Service is running' });
});

app.get('/health', async (req, res) => {
  try {
    const connection = await mysql.createConnection(dbConfig);
    await connection.end();
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

app.listen(port, () => {
  console.log(`Ticket Service listening on port ${port}`);
});
