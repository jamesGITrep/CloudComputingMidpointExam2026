const express = require('express');
const mysql = require('mysql2/promise');

const app = express();
const port = 8000;

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const dbConfig = {
  host: process.env.DB_HOST || 'ticket-db',
  user: process.env.DB_USER || 'ticket_user',
  password: process.env.DB_PASSWORD || 'ticket_pass',
  database: process.env.DB_NAME || 'ticket_db'
};

let pool;
function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      ...dbConfig,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0
    });
  }
  return pool;
}

async function initDb() {
  try {
    const p = getPool();
    await p.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id INT AUTO_INCREMENT PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        priority VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Open',
        userId VARCHAR(100) DEFAULT '',
        userEmail VARCHAR(100) NOT NULL,
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const [rows] = await p.query('SELECT COUNT(*) as count FROM tickets');
    if (rows[0].count === 0) {
      await p.query(`
        INSERT INTO tickets (title, description, priority, status, userId, userEmail)
        VALUES 
        ('VPN connection failing on Windows 11', 'Unable to reach internal services after recent OS update.', 'High', 'Open', '2', 'user@support.com'),
        ('Need access to cloud analytics dashboard', 'Please provision viewer access for Q3 reporting.', 'Medium', 'In Progress', '2', 'user@support.com'),
        ('Email sync issue on mobile client', 'IMAP connection timeout when connecting over 5G.', 'Low', 'Resolved', '2', 'user@support.com')
      `);
    }
  } catch (err) {
    console.error('Database initialization error:', err.message);
  }
}

// Initial connection retry
setTimeout(initDb, 3000);

app.get('/', (req, res) => {
  res.json({ message: 'Ticket Service is running' });
});

app.get('/health', async (req, res) => {
  try {
    const p = getPool();
    const [result] = await p.query('SELECT 1');
    res.json({ status: 'healthy', database: 'connected' });
  } catch (error) {
    res.status(500).json({ status: 'unhealthy', database: 'disconnected', error: error.message });
  }
});

// List tickets
app.get('/tickets', async (req, res) => {
  try {
    await initDb();
    const p = getPool();
    const userEmail = req.query.userEmail;
    let query = 'SELECT * FROM tickets ORDER BY createdAt DESC';
    let params = [];
    if (userEmail) {
      query = 'SELECT * FROM tickets WHERE userEmail = ? ORDER BY createdAt DESC';
      params = [userEmail];
    }
    const [rows] = await p.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create ticket
app.post('/tickets', async (req, res) => {
  try {
    await initDb();
    const { title, description, priority, userId, userEmail } = req.body;
    if (!title || !description || !userEmail) {
      return res.status(400).json({ error: 'Title, description, and userEmail are required' });
    }
    const p = getPool();
    const [result] = await p.query(
      'INSERT INTO tickets (title, description, priority, status, userId, userEmail) VALUES (?, ?, ?, ?, ?, ?)',
      [title, description, priority || 'Medium', 'Open', userId || '', userEmail]
    );
    const [created] = await p.query('SELECT * FROM tickets WHERE id = ?', [result.insertId]);
    res.status(201).json(created[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update ticket status
app.put('/tickets/:id', async (req, res) => {
  try {
    await initDb();
    const { id } = req.params;
    const { status, priority, title, description } = req.body;
    const p = getPool();

    let fields = [];
    let values = [];
    if (status) { fields.push('status = ?'); values.push(status); }
    if (priority) { fields.push('priority = ?'); values.push(priority); }
    if (title) { fields.push('title = ?'); values.push(title); }
    if (description) { fields.push('description = ?'); values.push(description); }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    values.push(id);
    await p.query(`UPDATE tickets SET ${fields.join(', ')} WHERE id = ?`, values);
    const [updated] = await p.query('SELECT * FROM tickets WHERE id = ?', [id]);
    if (updated.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    res.json(updated[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Ticket Service listening on port ${port}`);
});
