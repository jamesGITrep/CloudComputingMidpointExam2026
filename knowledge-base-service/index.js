const express = require('express');
const { Pool } = require('pg');

const app = express();
const port = 8000;

app.use(express.json());

// Enable CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const pool = new Pool({
  host: process.env.DB_HOST || 'kb-db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'kb_db',
  port: 5432
});

async function initDb() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS articles (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(100) NOT NULL,
        content TEXT NOT NULL,
        author VARCHAR(100) DEFAULT 'IT Support Team',
        createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const res = await pool.query('SELECT COUNT(*) FROM articles');
    if (parseInt(res.rows[0].count, 10) === 0) {
      await pool.query(`
        INSERT INTO articles (title, category, content, author)
        VALUES 
        (
          'Troubleshooting VPN & Remote Access', 
          'Networking', 
          'If your VPN connection drops unexpectedly, ensure you have the latest client installed. Verify that port 443 and UDP 1194 are not blocked by local firewalls. Restart the VPN service and check your DNS settings.', 
          'Network Administrator'
        ),
        (
          'Multi-Factor Authentication (MFA) Setup Guide', 
          'Security', 
          'To configure MFA, download Google Authenticator or Microsoft Authenticator. Navigate to your Account Settings -> Security -> Enable MFA, scan the provided QR code, and verify with your 6-digit code.', 
          'Security Team'
        ),
        (
          'Ticket Priority Levels & Response SLAs', 
          'General', 
          'Urgent: Critical outage affecting multiple users (SLA: 1 hour).\nHigh: Business-critical impairment (SLA: 4 hours).\nMedium: Standard operational issue (SLA: 1 business day).\nLow: General inquiry or non-blocking issue (SLA: 3 business days).', 
          'Support Lead'
        ),
        (
          'Email Configuration on Mobile Devices', 
          'Applications', 
          'For iOS and Android devices, add an Exchange or IMAP account using mail.support.company.com. SSL/TLS must be enabled for incoming port 993 and outgoing SMTP port 587.', 
          'IT Operations'
        )
      `);
    }
  } catch (err) {
    console.error('KB DB initialization error:', err.message);
  }
}

setTimeout(initDb, 3000);

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

// List articles
app.get('/articles', async (req, res) => {
  try {
    await initDb();
    const { category, search } = req.query;
    let query = 'SELECT * FROM articles';
    let conditions = [];
    let params = [];

    if (category && category !== 'All') {
      params.push(category);
      conditions.push(`category = $${params.length}`);
    }

    if (search) {
      params.push(`%${search}%`);
      conditions.push(`(title ILIKE $${params.length} OR content ILIKE $${params.length})`);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY id DESC';
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create article (Admin)
app.post('/articles', async (req, res) => {
  try {
    await initDb();
    const { title, category, content, author } = req.body;
    if (!title || !category || !content) {
      return res.status(400).json({ error: 'Title, category, and content are required' });
    }
    const result = await pool.query(
      'INSERT INTO articles (title, category, content, author) VALUES ($1, $2, $3, $4) RETURNING *',
      [title, category, content, author || 'Admin']
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update article (Admin)
app.put('/articles/:id', async (req, res) => {
  try {
    await initDb();
    const { id } = req.params;
    const { title, category, content, author } = req.body;
    const result = await pool.query(
      'UPDATE articles SET title = COALESCE($1, title), category = COALESCE($2, category), content = COALESCE($3, content), author = COALESCE($4, author), updatedAt = CURRENT_TIMESTAMP WHERE id = $5 RETURNING *',
      [title, category, content, author, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete article (Admin)
app.delete('/articles/:id', async (req, res) => {
  try {
    await initDb();
    const { id } = req.params;
    const result = await pool.query('DELETE FROM articles WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Article not found' });
    }
    res.json({ message: 'Article deleted successfully', id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Knowledge Base Service listening on port ${port}`);
});
