import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';

const requireNative = createRequire(import.meta.url);
const Database = requireNative('better-sqlite3');

const baseConfigDir = path.join(app.getPath('home'), 'BlackBird');
if (!fs.existsSync(baseConfigDir)) {
  fs.mkdirSync(baseConfigDir, { recursive: true });
}

const dbPath = path.join(baseConfigDir, 'blackbird.db');
const db = new Database(dbPath);

const coversDir = path.join(baseConfigDir, 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
}

export const pluginsDir = path.join(baseConfigDir, 'plugins');
if (!fs.existsSync(pluginsDir)) {
  fs.mkdirSync(pluginsDir, { recursive: true });
}

function saveCoverToFile(uuid: string, coverData: string | null | undefined): string | null {
  if (!coverData) return null;
  if (!coverData.startsWith('data:')) return coverData; // Already a path or URL

  try {
    const matches = coverData.match(/^data:image\/([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return coverData;

    const extension = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${uuid}.${extension}`;
    const filePath = path.join(coversDir, fileName);

    fs.writeFileSync(filePath, buffer);
    return filePath;
  } catch (e) {
    console.error('Failed to save cover to file:', e);
    return coverData;
  }
}

function formatCoverUrl(coverPath: string | null | undefined): string | null {
  if (!coverPath) return null;
  if (coverPath.startsWith('data:') || coverPath.startsWith('http')) {
    return coverPath;
  }
  
  let actualPath = coverPath;
  if (coverPath.startsWith('file://')) {
    actualPath = coverPath.substring(7);
  }
  
  try {
    if (!fs.existsSync(actualPath)) return null;
  } catch (e) {
    return null;
  }
  
  return `file://${actualPath}`;
}

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    artist TEXT,
    album TEXT,
    file_path TEXT UNIQUE,
    format TEXT,
    mimetype TEXT,
    kind TEXT,
    cover TEXT,
    duration REAL,
    is_favorite INTEGER DEFAULT 0,
    is_hidden INTEGER DEFAULT 0,
    hidden_folder_id TEXT DEFAULT NULL,
    description TEXT,
    lyrics TEXT
  );

  CREATE TABLE IF NOT EXISTS playlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS playlist_tracks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    playlist_id TEXT,
    track_uuid TEXT,
    FOREIGN KEY(playlist_id) REFERENCES playlists(id),
    FOREIGN KEY(track_uuid) REFERENCES tracks(uuid)
  );

  CREATE TABLE IF NOT EXISTS play_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    track_uuid TEXT,
    duration_played REAL,
    played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(track_uuid) REFERENCES tracks(uuid) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS user_radios (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    url TEXT NOT NULL,
    share INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS hidden_folders (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// Support migration for existing DBs
try {
  const tableInfo = db.prepare("PRAGMA table_info(tracks)").all() as any[];
  const hasFavorite = tableInfo.some(col => col.name === 'is_favorite');
  const hasDuration = tableInfo.some(col => col.name === 'duration');
  const hasHidden = tableInfo.some(col => col.name === 'is_hidden');
  const hasHiddenFolder = tableInfo.some(col => col.name === 'hidden_folder_id');
  const hasMimetype = tableInfo.some(col => col.name === 'mimetype');
  const hasKind = tableInfo.some(col => col.name === 'kind');
  
  if (!hasDuration) {
    db.exec('ALTER TABLE tracks ADD COLUMN duration REAL');
    console.log('Migrated DB: added duration column');
  }
  
  if (!hasFavorite) {
    db.exec('ALTER TABLE tracks ADD COLUMN is_favorite INTEGER DEFAULT 0');
    console.log('Migrated DB: added is_favorite column');
  }

  if (!hasHidden) {
    db.exec('ALTER TABLE tracks ADD COLUMN is_hidden INTEGER DEFAULT 0');
    console.log('Migrated DB: added is_hidden column');
  }

  if (!hasHiddenFolder) {
    db.exec('ALTER TABLE tracks ADD COLUMN hidden_folder_id TEXT DEFAULT NULL');
    console.log('Migrated DB: added hidden_folder_id column');
  }

  if (!hasMimetype) {
    db.exec('ALTER TABLE tracks ADD COLUMN mimetype TEXT');
    console.log('Migrated DB: added mimetype column');
  }

  if (!hasKind) {
    db.exec('ALTER TABLE tracks ADD COLUMN kind TEXT');
    console.log('Migrated DB: added kind column');
  }

  const hasDescription = tableInfo.some(col => col.name === 'description');
  if (!hasDescription) {
    db.exec('ALTER TABLE tracks ADD COLUMN description TEXT');
    console.log('Migrated DB: added description column');
  }

  const hasLyrics = tableInfo.some(col => col.name === 'lyrics');
  if (!hasLyrics) {
    db.exec('ALTER TABLE tracks ADD COLUMN lyrics TEXT');
    console.log('Migrated DB: added lyrics column');
  }

  // Backfill mimetype and kind for existing tracks
  db.exec(`
    UPDATE tracks SET mimetype = 'audio/' || LOWER(format) WHERE (mimetype IS NULL OR mimetype = '') AND LOWER(format) IN ('mp3', 'm4a', 'flac', 'aac', 'wav', 'ogg', 'opus', 'wma');
    UPDATE tracks SET mimetype = 'video/mp4' WHERE (mimetype IS NULL OR mimetype = '') AND LOWER(format) = 'mp4';
    UPDATE tracks SET mimetype = 'video/webm' WHERE (mimetype IS NULL OR mimetype = '') AND LOWER(format) = 'webm';
    UPDATE tracks SET mimetype = 'video/youtube' WHERE (mimetype IS NULL OR mimetype = '') AND LOWER(format) = 'youtube';
    UPDATE tracks SET mimetype = 'image/' || LOWER(format) WHERE (mimetype IS NULL OR mimetype = '') AND LOWER(format) IN ('jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp');
    UPDATE tracks SET kind = format WHERE (kind IS NULL OR kind = '') AND format IS NOT NULL;
  `);
} catch (e) {
  console.error('Migration error:', e);
}

// Double check migration (guaranteed)
try {
  db.prepare('SELECT mimetype FROM tracks LIMIT 0').all();
} catch (e) {
  db.exec('ALTER TABLE tracks ADD COLUMN mimetype TEXT');
}

try {
  db.prepare('SELECT kind FROM tracks LIMIT 0').all();
} catch (e) {
  db.exec('ALTER TABLE tracks ADD COLUMN kind TEXT');
}

try {
  db.prepare('SELECT is_favorite FROM tracks LIMIT 0').all();
} catch (e) {
  db.exec('ALTER TABLE tracks ADD COLUMN is_favorite INTEGER DEFAULT 0');
}

try {
  db.prepare('SELECT is_hidden FROM tracks LIMIT 0').all();
} catch (e) {
  db.exec('ALTER TABLE tracks ADD COLUMN is_hidden INTEGER DEFAULT 0');
}

try {
  db.prepare('SELECT hidden_folder_id FROM tracks LIMIT 0').all();
} catch (e) {
  db.exec('ALTER TABLE tracks ADD COLUMN hidden_folder_id TEXT DEFAULT NULL');
}

try {
  db.prepare('SELECT id FROM play_history LIMIT 0').all();
} catch (e) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS play_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      track_uuid TEXT,
      duration_played REAL,
      played_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(track_uuid) REFERENCES tracks(uuid) ON DELETE CASCADE
    );
  `);
}

try {
  db.prepare('SELECT id FROM plugins LIMIT 0').all();
} catch (e) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      version TEXT,
      description TEXT,
      author TEXT,
      icon TEXT,
      main TEXT,
      styles TEXT,
      enabled INTEGER DEFAULT 1,
      folder_path TEXT NOT NULL,
      installed_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export interface DBPlugin {
  id: string;
  name: string;
  version?: string;
  description?: string;
  author?: string;
  icon?: string;
  main?: string;
  styles?: string;
  enabled: number;
  folder_path: string;
  installed_at?: string;
}

export interface DBTrack {
  uuid: string;
  title: string;
  artist: string;
  album: string;
  file_path: string;
  format: string;
  mimetype?: string;
  kind?: string;
  cover?: string;
  duration?: number;
  is_favorite?: number;
  is_hidden?: number;
  hidden_folder_id?: string | null;
  description?: string;
  lyrics?: string;
}

export interface HiddenFolder {
  id: string;
  name: string;
  created_at?: string;
  trackCount?: number;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount?: number;
  totalDuration?: number;
}

export const dbOps = {
  // Tracks
  upsertTrack: (track: DBTrack) => {
    if (track.cover && track.cover.startsWith('data:')) {
      track.cover = saveCoverToFile(track.uuid, track.cover) || undefined;
    }

    const is_hidden = track.is_hidden !== undefined ? track.is_hidden : 0;
    const hidden_folder_id = track.hidden_folder_id !== undefined ? track.hidden_folder_id : null;
    const mimetype = track.mimetype || null;
    const kind = track.kind || track.format || null;

    const stmt = db.prepare(`
      INSERT INTO tracks (uuid, title, artist, album, file_path, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id, description, lyrics)
      VALUES (@uuid, @title, @artist, @album, @file_path, @format, @mimetype, @kind, @cover, @duration, @is_favorite, @is_hidden, @hidden_folder_id, @description, @lyrics)
      ON CONFLICT(file_path) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        album=excluded.album,
        format=excluded.format,
        mimetype=COALESCE(excluded.mimetype, tracks.mimetype),
        kind=COALESCE(tracks.kind, excluded.kind),
        cover=COALESCE(excluded.cover, tracks.cover),
        duration=excluded.duration,
        description=excluded.description,
        lyrics=excluded.lyrics
    `);
    return stmt.run({ ...track, is_hidden, hidden_folder_id, mimetype, kind });
  },

  upsertTracksBatch: (tracks: DBTrack[]) => {
    if (!tracks || tracks.length === 0) return;

    const stmt = db.prepare(`
      INSERT INTO tracks (uuid, title, artist, album, file_path, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id, description, lyrics)
      VALUES (@uuid, @title, @artist, @album, @file_path, @format, @mimetype, @kind, @cover, @duration, @is_favorite, @is_hidden, @hidden_folder_id, @description, @lyrics)
      ON CONFLICT(file_path) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        album=excluded.album,
        format=excluded.format,
        mimetype=COALESCE(excluded.mimetype, tracks.mimetype),
        kind=COALESCE(tracks.kind, excluded.kind),
        cover=COALESCE(excluded.cover, tracks.cover),
        duration=excluded.duration,
        description=excluded.description,
        lyrics=excluded.lyrics
    `);

    const insertMany = db.transaction((items: DBTrack[]) => {
      for (const track of items) {
        if (track.cover && track.cover.startsWith('data:')) {
          track.cover = saveCoverToFile(track.uuid, track.cover) || undefined;
        }
        const is_hidden = track.is_hidden !== undefined ? track.is_hidden : 0;
        const hidden_folder_id = track.hidden_folder_id !== undefined ? track.hidden_folder_id : null;
        const mimetype = track.mimetype || null;
        const kind = track.kind || track.format || null;
        stmt.run({ ...track, is_hidden, hidden_folder_id, mimetype, kind });
      }
    });

    insertMany(tracks);
  },

  getTrackByPath: (filePath: string) => {
    const track = db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id as hiddenFolderId, description, lyrics FROM tracks WHERE file_path = ?').get(filePath) as any;
    if (track && track.cover) {
      track.cover = formatCoverUrl(track.cover);
    }
    return track;
  },

  // Statistics
  recordPlay: (trackUuid: string) => {
    const track = db.prepare('SELECT duration FROM tracks WHERE uuid = ?').get(trackUuid) as DBTrack;
    const duration = track ? (track.duration || 0) : 0;
    return db.prepare('INSERT INTO play_history (track_uuid, duration_played) VALUES (?, ?)').run(trackUuid, duration);
  },

  getStatistics: () => {
    const topTracks = db.prepare(`
      SELECT t.uuid, t.title, t.artist, t.album, t.file_path as filePath, t.cover, t.format, t.mimetype, t.kind, t.duration, t.is_favorite, t.is_hidden, t.description, t.lyrics, COUNT(p.id) as playCount 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid 
      WHERE (t.is_hidden = 0 OR t.is_hidden IS NULL)
      GROUP BY p.track_uuid 
      ORDER BY playCount DESC 
      LIMIT 10
    `).all() as any[];

    topTracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });

    const topFormatRow = db.prepare(`
      SELECT COALESCE(t.kind, t.format) as format, COUNT(p.id) as playCount 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid 
      WHERE (t.is_hidden = 0 OR t.is_hidden IS NULL) AND t.format IS NOT NULL AND t.format != ''
      GROUP BY COALESCE(t.kind, t.format) 
      ORDER BY playCount DESC 
      LIMIT 1
    `).get() as any;

    const favoriteTypes = db.prepare(`
      SELECT COALESCE(kind, format) as format, COUNT(*) as count 
      FROM tracks 
      WHERE is_favorite = 1 AND (is_hidden = 0 OR is_hidden IS NULL) AND format IS NOT NULL AND format != ''
      GROUP BY COALESCE(kind, format) 
      ORDER BY count DESC
    `).all() as any[];

    const hoursRow = db.prepare(`
      SELECT SUM(p.duration_played) as totalSeconds 
      FROM play_history p
      JOIN tracks t ON p.track_uuid = t.uuid
      WHERE (t.is_hidden = 0 OR t.is_hidden IS NULL) AND p.played_at >= datetime('now', '-1 month')
    `).get() as any;

    const totalTracksRow = db.prepare(`SELECT COUNT(*) as count FROM tracks WHERE is_hidden = 0 OR is_hidden IS NULL`).get() as any;
    const totalAlbumsRow = db.prepare(`SELECT COUNT(DISTINCT album) as count FROM tracks WHERE (is_hidden = 0 OR is_hidden IS NULL) AND album IS NOT NULL AND album != '' AND album != 'Unknown Album'`).get() as any;

    const activeHours = db.prepare(`
      SELECT strftime('%H', datetime(p.played_at, 'localtime')) as hour, COUNT(*) as count 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid
      WHERE t.is_hidden = 0 OR t.is_hidden IS NULL
      GROUP BY hour 
      ORDER BY count DESC 
      LIMIT 3
    `).all() as any[];

    const allTracks = db.prepare('SELECT file_path FROM tracks WHERE is_hidden = 0 OR is_hidden IS NULL').all() as any[];
    let totalBytes = 0;
    for (const t of allTracks) {
      try {
        if (fs.existsSync(t.file_path)) {
          totalBytes += fs.statSync(t.file_path).size;
        }
      } catch (e) {
        // Skip files that might have been moved or deleted
      }
    }

    return {
      topTracks: topTracks,
      topFormat: topFormatRow?.format || 'None',
      favoriteTypes: favoriteTypes,
      hoursListenedLastMonth: hoursRow && hoursRow.totalSeconds ? (hoursRow.totalSeconds / 3600) : 0,
      totalTracks: totalTracksRow?.count || 0,
      totalAlbums: totalAlbumsRow?.count || 0,
      totalSize: totalBytes,
      activeHours: activeHours
    };
  },

  getPlayHistory: () => {
    const history = db.prepare(`
      SELECT p.id, t.uuid, t.title, t.artist, t.album, t.file_path as filePath, t.format, t.mimetype, t.kind, t.cover, t.duration, t.is_favorite, t.is_hidden, t.description, p.played_at 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid 
      WHERE (t.is_hidden = 0 OR t.is_hidden IS NULL)
      ORDER BY p.id DESC 
      LIMIT 100
    `).all() as any[];

    history.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });

    return history;
  },

  // Playlists
  createPlaylist: (name: string) => {
    const id = uuidv4();
    db.prepare('INSERT INTO playlists (id, name) VALUES (?, ?)').run(id, name);
    return id;
  },

  getAllPlaylists: () => {
    return db.prepare(`
      SELECT p.*, 
             (SELECT COUNT(*) FROM playlist_tracks pt JOIN tracks t ON pt.track_uuid = t.uuid WHERE pt.playlist_id = p.id AND (t.is_hidden = 0 OR t.is_hidden IS NULL)) as trackCount,
             (SELECT SUM(t.duration) FROM tracks t JOIN playlist_tracks pt ON t.uuid = pt.track_uuid WHERE pt.playlist_id = p.id AND (t.is_hidden = 0 OR t.is_hidden IS NULL)) as totalDuration
      FROM playlists p 
      ORDER BY p.created_at DESC
    `).all() as Playlist[];
  },

  addTrackToPlaylist: (playlistId: string, trackUuid: string) => {
    const exists = db.prepare(`
      SELECT 1 FROM playlist_tracks
      WHERE playlist_id = ? AND track_uuid = ?
    `).get(playlistId, trackUuid);
    
    if (exists) return { error: 'This media is already in the playlist' };

    return db.prepare('INSERT INTO playlist_tracks (playlist_id, track_uuid) VALUES (?, ?)').run(playlistId, trackUuid);
  },

  removeTrackFromPlaylist: (playlistId: string, trackUuid: string) => {
    return db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_uuid = ?').run(playlistId, trackUuid);
  },

  updateTrack: (uuid: string, data: Partial<any>) => {
    if (!uuid || !data || Object.keys(data).length === 0) return;
    if (data.cover && data.cover.startsWith('data:')) {
      data.cover = saveCoverToFile(uuid, data.cover) || undefined;
    }
    const cleanData: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (key === 'hiddenFolderId') {
        cleanData['hidden_folder_id'] = value;
      } else if (key === 'filePath') {
        cleanData['file_path'] = value;
      } else if (['title', 'artist', 'album', 'format', 'mimetype', 'kind', 'cover', 'duration', 'is_favorite', 'is_hidden', 'hidden_folder_id', 'description', 'lyrics'].includes(key)) {
        cleanData[key] = value;
      }
    }
    const fields = Object.keys(cleanData).map(key => `${key} = ?`).join(', ');
    if (!fields) return;
    const values = Object.values(cleanData);
    return db.prepare(`UPDATE tracks SET ${fields} WHERE uuid = ?`).run(...values, uuid);
  },

  getPlaylistTracks: (playlistId: string) => {
    const tracks = db.prepare(`
      SELECT t.uuid, t.title, t.artist, t.album, t.file_path as filePath, t.format, t.mimetype, t.kind, t.cover, t.duration, t.is_favorite, t.is_hidden, t.hidden_folder_id as hiddenFolderId, t.description, t.lyrics
      FROM tracks t
      JOIN playlist_tracks pt ON t.uuid = pt.track_uuid
      WHERE pt.playlist_id = ? AND (t.is_hidden = 0 OR t.is_hidden IS NULL)
    `).all(playlistId) as any[];
    
    tracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });
    return tracks;
  },

  deletePlaylist: (id: string) => {
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(id);
    return db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  },

  getAllTracks: (includeHidden = false) => {
    const query = includeHidden
      ? 'SELECT uuid, title, artist, album, file_path as filePath, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id as hiddenFolderId, description, lyrics FROM tracks'
      : 'SELECT uuid, title, artist, album, file_path as filePath, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id as hiddenFolderId, description, lyrics FROM tracks WHERE is_hidden = 0 OR is_hidden IS NULL';
    const tracks = db.prepare(query).all() as any[];
    tracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });
    return tracks;
  },

  getFavoriteTracks: () => {
    const tracks = db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id as hiddenFolderId, description, lyrics FROM tracks WHERE is_favorite = 1 AND (is_hidden = 0 OR is_hidden IS NULL)').all() as any[];
    tracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });
    return tracks;
  },

  toggleFavorite: (trackUuid: string) => {
    return db.prepare('UPDATE tracks SET is_favorite = CASE WHEN is_favorite = 1 THEN 0 ELSE 1 END WHERE uuid = ?').run(trackUuid);
  },

  // Hidden Files & Folders
  getHiddenTracks: (folderId?: string | null) => {
    let query = 'SELECT uuid, title, artist, album, file_path as filePath, format, mimetype, kind, cover, duration, is_favorite, is_hidden, hidden_folder_id as hiddenFolderId, description, lyrics FROM tracks WHERE is_hidden = 1';
    const params: any[] = [];
    if (folderId === 'all') {
      // All hidden tracks regardless of folder
    } else if (folderId && folderId !== 'null' && folderId !== '') {
      query += ' AND hidden_folder_id = ?';
      params.push(folderId);
    } else {
      // Unfiled tracks: either hidden_folder_id is null/empty or references a deleted folder
      query += ' AND (hidden_folder_id IS NULL OR hidden_folder_id = "" OR hidden_folder_id = "null" OR hidden_folder_id NOT IN (SELECT id FROM hidden_folders))';
    }
    query += ' ORDER BY title ASC';
    const tracks = db.prepare(query).all(...params) as any[];
    tracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });
    return tracks;
  },

  getHiddenFolders: () => {
    return db.prepare(`
      SELECT f.*, 
             (SELECT COUNT(*) FROM tracks WHERE is_hidden = 1 AND hidden_folder_id = f.id) as trackCount
      FROM hidden_folders f
      ORDER BY f.name ASC
    `).all() as HiddenFolder[];
  },

  createHiddenFolder: (name: string) => {
    const id = uuidv4();
    db.prepare('INSERT INTO hidden_folders (id, name) VALUES (?, ?)').run(id, name);
    return { id, name };
  },

  renameHiddenFolder: (id: string, name: string) => {
    return db.prepare('UPDATE hidden_folders SET name = ? WHERE id = ?').run(name, id);
  },

  deleteHiddenFolder: (id: string) => {
    db.prepare('UPDATE tracks SET hidden_folder_id = NULL WHERE hidden_folder_id = ?').run(id);
    return db.prepare('DELETE FROM hidden_folders WHERE id = ?').run(id);
  },

  moveHiddenTrackToFolder: (trackUuid: string, folderId: string | null) => {
    const cleanFolderId = (folderId && folderId !== 'null' && folderId !== '') ? folderId : null;
    return db.prepare('UPDATE tracks SET hidden_folder_id = ? WHERE uuid = ?').run(cleanFolderId, trackUuid);
  },

  hideTracks: (uuids: string[], folderId: string | null = null) => {
    if (!uuids || uuids.length === 0) return { changes: 0 };
    const cleanFolderId = (folderId && folderId !== 'null' && folderId !== '') ? folderId : null;
    const placeholders = uuids.map(() => '?').join(',');
    return db.prepare(`UPDATE tracks SET is_hidden = 1, hidden_folder_id = ? WHERE uuid IN (${placeholders})`).run(cleanFolderId, ...uuids);
  },

  unhideTracks: (uuids: string[]) => {
    if (!uuids || uuids.length === 0) return { changes: 0 };
    const placeholders = uuids.map(() => '?').join(',');
    return db.prepare(`UPDATE tracks SET is_hidden = 0, hidden_folder_id = NULL WHERE uuid IN (${placeholders})`).run(...uuids);
  },

  getSetting: (key: string) => {
    const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as any;
    return row ? row.value : null;
  },

  setSetting: (key: string, value: string) => {
    return db.prepare(`
      INSERT INTO app_settings (key, value) VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, value);
  },

  getThemes: () => {
    const builtinThemeDir = path.join(app.getAppPath(), 'resources', 'themes');
    const unpackedThemeDir = app.isPackaged ? path.join(process.resourcesPath, 'app.asar.unpacked', 'resources', 'themes') : builtinThemeDir;
    const userThemeDir = path.join(app.getPath('home'), 'BlackBird', 'themes');
    const themes = new Map();

    const loadFromDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          try {
            const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf-8'));
            const themeId = data.id || data.name || f;
            if (themeId) themes.set(themeId, data);
          } catch (e) {
            console.error('Failed to load theme', f, e);
          }
        });
    };

    loadFromDir(builtinThemeDir);
    if (app.isPackaged) loadFromDir(unpackedThemeDir);
    loadFromDir(userThemeDir);
    
    return Array.from(themes.values());
  },

  getTrackPath: (uuid: string) => {
    const track = db.prepare('SELECT file_path as filePath FROM tracks WHERE uuid = ?').get(uuid) as any;
    return track ? track.filePath : null;
  },

  getTrackCoverPath: (uuid: string) => {
    const track = db.prepare('SELECT cover FROM tracks WHERE uuid = ?').get(uuid) as any;
    if (track && track.cover && !track.cover.startsWith('http') && !track.cover.startsWith('data:')) {
      return path.join(baseConfigDir, 'covers', path.basename(track.cover));
    }
    return null;
  },

  deleteTracks: (uuids: string[]) => {
    const placeholders = uuids.map(() => '?').join(',');
    
    // Get cover paths before deleting
    const tracksWithCovers = db.prepare(`SELECT cover FROM tracks WHERE uuid IN (${placeholders}) AND cover NOT LIKE 'data:%' AND cover IS NOT NULL`).all(...uuids) as any[];
    
    db.prepare(`DELETE FROM playlist_tracks WHERE track_uuid IN (${placeholders})`).run(...uuids);
    const result = db.prepare(`DELETE FROM tracks WHERE uuid IN (${placeholders})`).run(...uuids);
    
    // Delete cover files
    for (const t of tracksWithCovers) {
      if (t.cover && !t.cover.startsWith('data:') && !t.cover.startsWith('http')) {
        try {
          const filePath = t.cover.startsWith('file://') ? t.cover.slice(7) : t.cover;
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error('Failed to delete cover file:', e);
        }
      }
    }
    
    return result;
  },

  getAllRaw: () => {
    return {
      tracks: db.prepare('SELECT * FROM tracks').all(),
      playlists: db.prepare('SELECT * FROM playlists').all(),
      playlist_tracks: db.prepare('SELECT * FROM playlist_tracks').all(),
      hidden_folders: db.prepare('SELECT * FROM hidden_folders').all(),
      app_settings: db.prepare('SELECT * FROM app_settings').all()
    };
  },

  importRaw: (data: any) => {
    const transaction = db.transaction((importData) => {
      // Clear existing
      db.prepare('DELETE FROM playlist_tracks').run();
      db.prepare('DELETE FROM playlists').run();
      db.prepare('DELETE FROM tracks').run();
      db.prepare('DELETE FROM hidden_folders').run();
      db.prepare('DELETE FROM app_settings').run();

      // Insert tracks
      if (importData.tracks && importData.tracks.length) {
        const trackStmt = db.prepare(`INSERT INTO tracks (uuid, title, artist, album, file_path, format, cover, duration, is_favorite, is_hidden, hidden_folder_id, description, lyrics) VALUES (@uuid, @title, @artist, @album, @file_path, @format, @cover, @duration, @is_favorite, @is_hidden, @hidden_folder_id, @description, @lyrics)`);
        for (const t of importData.tracks) trackStmt.run(t);
      }

      // Insert playlists
      if (importData.playlists && importData.playlists.length) {
        const plStmt = db.prepare(`INSERT INTO playlists (id, name, created_at) VALUES (@id, @name, @created_at)`);
        for (const p of importData.playlists) plStmt.run(p);
      }

      // Insert playlist_tracks
      if (importData.playlist_tracks && importData.playlist_tracks.length) {
        const ptStmt = db.prepare(`INSERT INTO playlist_tracks (id, playlist_id, track_uuid) VALUES (@id, @playlist_id, @track_uuid)`);
        for (const pt of importData.playlist_tracks) ptStmt.run(pt);
      }

      // Insert hidden_folders
      if (importData.hidden_folders && importData.hidden_folders.length) {
        const fStmt = db.prepare(`INSERT INTO hidden_folders (id, name, created_at) VALUES (@id, @name, @created_at)`);
        for (const f of importData.hidden_folders) fStmt.run(f);
      }

      // Insert app_settings
      if (importData.app_settings && importData.app_settings.length) {
        const sStmt = db.prepare(`INSERT INTO app_settings (key, value) VALUES (@key, @value)`);
        for (const s of importData.app_settings) sStmt.run(s);
      }
    });

    try {
      transaction(data);
      return { success: true };
    } catch (e: any) {
      console.error('Import failed', e);
      return { success: false, error: e.message };
    }
  },

  migrateCoversToFile: () => {
    const tracks = db.prepare("SELECT uuid, cover FROM tracks WHERE cover LIKE 'data:%'").all() as any[];
    console.log(`Starting migration of ${tracks.length} covers to files...`);
    
    let migrated = 0;
    const updateStmt = db.prepare("UPDATE tracks SET cover = ? WHERE uuid = ?");
    
    db.transaction(() => {
      for (const t of tracks) {
        try {
          const filePath = saveCoverToFile(t.uuid, t.cover);
          if (filePath && filePath !== t.cover) {
            updateStmt.run(filePath, t.uuid);
            migrated++;
          }
        } catch (e) {
          console.error(`Failed to migrate cover for ${t.uuid}:`, e);
        }
      }
    })();
    
    console.log(`Migration completed. ${migrated} covers moved to files.`);
    if (migrated > 0) {
      console.log('Vacuuming database to reclaim space...');
      db.exec('VACUUM');
    }
    return migrated;
  },
  
  // User Radios
  saveUserRadio: (radio: { id: string, name: string, url: string, share: number }) => {
    return db.prepare('INSERT INTO user_radios (id, name, url, share) VALUES (?, ?, ?, ?)').run(radio.id, radio.name, radio.url, radio.share);
  },

  getUserRadios: () => {
    return db.prepare('SELECT * FROM user_radios ORDER BY created_at DESC').all() as any[];
  },

  deleteUserRadio: (id: string) => {
    return db.prepare('DELETE FROM user_radios WHERE id = ?').run(id);
  },

  // Plugins
  getPlugins: (): DBPlugin[] => {
    return db.prepare('SELECT * FROM plugins ORDER BY name ASC').all() as DBPlugin[];
  },

  getPluginById: (id: string): DBPlugin | undefined => {
    return db.prepare('SELECT * FROM plugins WHERE id = ?').get(id) as DBPlugin | undefined;
  },

  upsertPlugin: (plugin: DBPlugin) => {
    const stmt = db.prepare(`
      INSERT INTO plugins (id, name, version, description, author, icon, main, styles, enabled, folder_path)
      VALUES (@id, @name, @version, @description, @author, @icon, @main, @styles, @enabled, @folder_path)
      ON CONFLICT(id) DO UPDATE SET
        name=excluded.name,
        version=excluded.version,
        description=excluded.description,
        author=excluded.author,
        icon=excluded.icon,
        main=excluded.main,
        styles=excluded.styles,
        folder_path=excluded.folder_path
    `);
    return stmt.run({
      id: plugin.id,
      name: plugin.name,
      version: plugin.version || '',
      description: plugin.description || '',
      author: plugin.author || '',
      icon: plugin.icon || '',
      main: plugin.main || 'index.js',
      styles: plugin.styles || '',
      enabled: plugin.enabled !== undefined ? plugin.enabled : 1,
      folder_path: plugin.folder_path
    });
  },

  togglePlugin: (id: string, enabled: number) => {
    return db.prepare('UPDATE plugins SET enabled = ? WHERE id = ?').run(enabled ? 1 : 0, id);
  },

  deletePlugin: (id: string) => {
    return db.prepare('DELETE FROM plugins WHERE id = ?').run(id);
  },

  resetAllData: (options: { clearCovers?: boolean } = { clearCovers: true }) => {
    try {
      db.transaction(() => {
        db.prepare('DELETE FROM playlist_tracks').run();
        db.prepare('DELETE FROM playlists').run();
        db.prepare('DELETE FROM play_history').run();
        db.prepare('DELETE FROM user_radios').run();
        db.prepare('DELETE FROM hidden_folders').run();
        db.prepare('DELETE FROM app_settings').run();
        db.prepare('DELETE FROM tracks').run();
      })();

      db.exec('VACUUM');

      if (options.clearCovers) {
        const coversDir = path.join(baseConfigDir, 'covers');
        if (fs.existsSync(coversDir)) {
          const files = fs.readdirSync(coversDir);
          for (const file of files) {
            try {
              fs.unlinkSync(path.join(coversDir, file));
            } catch (err) {
              console.error(`Failed to delete cover file ${file}:`, err);
            }
          }
        }
      }

      return { success: true };
    } catch (e: any) {
      console.error('Failed to reset app data:', e);
      return { success: false, error: e.message };
    }
  }
};

// Auto-run migration on startup
setTimeout(() => {
  try {
    dbOps.migrateCoversToFile();
  } catch (e) {
    console.error('Error during cover migration:', e);
  }
}, 5000);
