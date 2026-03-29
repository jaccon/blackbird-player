import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createRequire } from 'module';

const requireNative = createRequire(import.meta.url);
const Database = requireNative('better-sqlite3');

const dbPath = path.join(app.getPath('userData'), 'blackbird.db');
const db = new Database(dbPath);

const coversDir = path.join(app.getPath('userData'), 'covers');
if (!fs.existsSync(coversDir)) {
  fs.mkdirSync(coversDir, { recursive: true });
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
  if (coverPath.startsWith('data:') || coverPath.startsWith('http') || coverPath.startsWith('file://')) {
    return coverPath;
  }
  return `file://${coverPath}`;
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

try {
  db.prepare('SELECT id FROM play_history LIMIT 0').all();
} catch (e) {
  console.log('play_history table missing, creating it now...');
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
  trackCount?: number;
  totalDuration?: number;
}

export const dbOps = {
  // Tracks
  upsertTrack: (track: DBTrack) => {
    if (track.cover && track.cover.startsWith('data:')) {
      track.cover = saveCoverToFile(track.uuid, track.cover) || undefined;
    }

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
    const track = db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, cover, duration, is_favorite, description FROM tracks WHERE file_path = ?').get(filePath) as any;
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
      SELECT t.uuid, t.title, t.artist, t.cover, t.format, COUNT(p.id) as playCount 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid 
      GROUP BY p.track_uuid 
      ORDER BY playCount DESC 
      LIMIT 10
    `).all() as any[];

    topTracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });

    const topFormatRow = db.prepare(`
      SELECT t.format, COUNT(p.id) as playCount 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid 
      WHERE t.format IS NOT NULL AND t.format != ''
      GROUP BY t.format 
      ORDER BY playCount DESC 
      LIMIT 1
    `).get() as any;

    const favoriteTypes = db.prepare(`
      SELECT format, COUNT(*) as count 
      FROM tracks 
      WHERE is_favorite = 1 AND format IS NOT NULL AND format != ''
      GROUP BY format 
      ORDER BY count DESC
    `).all() as any[];

    const hoursRow = db.prepare(`
      SELECT SUM(duration_played) as totalSeconds 
      FROM play_history 
      WHERE played_at >= datetime('now', '-1 month')
    `).get() as any;

    const totalTracksRow = db.prepare(`SELECT COUNT(*) as count FROM tracks`).get() as any;
    const totalAlbumsRow = db.prepare(`SELECT COUNT(DISTINCT album) as count FROM tracks WHERE album IS NOT NULL AND album != '' AND album != 'Unknown Album'`).get() as any;

    const activeHours = db.prepare(`
      SELECT strftime('%H', datetime(played_at, 'localtime')) as hour, COUNT(*) as count 
      FROM play_history 
      GROUP BY hour 
      ORDER BY count DESC 
      LIMIT 3
    `).all() as any[];

    const allTracks = db.prepare('SELECT file_path FROM tracks').all() as any[];
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
      SELECT p.id, t.uuid, t.title, t.artist, t.album, t.file_path as filePath, t.format, t.cover, t.duration, t.is_favorite, t.description, p.played_at 
      FROM play_history p 
      JOIN tracks t ON p.track_uuid = t.uuid 
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
             (SELECT COUNT(*) FROM playlist_tracks WHERE playlist_id = p.id) as trackCount,
             (SELECT SUM(t.duration) FROM tracks t JOIN playlist_tracks pt ON t.uuid = pt.track_uuid WHERE pt.playlist_id = p.id) as totalDuration
      FROM playlists p 
      ORDER BY p.created_at DESC
    `).all() as Playlist[];
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

  removeTrackFromPlaylist: (playlistId: string, trackUuid: string) => {
    return db.prepare('DELETE FROM playlist_tracks WHERE playlist_id = ? AND track_uuid = ?').run(playlistId, trackUuid);
  },

  updateTrack: (uuid: string, data: Partial<DBTrack>) => {
    if (data.cover && data.cover.startsWith('data:')) {
      data.cover = saveCoverToFile(uuid, data.cover) || undefined;
    }
    const fields = Object.keys(data).map(key => `${key} = ?`).join(', ');
    const values = Object.values(data);
    return db.prepare(`UPDATE tracks SET ${fields} WHERE uuid = ?`).run(...values, uuid);
  },

  getPlaylistTracks: (playlistId: string) => {
    const tracks = db.prepare(`
      SELECT t.uuid, t.title, t.artist, t.album, t.file_path as filePath, t.format, t.cover, t.duration, t.is_favorite, t.description
      FROM tracks t
      JOIN playlist_tracks pt ON t.uuid = pt.track_uuid
      WHERE pt.playlist_id = ?
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

  getAllTracks: () => {
    const tracks = db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, cover, duration, is_favorite, description FROM tracks').all() as any[];
    tracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });
    return tracks;
  },

  getFavoriteTracks: () => {
    const tracks = db.prepare('SELECT uuid, title, artist, album, file_path as filePath, format, cover, duration, is_favorite, description FROM tracks WHERE is_favorite = 1').all() as any[];
    tracks.forEach(t => {
      if (t.cover) t.cover = formatCoverUrl(t.cover);
    });
    return tracks;
  },

  getThemes: () => {
    const builtinThemeDir = path.join(app.getAppPath(), 'resources', 'themes');
    const userThemeDir = path.join(app.getPath('userData'), 'themes');
    const themes = new Map();

    const loadFromDir = (dir: string) => {
      if (!fs.existsSync(dir)) return;
      fs.readdirSync(dir)
        .filter(f => f.endsWith('.json'))
        .forEach(f => {
          try {
            const content = fs.readFileSync(path.join(dir, f), 'utf-8');
            const parsed = JSON.parse(content);
            if (parsed.name) themes.set(parsed.name, parsed);
          } catch (e) {
            console.error(`Error parsing theme ${f}:`, e);
          }
        });
    };

    loadFromDir(builtinThemeDir);
    loadFromDir(userThemeDir);
    
    return Array.from(themes.values());
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
