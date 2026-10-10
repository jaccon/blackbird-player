const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// ─── Multer Configuration ───────────────────────────────────────────────────

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';

// Ensure uploads directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = req.body.category || 'general';
    const categoryDir = path.join(UPLOAD_DIR, category);
    if (!fs.existsSync(categoryDir)) {
      fs.mkdirSync(categoryDir, { recursive: true });
    }
    cb(null, categoryDir);
  },
  filename: (req, file, cb) => {
    const uuid = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${uuid}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB default
  },
});

// ─── PUBLIC ROUTES ──────────────────────────────────────────────────────────

/**
 * GET /api/files
 * List all published files. Supports filtering by category and status.
 * Query params: category, status, page, limit, search
 */
router.get('/files', (req, res) => {
  try {
    const {
      category,
      status = 'published',
      page = 1,
      limit = 20,
      search,
    } = req.query;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
    const offset = (pageNum - 1) * limitNum;

    let whereClause = 'WHERE status = ?';
    const params = [status];

    if (category) {
      whereClause += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      whereClause += ' AND title LIKE ?';
      params.push(`%${search}%`);
    }

    // Count total results
    const countStmt = db.prepare(`SELECT COUNT(*) as total FROM files ${whereClause}`);
    const { total } = countStmt.get(...params);

    // Fetch paginated results
    const stmt = db.prepare(`
      SELECT uuid, title, filepath, original_name, mimetype, size, status, category, created_at, updated_at
      FROM files
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `);
    const files = stmt.all(...params, limitNum, offset);

    // Build download URLs
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    const filesWithUrls = files.map((file) => ({
      ...file,
      download_url: `${baseUrl}/api/files/${file.uuid}/download`,
      size_formatted: formatFileSize(file.size),
    }));

    res.json({
      data: filesWithUrls,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        total_pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/files/:uuid
 * Get a single file by UUID
 */
router.get('/files/:uuid', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT uuid, title, filepath, original_name, mimetype, size, status, category, created_at, updated_at
      FROM files WHERE uuid = ?
    `);
    const file = stmt.get(req.params.uuid);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const baseUrl = `${req.protocol}://${req.get('host')}`;
    res.json({
      ...file,
      download_url: `${baseUrl}/api/files/${file.uuid}/download`,
      size_formatted: formatFileSize(file.size),
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/files/:uuid/download
 * Download a file by UUID
 */
router.get('/files/:uuid/download', (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM files WHERE uuid = ?');
    const file = stmt.get(req.params.uuid);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.status !== 'published') {
      return res.status(403).json({ error: 'File is not available for download' });
    }

    const absolutePath = path.resolve(file.filepath);
    if (!fs.existsSync(absolutePath)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(absolutePath, file.original_name);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/files/categories/list
 * List available categories
 */
router.get('/categories', (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT category, COUNT(*) as count 
      FROM files 
      WHERE status = 'published' 
      GROUP BY category 
      ORDER BY category
    `);
    const categories = stmt.all();
    res.json({ data: categories });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── AUTHENTICATED ROUTES ───────────────────────────────────────────────────

/**
 * POST /api/files/publish
 * Upload and publish a file (requires authentication)
 */
router.post('/files/publish', authenticate, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { title, category = 'general', status = 'published' } = req.body;

    if (!title) {
      // Clean up uploaded file if title is missing
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Title is required' });
    }

    const validStatuses = ['draft', 'published', 'archived'];
    if (!validStatuses.includes(status)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const fileUuid = path.basename(req.file.filename, path.extname(req.file.filename));

    const stmt = db.prepare(`
      INSERT INTO files (uuid, title, filepath, original_name, mimetype, size, status, category)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fileUuid,
      title,
      req.file.path,
      req.file.originalname,
      req.file.mimetype,
      req.file.size,
      status,
      category
    );

    const baseUrl = `${req.protocol}://${req.get('host')}`;

    res.status(201).json({
      message: 'File published successfully',
      file: {
        uuid: fileUuid,
        title,
        original_name: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        size_formatted: formatFileSize(req.file.size),
        status,
        category,
        download_url: `${baseUrl}/api/files/${fileUuid}/download`,
      },
    });
  } catch (error) {
    console.error('Error publishing file:', error);
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * PUT /api/files/:uuid
 * Update file metadata (requires authentication)
 */
router.put('/files/:uuid', authenticate, (req, res) => {
  try {
    const { title, status, category } = req.body;
    const { uuid } = req.params;

    const existing = db.prepare('SELECT * FROM files WHERE uuid = ?').get(uuid);
    if (!existing) {
      return res.status(404).json({ error: 'File not found' });
    }

    const validStatuses = ['draft', 'published', 'archived'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const updates = {
      title: title || existing.title,
      status: status || existing.status,
      category: category || existing.category,
    };

    const stmt = db.prepare(`
      UPDATE files 
      SET title = ?, status = ?, category = ?, updated_at = datetime('now')
      WHERE uuid = ?
    `);

    stmt.run(updates.title, updates.status, updates.category, uuid);

    const updated = db.prepare(`
      SELECT uuid, title, filepath, original_name, mimetype, size, status, category, created_at, updated_at
      FROM files WHERE uuid = ?
    `).get(uuid);

    res.json({ message: 'File updated successfully', file: updated });
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * DELETE /api/files/:uuid
 * Delete a file (requires authentication)
 */
router.delete('/files/:uuid', authenticate, (req, res) => {
  try {
    const { uuid } = req.params;

    const file = db.prepare('SELECT * FROM files WHERE uuid = ?').get(uuid);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Remove file from disk
    if (fs.existsSync(file.filepath)) {
      fs.unlinkSync(file.filepath);
    }

    // Remove from database
    db.prepare('DELETE FROM files WHERE uuid = ?').run(uuid);

    res.json({ message: 'File deleted successfully', uuid });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── HELPERS ────────────────────────────────────────────────────────────────

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0;
  let size = bytes;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

module.exports = router;
