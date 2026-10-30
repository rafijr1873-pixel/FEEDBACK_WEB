import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { DatabaseSync } from 'node:sqlite';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'noiseadmin123';

// Middleware
app.use(cors());
app.use(express.json());
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));

// Database setup using Node's built-in SQLite
const dbPath = path.join(__dirname, 'feedback.db');
const db = new DatabaseSync(dbPath);

// Create table if not exists
db.exec(`
  CREATE TABLE IF NOT EXISTS feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ensure feedback.db is gitignored? not needed.

// In-memory token store (with expiry)
const validTokens = new Map(); // token -> expiry timestamp

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function isAuthenticated(req) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromHeader || req.cookies?.admin_token;
  if (!token) return false;
  const expiry = validTokens.get(token);
  if (!expiry) return false;
  if (Date.now() > expiry) {
    validTokens.delete(token);
    return false;
  }
  return true;
}

function authMiddleware(req, res, next) {
  if (isAuthenticated(req)) {
    next();
  } else {
    res.status(401).json({ success: false, message: 'Unauthorized' });
  }
}

// API Routes

// Submit feedback (public)
app.post('/api/feedback', (req, res) => {
  const { message } = req.body;
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return res.status(400).json({ success: false, message: 'Pesan tidak boleh kosong' });
  }
  if (message.trim().length > 2000) {
    return res.status(400).json({ success: false, message: 'Pesan terlalu panjang (max 2000 karakter)' });
  }

  try {
    const stmt = db.prepare('INSERT INTO feedback (message) VALUES (?)');
    stmt.run(message.trim());
    res.json({ success: true, message: 'Pesan berhasil dikirim! Terima kasih atas masukannya.' });
  } catch (err) {
    console.error('Insert error:', err);
    res.status(500).json({ success: false, message: 'Gagal menyimpan pesan' });
  }
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) {
    const token = generateToken();
    const expiry = Date.now() + 24 * 60 * 60 * 1000; // 24h
    validTokens.set(token, expiry);

    // Set httpOnly cookie for convenience
    res.cookie('admin_token', token, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: 'lax'
    });

    res.json({ success: true, token, message: 'Login berhasil' });
  } else {
    res.status(401).json({ success: false, message: 'Password salah' });
  }
});

app.post('/api/admin/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const token = tokenFromHeader || req.cookies?.admin_token;
  if (token) validTokens.delete(token);
  res.clearCookie('admin_token');
  res.json({ success: true, message: 'Logout berhasil' });
});

app.get('/api/admin/check', (req, res) => {
  if (isAuthenticated(req)) {
    res.json({ success: true, authenticated: true });
  } else {
    res.json({ success: true, authenticated: false });
  }
});

// Get all feedback (admin only) - newest first
app.get('/api/messages', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, message, created_at FROM feedback ORDER BY id DESC');
    const rows = stmt.all();
    res.json({ success: true, data: rows });
  } catch (err) {
    console.error('Fetch error:', err);
    res.status(500).json({ success: false, message: 'Gagal mengambil pesan' });
  }
});

// Delete message (admin only)
app.delete('/api/messages/:id', authMiddleware, (req, res) => {
  const { id } = req.params;
  try {
    const stmt = db.prepare('DELETE FROM feedback WHERE id = ?');
    const result = stmt.run(id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: 'Pesan tidak ditemukan' });
    }
    res.json({ success: true, message: 'Pesan dihapus' });
  } catch (err) {
    console.error('Delete error:', err);
    res.status(500).json({ success: false, message: 'Gagal menghapus pesan' });
  }
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Admin page route
app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

// Fallback for SPA (optional)
app.get('*', (req, res) => {
  // If API route not matched, serve index.html
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ Noise SMP Feedback running at http://localhost:${PORT}`);
  console.log(`   Admin password: ${ADMIN_PASSWORD}`);
  console.log(`   Database: ${dbPath}`);
});
