import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';

const requireNative = createRequire(import.meta.url);
const Database = requireNative('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'blackbird.db');
const db = new Database(dbPath);

// Initialize schema
db.exec(`
  CREATE TABLE IF NOT EXISTS tracks (
    uuid TEXT PRIMARY KEY,
    title TEXT,
    artist TEXT,
    album TEXT,
    file_path TEXT UNIQUE,
    format TEXT,
    cover TEXT,
    duration REAL,
    is_favorite INTEGER DEFAULT 0,
    description TEXT
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
`);

// Support migration for existing DBs
try {
  const tableInfo = db.prepare("PRAGMA table_info(tracks)").all() as any[];
  const hasFavorite = tableInfo.some(col => col.name === 'is_favorite');
  const hasDuration = tableInfo.some(col => col.name === 'duration');
  
  if (!hasDuration) {
    db.exec('ALTER TABLE tracks ADD COLUMN duration REAL');
    console.log('Migrated DB: added duration column');
  }
  
  if (!hasFavorite) {
    db.exec('ALTER TABLE tracks ADD COLUMN is_favorite INTEGER DEFAULT 0');
    console.log('Migrated DB: added is_favorite column');
  }

  const hasDescription = tableInfo.some(col => col.name === 'description');
  if (!hasDescription) {
    db.exec('ALTER TABLE tracks ADD COLUMN description TEXT');
    console.log('Migrated DB: added description column');
  }
} catch (e) {
  console.error('Migration error:', e);
}

// Double check migration (guaranteed)
try {
  db.prepare('SELECT is_favorite FROM tracks LIMIT 0').all();
} catch (e) {
  console.log('is_favorite column missing, adding it now...');
  db.exec('ALTER TABLE tracks ADD COLUMN is_favorite INTEGER DEFAULT 0');
}

export interface DBTrack {
  uuid: string;
  title: string;
  artist: string;
  album: string;
  file_path: string;
  format: string;
  cover?: string;
  duration?: number;
  is_favorite?: number;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
}

export const dbOps = {
  // Tracks
  upsertTrack: (track: DBTrack) => {
    const stmt = db.prepare(`
      INSERT INTO tracks (uuid, title, artist, album, file_path, format, cover, duration, is_favorite, description)
      VALUES (@uuid, @title, @artist, @album, @file_path, @format, @cover, @duration, @is_favorite, @description)
      ON CONFLICT(file_path) DO UPDATE SET
        title=excluded.title,
        artist=excluded.artist,
        album=excluded.album,
        cover=excluded.cover,
        duration=excluded.duration,
        is_favorite=excluded.is_favorite,
        description=excluded.description
    `);
    return stmt.run(track);
  },

  getTrackByPath: (filePath: string) => {
    return db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, cover, duration, is_favorite, description FROM tracks WHERE file_path = ?').get(filePath) as any;
  },

  // Playlists
  createPlaylist: (name: string) => {
    const id = uuidv4();
    db.prepare('INSERT INTO playlists (id, name) VALUES (?, ?)').run(id, name);
    return id;
  },

  getAllPlaylists: () => {
    return db.prepare('SELECT * FROM playlists ORDER BY created_at DESC').all() as Playlist[];
  },

  addTrackToPlaylist: (playlistId: string, trackUuid: string) => {
    // Get track name to validate uniqueness by name in playlist
    const track = db.prepare('SELECT title FROM tracks WHERE uuid = ?').get(trackUuid) as DBTrack;
    
    const exists = db.prepare(`
      SELECT 1 FROM playlist_tracks pt
      JOIN tracks t ON pt.track_uuid = t.uuid
      WHERE pt.playlist_id = ? AND t.title = ?
    `).get(playlistId, track.title);
    
    if (exists) return { error: 'A track with this name already exists in the playlist' };

    return db.prepare('INSERT INTO playlist_tracks (playlist_id, track_uuid) VALUES (?, ?)').run(playlistId, trackUuid);
  },

  updateTrack: (uuid: string, data: Partial<DBTrack>) => {
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    return db.prepare(`UPDATE tracks SET ${fields} WHERE uuid = ?`).run(...values, uuid);
  },

  getPlaylistTracks: (playlistId: string) => {
    return db.prepare(`
      SELECT t.uuid, t.title, t.artist, t.album, t.file_path as filePath, t.format, t.cover, t.duration, t.is_favorite, t.description
      FROM tracks t
      JOIN playlist_tracks pt ON t.uuid = pt.track_uuid
      WHERE pt.playlist_id = ?
    `).all(playlistId) as any[];
  },

  deletePlaylist: (id: string) => {
    db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ?').run(id);
    return db.prepare('DELETE FROM playlists WHERE id = ?').run(id);
  },

  getAllTracks: () => {
    return db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, cover, duration, is_favorite, description FROM tracks').all() as any[];
  },

  getFavoriteTracks: () => {
    return db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, cover, duration, is_favorite, description FROM tracks WHERE is_favorite = 1').all() as any[];
  },

  getThemes: () => {
    const themeDir = path.join(app.getAppPath(), 'resources', 'themes');
    if (!fs.existsSync(themeDir)) return [];
    
    return fs.readdirSync(themeDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const content = fs.readFileSync(path.join(themeDir, f), 'utf-8');
        return JSON.parse(content);
      });
  },

  deleteTracks: (uuids: string[]) => {
    const placeholders = uuids.map(() => '?').join(',');
    db.prepare(`DELETE FROM playlist_tracks WHERE track_uuid IN (${placeholders})`).run(...uuids);
    return db.prepare(`DELETE FROM tracks WHERE uuid IN (${placeholders})`).run(...uuids);
  },

  getAllRaw: () => {
    return {
      tracks: db.prepare('SELECT * FROM tracks').all(),
      playlists: db.prepare('SELECT * FROM playlists').all(),
      playlist_tracks: db.prepare('SELECT * FROM playlist_tracks').all()
    };
  },

  importRaw: (data: any) => {
    const transaction = db.transaction((importData) => {
      // Clear existing
      db.prepare('DELETE FROM playlist_tracks').run();
      db.prepare('DELETE FROM playlists').run();
      db.prepare('DELETE FROM tracks').run();

      // Insert tracks
      if (importData.tracks && importData.tracks.length) {
        const trackStmt = db.prepare(`INSERT INTO tracks (uuid, title, artist, album, file_path, format, cover, duration, is_favorite, description) VALUES (@uuid, @title, @artist, @album, @file_path, @format, @cover, @duration, @is_favorite, @description)`);
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
    });

    try {
      transaction(data);
      return { success: true };
    } catch (e: any) {
      console.error('Import failed', e);
      return { success: false, error: e.message };
    }
  }
};
