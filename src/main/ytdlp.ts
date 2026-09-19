import { app, BrowserWindow } from 'electron';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { dbOps, DBTrack } from './database';

export interface YtDlpStatus {
  available: boolean;
  path?: string;
  ffmpegAvailable: boolean;
}

export interface YtConversionOptions {
  url: string;
  format: 'mp3' | 'mp4';
  customTitle?: string;
  customArtist?: string;
}

export interface YtProgressEvent {
  percent: number;
  speed?: string;
  eta?: string;
  status: 'starting' | 'downloading' | 'converting' | 'completed' | 'error';
  message?: string;
}

export interface YtVideoMetadata {
  id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  description: string;
}

export class YtDlpService {
  private static cachedBinaryPath: string | null = null;
  private static cachedFfmpegPath: string | null = null;

  /**
   * Finds the path of an executable on the system across platforms.
   */
  private static findBinary(name: string): string | null {
    const isWin = process.platform === 'win32';
    const binaryName = isWin ? `${name}.exe` : name;

    const candidates = [
      `/usr/local/bin/${name}`,
      `/opt/homebrew/bin/${name}`,
      `/usr/bin/${name}`,
      path.join(app.getPath('home'), '.local', 'bin', name),
      path.join(app.getPath('home'), 'bin', name)
    ];

    for (const p of candidates) {
      if (fs.existsSync(p)) {
        return p;
      }
    }

    // Search in PATH directories
    const envPath = process.env.PATH || '';
    const pathDirs = envPath.split(path.delimiter);
    for (const dir of pathDirs) {
      const fullPath = path.join(dir, binaryName);
      if (fs.existsSync(fullPath)) {
        return fullPath;
      }
    }

    return null;
  }

  /**
   * Validates that an input URL is a legitimate YouTube HTTP/HTTPS URL and not a CLI flag.
   */
  private static validateYouTubeUrl(url: string): boolean {
    try {
      if (!url || typeof url !== 'string' || url.trim().startsWith('-')) return false;
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
      const host = parsed.hostname.toLowerCase();
      return (
        host === 'youtube.com' ||
        host.endsWith('.youtube.com') ||
        host === 'youtu.be' ||
        host.endsWith('.youtube-nocookie.com')
      );
    } catch {
      return false;
    }
  }

  /**
   * Checks availability of yt-dlp and ffmpeg.
   */
  static checkAvailability(): YtDlpStatus {
    if (!this.cachedBinaryPath) {
      this.cachedBinaryPath = this.findBinary('yt-dlp');
    }
    if (!this.cachedFfmpegPath) {
      this.cachedFfmpegPath = this.findBinary('ffmpeg');
    }

    return {
      available: !!this.cachedBinaryPath,
      path: this.cachedBinaryPath || undefined,
      ffmpegAvailable: !!this.cachedFfmpegPath
    };
  }

  /**
   * Fetches metadata for a YouTube URL using yt-dlp.
   */
  static async getVideoInfo(url: string): Promise<{ success: boolean; data?: YtVideoMetadata; error?: string }> {
    if (!this.validateYouTubeUrl(url)) {
      return { success: false, error: 'Invalid YouTube URL provided.' };
    }

    const status = this.checkAvailability();
    if (!status.available || !status.path) {
      return { success: false, error: 'yt-dlp is not installed or not found in system PATH.' };
    }

    const binaryPath = status.path!;
    return new Promise((resolve) => {
      const proc: any = spawn(binaryPath, ['--dump-json', '--no-playlist', '--no-warnings', '--', url.trim()]);
      let stdout = '';
      let stderr = '';
      let timedOut = false;

      const timer = setTimeout(() => {
        timedOut = true;
        proc.kill('SIGTERM');
        resolve({ success: false, error: 'Timeout while fetching video metadata (30s exceeded)' });
      }, 30000);

      proc.stdout.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('close', (code: number) => {
        clearTimeout(timer);
        if (timedOut) return;

        if (code === 0) {
          try {
            const parsed = JSON.parse(stdout);
            resolve({
              success: true,
              data: {
                id: parsed.id,
                title: parsed.title,
                author: parsed.uploader || parsed.channel || 'YouTube',
                thumbnail: parsed.thumbnail,
                duration: parsed.duration || 0,
                description: parsed.description || ''
              }
            });
          } catch (e: any) {
            resolve({ success: false, error: `Failed to parse video info: ${e.message}` });
          }
        } else {
          resolve({ success: false, error: stderr || `Process exited with code ${code}` });
        }
      });

      proc.on('error', (err: Error) => {
        clearTimeout(timer);
        if (timedOut) return;
        resolve({ success: false, error: err.message });
      });
    });
  }

  /**
   * Converts and downloads YouTube media as MP3 or MP4, updating the database upon completion.
   */
  static async convertAndDownload(
    options: YtConversionOptions,
    browserWindow?: BrowserWindow | null
  ): Promise<{ success: boolean; track?: DBTrack; error?: string }> {
    const { url, format, customTitle, customArtist } = options;

    if (!this.validateYouTubeUrl(url)) {
      return { success: false, error: 'Invalid YouTube URL provided.' };
    }

    const status = this.checkAvailability();
    if (!status.available || !status.path) {
      return { success: false, error: 'yt-dlp is not installed on this system.' };
    }

    if (format === 'mp3' && !status.ffmpegAvailable) {
      return {
        success: false,
        error: 'ffmpeg is required for MP3 audio extraction but was not found on your system. Please install ffmpeg.'
      };
    }

    const baseDownloadDir = path.join(
      app.getPath('home'),
      'BlackBird',
      'downloads',
      format === 'mp3' ? 'music' : 'videos'
    );
    if (!fs.existsSync(baseDownloadDir)) {
      fs.mkdirSync(baseDownloadDir, { recursive: true });
    }

    const outputTemplate = path.join(baseDownloadDir, '%(title)s [%(id)s].%(ext)s');

    const emitProgress = (progress: YtProgressEvent) => {
      if (browserWindow && !browserWindow.isDestroyed()) {
        browserWindow.webContents.send('ytdlp:progress', progress);
      }
    };

    emitProgress({ percent: 0, status: 'starting', message: 'Fetching video metadata...' });

    // Pre-fetch info to ensure we know title and thumbnail
    const infoResult = await this.getVideoInfo(url);
    const videoData = infoResult.success ? infoResult.data : null;

    const args: string[] = ['--no-playlist', '--no-warnings', '--newline'];

    if (this.cachedFfmpegPath) {
      args.push('--ffmpeg-location', path.dirname(this.cachedFfmpegPath));
    }

    if (format === 'mp3') {
      args.push('-x', '--audio-format', 'mp3', '--audio-quality', '0', '-o', outputTemplate, '--', url.trim());
    } else {
      args.push(
        '-f',
        'bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]/bv*+ba/b',
        '--merge-output-format',
        'mp4',
        '-o',
        outputTemplate,
        '--',
        url.trim()
      );
    }

    return new Promise((resolve) => {
      const proc: any = spawn(status.path!, args);
      let capturedFilePath = '';
      let errorOutput = '';

      proc.stdout.on('data', (data: Buffer) => {
        const text = data.toString();

        // Extract file destination
        const destMatch = text.match(/\[(?:download|Merger|ExtractAudio)\] Destination:\s+(.+)/);
        if (destMatch && destMatch[1]) {
          capturedFilePath = destMatch[1].trim();
        }

        const alreadyDownloadedMatch = text.match(/\[download\]\s+(.+)\s+has already been downloaded/);
        if (alreadyDownloadedMatch && alreadyDownloadedMatch[1]) {
          capturedFilePath = alreadyDownloadedMatch[1].trim();
        }

        // Parse progress percentages
        const percentMatch = text.match(/\[download\]\s+([\d.]+)%\s+of\s+~?([^\s]+)\s+at\s+([^\s]+)\s+ETA\s+([^\s]+)/);
        if (percentMatch) {
          const percent = parseFloat(percentMatch[1]);
          emitProgress({
            percent,
            speed: percentMatch[3],
            eta: percentMatch[4],
            status: 'downloading',
            message: `Downloading: ${percent.toFixed(1)}%`
          });
        } else if (text.includes('[ExtractAudio]') || text.includes('[Merger]')) {
          emitProgress({
            percent: 95,
            status: 'converting',
            message: `Converting to ${format.toUpperCase()}...`
          });
        }
      });

      proc.stderr.on('data', (data: Buffer) => {
        errorOutput += data.toString();
      });

      proc.on('close', (code: number) => {
        if (code === 0) {
          let finalFilePath = capturedFilePath;
          if (videoData && videoData.id) {
            const files = fs.readdirSync(baseDownloadDir);
            const matching = files.find((f) => f.includes(`[${videoData.id}]`) && f.endsWith(`.${format}`));
            if (matching) {
              finalFilePath = path.join(baseDownloadDir, matching);
            }
          }

          if (!finalFilePath || !fs.existsSync(finalFilePath)) {
            const files = fs
              .readdirSync(baseDownloadDir)
              .map((f) => ({ name: f, time: fs.statSync(path.join(baseDownloadDir, f)).mtime.getTime() }))
              .sort((a, b) => b.time - a.time);

            if (files.length > 0 && files[0].name.endsWith(`.${format}`)) {
              finalFilePath = path.join(baseDownloadDir, files[0].name);
            }
          }

          if (!finalFilePath || !fs.existsSync(finalFilePath)) {
            emitProgress({
              percent: 0,
              status: 'error',
              message: 'Conversion completed but output file could not be found'
            });
            return resolve({
              success: false,
              error: 'Conversion completed but output media file was not found on disk.'
            });
          }

          const trackUuid = uuidv4();
          const title = customTitle || (videoData ? videoData.title : path.parse(finalFilePath).name);
          const artist = customArtist || (videoData ? videoData.author : 'YouTube');
          const cover = videoData ? videoData.thumbnail : null;
          const duration = videoData ? videoData.duration : 0;

          const track: DBTrack = {
            uuid: trackUuid,
            title,
            artist,
            album: format === 'mp3' ? 'YouTube Audio' : 'YouTube Video',
            file_path: finalFilePath,
            format: format,
            mimetype: format === 'mp3' ? 'audio/mp3' : 'video/mp4',
            kind: format,
            cover: cover || undefined,
            duration,
            is_favorite: 0,
            description: videoData ? videoData.description : ''
          };

          try {
            dbOps.upsertTrack(track);
          } catch (dbErr) {
            console.error('[YtDlpService] Failed to upsert track in DB:', dbErr);
          }

          emitProgress({
            percent: 100,
            status: 'completed',
            message: `Successfully converted to ${format.toUpperCase()} and added to library!`
          });

          resolve({ success: true, track });
        } else {
          emitProgress({
            percent: 0,
            status: 'error',
            message: errorOutput || 'Download failed'
          });
          resolve({ success: false, error: errorOutput || `Process exited with code ${code}` });
        }
      });

      proc.on('error', (err: Error) => {
        emitProgress({
          percent: 0,
          status: 'error',
          message: err.message
        });
        resolve({ success: false, error: err.message });
      });
    });
  }
}
