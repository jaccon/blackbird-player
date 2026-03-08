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
  description?: string;
}

export async function getMetadata(filePath: string, skipCovers = false): Promise<TrackMetadata> {
  const fileName = path.basename(filePath);
  const format = path.extname(filePath).toLowerCase().replace('.', '');
  
  try {
    const metadata = await mm.parseFile(filePath, { skipCovers });
    let cover: string | undefined = undefined;
    
    // Only process covers if we're not skipping them
    if (!skipCovers && metadata.common.picture && metadata.common.picture.length > 0) {
      const picture = metadata.common.picture[0];
      const base64 = Buffer.from(picture.data).toString('base64');
      cover = `data:${picture.format};base64,${base64}`;
    }

    return {
      title: metadata.common.title || fileName,
      artist: metadata.common.artist || 'Unknown Artist',
      album: metadata.common.album || 'Unknown Album',
      year: metadata.common.year,
      duration: metadata.format.duration,
      trackNumber: metadata.common.track.no || undefined,
      genre: metadata.common.genre,
      cover,
      filePath,
      fileName,
      format
    };
  } catch (error) {
    console.error(`Error parsing metadata for ${filePath}:`, error);
    return {
      title: fileName,
      artist: 'Unknown Artist',
      album: 'Unknown Album',
      filePath,
      fileName,
      format
    };
  }
}

export async function scanDirectory(dirPath: string): Promise<string[]> {
  const files: string[] = [];
  const supportedExtensions = ['.mp3', '.wav', '.ogg', '.mp4'];

  function walk(currentDir: string) {
    try {
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
