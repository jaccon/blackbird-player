import * as mm from 'music-metadata';
import * as path from 'path';
import * as fs from 'fs';

export interface TrackMetadata {
  title?: string;
  artist?: string;
  album?: string;
  year?: number;
  duration?: number;
  trackNumber?: number;
  genre?: string[];
  cover?: string;
  filePath: string;
  fileName: string;
  format: string;
  mimetype: string;
  kind?: string;
  description?: string;
  lyrics?: string;
}

export function getMimeType(filePath: string, format?: string): string {
  const ext = (format || path.extname(filePath).replace('.', '')).toLowerCase();
  switch (ext) {
    case 'mp3': return 'audio/mpeg';
    case 'm4a':
    case 'aac': return 'audio/mp4';
    case 'flac': return 'audio/flac';
    case 'wav': return 'audio/wav';
    case 'ogg':
    case 'oga': return 'audio/ogg';
    case 'opus': return 'audio/opus';
    case 'wma': return 'audio/x-ms-wma';
    case 'mp4':
    case 'm4v': return 'video/mp4';
    case 'webm': return 'video/webm';
    case 'mkv': return 'video/x-matroska';
    case 'mov': return 'video/quicktime';
    case 'avi': return 'video/x-msvideo';
    case 'youtube': return 'video/youtube';
    case 'stream': return 'audio/stream';
    case 'jpg':
    case 'jpeg': return 'image/jpeg';
    case 'png': return 'image/png';
    case 'gif': return 'image/gif';
    case 'webp': return 'image/webp';
    case 'bmp': return 'image/bmp';
    default: return 'application/octet-stream';
  }
}

export async function getMetadata(filePath: string, skipCovers = false): Promise<TrackMetadata> {
  const fileName = path.basename(filePath);
  const format = path.extname(filePath).toLowerCase().replace('.', '') || 'unknown';
  const mimetype = getMimeType(filePath, format);
  
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(format)) {
    return {
      title: fileName,
      artist: 'Photo',
      album: 'Photos',
      cover: filePath,
      filePath,
      fileName,
      format,
      mimetype,
      kind: 'Photo'
    };
  }

  try {
    const metadata = await mm.parseFile(filePath, { skipCovers });
    let cover: string | undefined = undefined;
    
    // Only process covers if we're not skipping them
    if (!skipCovers && metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const base64 = Buffer.from(picture.data).toString('base64');
      cover = `data:${picture.format};base64,${base64}`;
    }

    const defaultKind = (metadata.common.genre && metadata.common.genre.length > 0 && metadata.common.genre[0])
      ? metadata.common.genre[0]
      : format.toUpperCase();

    return {
      title: metadata.common.title || fileName.replace(/\.[^/.]+$/, ''),
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      year: metadata.common.year,
      duration: metadata.format.duration || 0,
      trackNumber: metadata.common.track?.no || undefined,
      genre: metadata.common.genre,
      cover,
      filePath,
      fileName,
      format,
      mimetype,
      kind: defaultKind
    };
  } catch (error) {
    return {
      title: fileName.replace(/\.[^/.]+$/, ''),
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      duration: 0,
      filePath,
      fileName,
      format,
      mimetype,
      kind: format.toUpperCase()
    };
  }
}

export async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const supportedExtensions = [
    '.mp3', '.m4a', '.flac', '.aac', '.wav', '.ogg', '.oga', '.opus', '.wma',
    '.mp4', '.m4v', '.webm', '.mkv', '.mov', '.avi',
    '.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'
  ];

  function walk(currentDir: string) {
    try {
      const stat = fs.lstatSync(currentDir);
      if (stat.isFile()) {
        const ext = path.extname(currentDir).toLowerCase();
        if (supportedExtensions.includes(ext)) {
          files.push(currentDir);
        }
        return;
      }
      
      const list = fs.readdirSync(currentDir);
      for (const file of list) {
        try {
          const fullPath = path.join(currentDir, file);
          const stat = fs.lstatSync(fullPath);
          
          if (stat.isDirectory()) {
            walk(fullPath);
          } else if (stat.isFile()) {
            const ext = path.extname(file).toLowerCase();
            if (supportedExtensions.includes(ext)) {
              files.push(fullPath);
            }
          }
        } catch (e) {
          // Skip inaccessible files
        }
      }
    } catch (e) {
      // Skip inaccessible directories
    }
  }

  walk(dirPath);
  return files;
}
