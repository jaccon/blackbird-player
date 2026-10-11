import http from 'http';
import https from 'https';
import fs from 'fs';
import path from 'path';
import { URL } from 'url';
import localIpUrl from 'local-ip-url';
import { dbOps } from './database';
import { getMetadata } from './metadata';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { getTvWebHtml } from './tv-web';
import zlib from 'zlib';
import crypto from 'crypto';

let server: http.Server | null = null;
let currentPort = 3000;

interface CachedResponse {
  raw: Buffer;
  gzip: Buffer;
  etag: string;
  timestamp: number;
}

const memoryCache = new Map<string, CachedResponse>();

export function invalidateServerCache(key?: string): void {
  if (key) {
    for (const k of Array.from(memoryCache.keys())) {
      if (k.startsWith(key)) memoryCache.delete(k);
    }
  } else {
    memoryCache.clear();
  }
}

function getOrSetCachedResponse(
  cacheKey: string,
  generator: () => string | Buffer,
  ttlMs: number = 60000
): CachedResponse {
  const cached = memoryCache.get(cacheKey);
  const now = Date.now();
  if (cached && now - cached.timestamp < ttlMs) {
    return cached;
  }

  const content = generator();
  const raw = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8');
  const gzip = zlib.gzipSync(raw, { level: 6 });
  const etag = `"${crypto.createHash('md5').update(raw).digest('hex')}"`;

  const entry: CachedResponse = {
    raw,
    gzip,
    etag,
    timestamp: now
  };
  memoryCache.set(cacheKey, entry);
  return entry;
}

function sendCachedResponse(
  req: http.IncomingMessage,
  res: http.ServerResponse,
  cached: CachedResponse,
  contentType: string,
  cacheControl: string = 'public, max-age=60, stale-while-revalidate=300'
): void {
  const clientEtag = req.headers['if-none-match'];
  if (clientEtag && clientEtag === cached.etag) {
    res.writeHead(304, {
      'ETag': cached.etag,
      'Cache-Control': cacheControl
    });
    res.end();
    return;
  }

  const acceptEncoding = (req.headers['accept-encoding'] || '').toString();
  const supportsGzip = acceptEncoding.includes('gzip');

  const headers: Record<string, string | number> = {
    'Content-Type': contentType,
    'ETag': cached.etag,
    'Cache-Control': cacheControl
  };

  if (supportsGzip) {
    headers['Content-Encoding'] = 'gzip';
    headers['Content-Length'] = cached.gzip.length;
    res.writeHead(200, headers);
    res.end(cached.gzip);
  } else {
    headers['Content-Length'] = cached.raw.length;
    res.writeHead(200, headers);
    res.end(cached.raw);
  }
}

export interface ConnectedClient {
  id: string;
  ip: string;
  device: string;
  lastSeen: number;
}

const activeClients = new Map<string, ConnectedClient>();

function cleanInactiveClients(): void {
  const now = Date.now();
  for (const [id, client] of activeClients.entries()) {
    if (now - client.lastSeen > 15000) {
      activeClients.delete(id);
    }
  }
}

function parseDeviceFromUserAgent(ua: string): string {
  const s = (ua || '').toLowerCase();
  if (s.includes('tizen')) return 'Samsung Smart TV (Tizen)';
  if (s.includes('webos')) return 'LG Smart TV (webOS)';
  if (s.includes('android tv') || s.includes('googletv')) return 'Android TV';
  if (s.includes('appletv')) return 'Apple TV';
  if (s.includes('roku')) return 'Roku TV';
  if (s.includes('smart-tv') || s.includes('smarttv') || s.includes('crkey') || s.includes('hbbtv')) return 'Smart TV';
  if (s.includes('tivimate')) return 'TiviMate IPTV Player';
  if (s.includes('vlc')) return 'VLC Media Player';
  if (s.includes('kodi')) return 'Kodi Media Center';
  if (s.includes('smarters')) return 'IPTV Smarters';
  if (s.includes('iphone')) return 'Apple iPhone';
  if (s.includes('ipad')) return 'Apple iPad';
  if (s.includes('android')) return 'Dispositivo Android';
  if (s.includes('macintosh') || s.includes('mac os')) return 'Mac (Navegador)';
  if (s.includes('windows')) return 'PC Windows';
  if (s.includes('linux')) return 'PC Linux';
  return 'Navegador Web';
}

function recordClientActivity(ip: string, ua: string, explicitId?: string, explicitDevice?: string): void {
  cleanInactiveClients();
  const cleanIp = ip.replace('::ffff:', '');
  const id = explicitId || `${cleanIp}-${(ua || 'client').slice(0, 20)}`;
  const device = explicitDevice || parseDeviceFromUserAgent(ua);
  activeClients.set(id, {
    id,
    ip: cleanIp,
    device,
    lastSeen: Date.now()
  });
}

function getContentType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    case '.js': return 'application/javascript';
    case '.json': return 'application/json';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.bmp': return 'image/bmp';
    case '.avif': return 'image/avif';
    case '.svg': return 'image/svg+xml';
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.flac': return 'audio/flac';
    case '.ogg': return 'audio/ogg';
    case '.m4a':
    case '.aac': return 'audio/aac';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.mkv': return 'video/x-matroska';
    case '.mov': return 'video/quicktime';
    case '.m3u':
    case '.m3u8': return 'application/vnd.apple.mpegurl';
    default: return 'application/octet-stream';
  }
}

function proxyStream(req: http.IncomingMessage, res: http.ServerResponse, targetUrlStr: string, redirectsRemaining = 5): void {
  if (redirectsRemaining <= 0) {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Too many redirects');
    return;
  }

  let targetUrl: URL;
  try {
    targetUrl = new URL(targetUrlStr);
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Invalid URL');
    return;
  }

  const isHttps = targetUrl.protocol === 'https:';
  const client = isHttps ? https : http;

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Accept': '*/*'
  };
  if (req.headers.range) {
    headers['Range'] = req.headers.range as string;
  }

  const proxyReq = client.get(targetUrl, { headers }, (proxyRes) => {
    // Follow HTTP redirects
    if (proxyRes.statusCode && [301, 302, 303, 307, 308].includes(proxyRes.statusCode) && proxyRes.headers.location) {
      const redirectUrl = new URL(proxyRes.headers.location, targetUrl).toString();
      proxyStream(req, res, redirectUrl, redirectsRemaining - 1);
      return;
    }

    const contentType = proxyRes.headers['content-type'] || '';
    const isM3u8 = contentType.includes('mpegurl') || targetUrl.pathname.endsWith('.m3u8') || targetUrl.pathname.endsWith('.m3u');

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');

    if (proxyRes.headers['content-range']) {
      res.setHeader('Content-Range', proxyRes.headers['content-range']);
    }
    if (proxyRes.headers['accept-ranges']) {
      res.setHeader('Accept-Ranges', proxyRes.headers['accept-ranges']);
    }

    if (isM3u8) {
      // Manifest rewriting: Rewrite relative segments & playlists to go through our proxy
      let data = '';
      proxyRes.setEncoding('utf8');
      proxyRes.on('data', chunk => { data += chunk; });
      proxyRes.on('end', () => {
        const lines = data.split(/\r?\n/);
        const rewritten = lines.map(line => {
          const trimmed = line.trim();
          if (!trimmed || trimmed.startsWith('#')) return line;
          try {
            const absoluteUrl = new URL(trimmed, targetUrl).toString();
            return `/api/stream-proxy?url=${encodeURIComponent(absoluteUrl)}`;
          } catch {
            return line;
          }
        }).join('\n');

        res.writeHead(proxyRes.statusCode || 200, {
          'Content-Type': 'application/vnd.apple.mpegurl; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        });
        res.end(rewritten);
      });
    } else {
      if (proxyRes.headers['content-type']) {
        res.setHeader('Content-Type', proxyRes.headers['content-type']);
      }
      if (proxyRes.headers['content-length']) {
        res.setHeader('Content-Length', proxyRes.headers['content-length']);
      }
      res.writeHead(proxyRes.statusCode || 200);
      proxyRes.pipe(res);
    }
  });

  proxyReq.on('error', (err) => {
    console.error('Proxy error:', err.message);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
      res.end('Proxy error: ' + err.message);
    }
  });
}

function serveMedia(req: http.IncomingMessage, res: http.ServerResponse, filePath: string): void {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;

  res.setHeader('Access-Control-Allow-Origin', '*');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const partialstart = parts[0];
    const partialend = parts[1];

    const start = parseInt(partialstart, 10);
    const end = partialend ? parseInt(partialend, 10) : total - 1;
    const chunksize = (end - start) + 1;
    
    const file = fs.createReadStream(filePath, { start, end });
    file.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    res.writeHead(206, {
      'Content-Range': 'bytes ' + start + '-' + end + '/' + total,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': getContentType(filePath)
    });
    file.pipe(res);
  } else {
    const file = fs.createReadStream(filePath);
    file.on('error', (err) => {
      console.error('Stream error:', err);
      if (!res.headersSent) res.writeHead(500);
      res.end();
    });
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': getContentType(filePath)
    });
    file.pipe(res);
  }
}

export function startServer(port: number = 3000): {
  isRunning: boolean;
  ip: string;
  port: number;
  connectedCount: number;
  clients: ConnectedClient[];
} {
  if (server) {
    return getServerStatus();
  }

  server = http.createServer((req, res) => {
    // Enable CORS for all incoming API & stream requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const host = req.headers.host || `localhost:${currentPort}`;
    const url = new URL(req.url || '/', `http://${host}`);
    const clientIp = (req.socket.remoteAddress || req.headers['x-forwarded-for'] || '127.0.0.1').toString();
    const userAgent = (req.headers['user-agent'] || '').toString();

    // 1. Root & TV Web Interface
    if (url.pathname === '/' || url.pathname === '/index.html') {
      recordClientActivity(clientIp, userAgent, url.searchParams.get('clientId') || undefined);
      const cached = getOrSetCachedResponse('html_index', () => getTvWebHtml(localIpUrl(), currentPort), 300000);
      sendCachedResponse(req, res, cached, 'text/html; charset=utf-8', 'public, max-age=0, must-revalidate');
      return;
    }

    // 2. IPTV Playlist (M3U / M3U8) for Smart TV Apps (TiviMate, VLC, SS IPTV, Kodi, etc.)
    if (url.pathname === '/iptv.m3u' || url.pathname === '/playlist.m3u' || url.pathname === '/channels.m3u') {
      recordClientActivity(clientIp, userAgent, undefined, parseDeviceFromUserAgent(userAgent) || 'Smart TV IPTV Player');
      const cached = getOrSetCachedResponse('iptv_m3u', () => {
        const channels = dbOps.getM3UChannels();
        let m3u = '#EXTM3U x-tvg-url=""\n';
        for (const ch of channels) {
          const name = (ch.name || 'Canal').replace(/"/g, '');
          const group = (ch.group_title || 'Geral').replace(/"/g, '');
          const logo = ch.logo_url || '';
          m3u += `#EXTINF:-1 tvg-id="${ch.id}" tvg-name="${name}" tvg-logo="${logo}" group-title="${group}",${name}\n`;
          m3u += `${ch.url}\n`;
        }
        return m3u;
      }, 60000);
      res.setHeader('Content-Disposition', 'inline; filename="blackbird-iptv.m3u"');
      sendCachedResponse(req, res, cached, 'application/x-mpegurl; charset=utf-8', 'public, max-age=30, stale-while-revalidate=300');
      return;
    }

    // 3. IPTV Channels JSON API
    if (url.pathname === '/api/iptv' || url.pathname === '/api/m3u') {
      recordClientActivity(clientIp, userAgent, url.searchParams.get('clientId') || undefined);
      const cached = getOrSetCachedResponse('api_iptv', () => {
        const channels = dbOps.getM3UChannels();
        return JSON.stringify(channels);
      }, 60000);
      sendCachedResponse(req, res, cached, 'application/json; charset=utf-8', 'public, max-age=60, stale-while-revalidate=600');
      return;
    }

    // 4. Stream Proxy (CORS and format bypass for Smart TV web browsers)
    if (url.pathname === '/api/stream-proxy') {
      recordClientActivity(clientIp, userAgent, url.searchParams.get('clientId') || undefined);
      const targetUrl = url.searchParams.get('url');
      if (!targetUrl) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing url parameter');
        return;
      }
      proxyStream(req, res, targetUrl);
      return;
    }

    // 5. Client Heartbeat (Web & TV clients ping every 5 seconds)
    if (url.pathname === '/api/heartbeat') {
      const explicitClientId = url.searchParams.get('clientId') || undefined;
      const explicitDevice = url.searchParams.get('device') || undefined;
      recordClientActivity(clientIp, userAgent, explicitClientId, explicitDevice);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, connectedCount: activeClients.size }));
      return;
    }

    // 6. Client Disconnect Beacon
    if (url.pathname === '/api/disconnect') {
      const explicitClientId = url.searchParams.get('clientId');
      if (explicitClientId && activeClients.has(explicitClientId)) {
        activeClients.delete(explicitClientId);
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, connectedCount: activeClients.size }));
      return;
    }

    // 7. Server Status API
    if (url.pathname === '/api/status') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getServerStatus()));
      return;
    }

    // 8. Media Library JSON API
    if (url.pathname === '/api/library') {
      recordClientActivity(clientIp, userAgent, url.searchParams.get('clientId') || undefined);
      const cached = getOrSetCachedResponse('api_library', () => {
        const tracks = dbOps.getAllTracks();
        return JSON.stringify(tracks);
      }, 60000);
      sendCachedResponse(req, res, cached, 'application/json; charset=utf-8', 'public, max-age=60, stale-while-revalidate=600');
      return;
    }

    // 8.1. Photos JSON API
    if (url.pathname === '/api/photos') {
      recordClientActivity(clientIp, userAgent, url.searchParams.get('clientId') || undefined);
      const cached = getOrSetCachedResponse('api_photos', () => {
        const tracks = dbOps.getAllTracks();
        const photos = tracks.filter(t => {
          const ext = (t.format || (t.file_path ? t.file_path.split('.').pop() : '') || '').toLowerCase();
          return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'svg'].includes(ext) || (t.mimetype && t.mimetype.startsWith('image/'));
        });
        return JSON.stringify(photos);
      }, 60000);
      sendCachedResponse(req, res, cached, 'application/json; charset=utf-8', 'public, max-age=60, stale-while-revalidate=600');
      return;
    }

    // 9. Stream Local File
    if (url.pathname.startsWith('/api/stream/')) {
      recordClientActivity(clientIp, userAgent, url.searchParams.get('clientId') || undefined);
      const uuid = url.pathname.split('/')[3];
      const filePath = dbOps.getTrackPath(uuid);
      if (filePath) {
        serveMedia(req, res, filePath);
      } else {
        res.writeHead(404);
        res.end('Track not found');
      }
      return;
    }

    // 10. Cover Image (Cached aggressively)
    if (url.pathname.startsWith('/api/cover/')) {
      const uuid = url.pathname.split('/')[3];
      const coverEtag = `"cover-${uuid}"`;
      if (req.headers['if-none-match'] === coverEtag) {
        res.writeHead(304, {
          'ETag': coverEtag,
          'Cache-Control': 'public, max-age=2592000, immutable'
        });
        res.end();
        return;
      }
      const coverPath = dbOps.getTrackCoverPath(uuid);
      if (coverPath && fs.existsSync(coverPath)) {
        res.writeHead(200, {
          'Content-Type': getContentType(coverPath),
          'Cache-Control': 'public, max-age=2592000, immutable',
          'ETag': coverEtag
        });
        fs.createReadStream(coverPath).pipe(res);
      } else {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#18181b"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#71717a" font-family="sans-serif" font-size="48">🎵</text></svg>`;
        res.writeHead(200, {
          'Content-Type': 'image/svg+xml',
          'Cache-Control': 'public, max-age=2592000, immutable',
          'ETag': coverEtag
        });
        res.end(svg);
      }
      return;
    }

    // 11. Upload File
    if (url.pathname === '/api/upload' && req.method === 'POST') {
      const filename = url.searchParams.get('filename');
      if (!filename) {
        res.writeHead(400);
        res.end('Missing filename');
        return;
      }
      
      const uploadsDir = path.join(app.getPath('music'), 'BlackBird', 'Uploads');
      if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
      
      const filePath = path.join(uploadsDir, filename);
      const writeStream = fs.createWriteStream(filePath);
      
      req.pipe(writeStream);
      
      req.on('end', async () => {
        try {
          const meta = await getMetadata(filePath);
          const dbTrack = {
            uuid: uuidv4(),
            title: meta.title || path.parse(filePath).name,
            artist: meta.artist || 'Unknown Artist',
            album: meta.album || '',
            file_path: filePath,
            format: meta.format || 'unknown',
            cover: meta.cover || undefined,
            duration: meta.duration || 0,
            is_favorite: 0,
            description: meta.description || '',
            lyrics: meta.lyrics || '',
            folder_path: uploadsDir
          };
          dbOps.upsertTrack(dbTrack);
          invalidateServerCache('library');
          res.writeHead(200);
          res.end('Uploaded');
        } catch (e) {
          console.error('Metadata extraction failed', e);
          res.writeHead(500);
          res.end('Processing failed');
        }
      });
      return;
    }

    // 12. Static Assets fallback
    if (url.pathname.startsWith('/src/assets/')) {
      const assetPath = path.join(__dirname, '../../src/renderer', url.pathname);
      if (fs.existsSync(assetPath)) {
        res.writeHead(200, { 'Content-Type': getContentType(assetPath) });
        fs.createReadStream(assetPath).pipe(res);
        return;
      }
    }

    res.writeHead(404);
    res.end('Not found');
  });

  server.on('error', (e: any) => {
    console.error('Server error', e);
    if (e.code === 'EADDRINUSE') {
      console.log(`Port ${port} in use, trying another...`);
      setTimeout(() => {
        if (server) {
          server.close();
          server = null;
          startServer(port + 1);
        }
      }, 1000);
    }
  });

  currentPort = port;
  server.listen(port, () => {
    console.log(`BlackBird TV Server listening on port ${port}`);
  });

  return getServerStatus();
}

export function stopServer(): {
  isRunning: boolean;
  ip: string;
  port: number;
  connectedCount: number;
  clients: ConnectedClient[];
} {
  if (server) {
    server.close();
    server = null;
  }
  activeClients.clear();
  return getServerStatus();
}

export function getServerStatus(): {
  isRunning: boolean;
  ip: string;
  port: number;
  connectedCount: number;
  clients: ConnectedClient[];
} {
  cleanInactiveClients();
  return {
    isRunning: server !== null,
    ip: localIpUrl(),
    port: currentPort,
    connectedCount: activeClients.size,
    clients: Array.from(activeClients.values())
  };
}
