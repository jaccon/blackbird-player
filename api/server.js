require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');
const { initialize } = require('./src/database/db');
const fileRoutes = require('./src/routes/files');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ──────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files statically (only published ones are accessible via download route)
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Routes ─────────────────────────────────────────────────────────────────

app.use('/api', fileRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'BlackBird File API',
    timestamp: new Date().toISOString(),
  });
});

// API info
app.get('/', (req, res) => {
  res.json({
    name: 'BlackBird File API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/files': 'List published files (query: category, status, page, limit, search)',
      'GET /api/files/:uuid': 'Get file details by UUID',
      'GET /api/files/:uuid/download': 'Download a file by UUID',
      'GET /api/categories': 'List file categories',
      'POST /api/files/publish': 'Upload and publish a file (authenticated)',
      'PUT /api/files/:uuid': 'Update file metadata (authenticated)',
      'DELETE /api/files/:uuid': 'Delete a file (authenticated)',
    },
    authentication: {
      method: 'Client Credentials',
      headers: ['x-client-id', 'x-client-secret'],
      note: 'Credentials can also be sent via body or query params (client_id, client_secret)',
    },
  });
});

// ─── 404 Handler ────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ─── Error Handler ──────────────────────────────────────────────────────────

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'File too large',
      message: `Maximum file size is ${process.env.MAX_FILE_SIZE || 50 * 1024 * 1024} bytes`,
    });
  }

  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start Server ───────────────────────────────────────────────────────────

initialize();

app.listen(PORT, () => {
  console.log(`\n🐦‍⬛ BlackBird File API running on http://localhost:${PORT}`);
  console.log(`📁 Uploads directory: ${path.resolve(process.env.UPLOAD_DIR || './uploads')}`);
  console.log(`🗄️  Database: ${path.resolve(process.env.DB_PATH || './data/blackbird.db')}\n`);
});
