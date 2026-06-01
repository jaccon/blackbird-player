import http from 'http';
import fs from 'fs';
import path from 'path';
import localIpUrl from 'local-ip-url';
import { dbOps } from './database';
import { getMetadata } from './metadata';
import { app } from 'electron';
import { v4 as uuidv4 } from 'uuid';

let server: http.Server | null = null;
let currentPort = 3000;

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
    case '.mp3': return 'audio/mpeg';
    case '.wav': return 'audio/wav';
    case '.flac': return 'audio/flac';
    case '.mp4': return 'video/mp4';
    case '.mkv': return 'video/x-matroska';
    default: return 'application/octet-stream';
  }
}

function serveStatic(res: http.ServerResponse, reqPath: string) {
  if (reqPath === '/web.js') {
    res.writeHead(200, { 'Content-Type': 'application/javascript' });
    res.end(`
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  const trackListEl = document.getElementById('content-view');
  const audioEl = document.createElement('audio');
  document.body.appendChild(audioEl);
  const videoEl = document.getElementById('video-player');
  const videoOverlay = document.getElementById('video-overlay');
  const btnCloseVideo = document.getElementById('btn-close-video');
  
  if (btnCloseVideo) {
    btnCloseVideo.onclick = () => {
      if (videoOverlay) videoOverlay.classList.add('hidden');
      if (videoEl) videoEl.pause();
    };
  }
  
  const coverEl = document.getElementById('player-artwork-img');
  const titleEl = document.getElementById('player-title');
  const artistEl = document.getElementById('player-artist');
  const albumEl = document.getElementById('player-album');
  
  const playPauseBtn = document.getElementById('btn-play-pause');
  const seekSlider = document.getElementById('seek-slider');
  const seekFill = document.getElementById('seek-fill');
  const currentTimeLabel = document.getElementById('current-time');
  const totalTimeLabel = document.getElementById('total-time');

  const btnNext = document.getElementById('btn-next');
  const btnPrev = document.getElementById('btn-prev');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeFill = document.getElementById('volume-fill');
  
  const btnAllSongs = document.getElementById('btn-all-songs');
  const btnAllVideos = document.getElementById('btn-all-videos');
  const btnHome = document.getElementById('btn-home');

  let tracks = [];
  let currentTracks = [];
  let currentTrack = null;
  let isPlaying = false;

  const headerActions = document.querySelector('.header-actions');
  if (headerActions) {
    const uploadBtn = document.createElement('button');
    uploadBtn.className = 'btn-primary';
    uploadBtn.innerHTML = '<i data-lucide="upload"></i> Upload Media';
    uploadBtn.onclick = triggerUpload;
    headerActions.insertBefore(uploadBtn, headerActions.firstChild);
    if (window.lucide) window.lucide.createIcons();
  }

  document.getElementById('btn-import-media')?.remove();
  document.getElementById('btn-import-youtube')?.remove();
  document.getElementById('btn-server')?.remove();
  document.getElementById('btn-setup')?.remove();

  async function loadLibrary() {
    trackListEl.innerHTML = '<div style="padding: 20px;">Loading...</div>';
    try {
      const res = await fetch('/api/library');
      tracks = await res.json();
      currentTracks = tracks;
      renderTracks(currentTracks);
    } catch (e) {
      trackListEl.innerHTML = '<div style="padding: 20px; color: red;">Failed to load library</div>';
    }
  }

  function filterTracks(type) {
    if (type === 'audio') currentTracks = tracks.filter(t => !t.file_path?.match(/\\.(mp4|webm|mkv|mov)$/i));
    else if (type === 'video') currentTracks = tracks.filter(t => t.file_path?.match(/\\.(mp4|webm|mkv|mov)$/i));
    else currentTracks = tracks;
    
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    if (type === 'audio' && btnAllSongs) btnAllSongs.classList.add('active');
    if (type === 'video' && btnAllVideos) btnAllVideos.classList.add('active');
    if (type === 'all' && btnHome) btnHome.classList.add('active');
    
    renderTracks(currentTracks);
  }

  if (btnAllSongs) btnAllSongs.onclick = () => filterTracks('audio');
  if (btnAllVideos) btnAllVideos.onclick = () => filterTracks('video');
  if (btnHome) btnHome.onclick = () => filterTracks('all');

  function renderTracks(tracksToRender = currentTracks) {
    if (tracksToRender.length === 0) {
      trackListEl.innerHTML = '<div style="padding: 40px; text-align: center; color: var(--text-muted);">No tracks found. Upload some media!</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'track-grid';
    
    tracksToRender.forEach((track, index) => {
      const card = document.createElement('div');
      card.className = 'track-card';
      card.onclick = () => playTrack(track);

      const coverContainer = document.createElement('div');
      coverContainer.className = 'track-cover';
      const img = document.createElement('img');
      img.src = '/api/cover/' + track.uuid;
      img.onerror = () => img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
      coverContainer.appendChild(img);

      const info = document.createElement('div');
      info.className = 'track-info';
      
      const title = document.createElement('h3');
      title.className = 'track-title';
      title.textContent = track.title || (track.file_path ? track.file_path.split('/').pop() : 'Unknown');
      
      const artist = document.createElement('p');
      artist.className = 'track-artist';
      artist.textContent = track.artist || 'Unknown Artist';

      info.appendChild(title);
      info.appendChild(artist);
      card.appendChild(coverContainer);
      card.appendChild(info);
      grid.appendChild(card);
    });

    trackListEl.innerHTML = '';
    trackListEl.appendChild(grid);
  }

  function formatTime(seconds) {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return m + ':' + (s < 10 ? '0' : '') + s;
  }

  function playTrack(track) {
    currentTrack = track;
    const isVideo = track.file_path ? track.file_path.toLowerCase().match(/\\.(mp4|webm|mkv|mov)$/) : false;
    const streamUrl = '/api/stream/' + track.uuid;
    
    if (isVideo) {
      audioEl.pause();
      if (videoOverlay) videoOverlay.classList.remove('hidden');
      if (videoEl) { videoEl.src = streamUrl; videoEl.play(); }
    } else {
      if (videoOverlay) videoOverlay.classList.add('hidden');
      if (videoEl) videoEl.pause();
      audioEl.src = streamUrl;
      audioEl.play();
    }
    
    if (coverEl) coverEl.src = '/api/cover/' + track.uuid;
    if (titleEl) titleEl.textContent = track.title || (track.file_path ? track.file_path.split('/').pop() : 'Unknown');
    if (artistEl) artistEl.textContent = track.artist || 'Unknown Artist';
    if (albumEl) albumEl.textContent = track.album || '';
    
    updatePlayPauseUI(true);
  }

  function updatePlayPauseUI(playing) {
    isPlaying = playing;
    if (playPauseBtn) {
      playPauseBtn.innerHTML = playing ? '<i data-lucide="pause"></i>' : '<i data-lucide="play"></i>';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  function togglePlay() {
    if (!currentTrack) return;
    const player = (videoOverlay && !videoOverlay.classList.contains('hidden')) ? videoEl : audioEl;
    if (isPlaying) player.pause();
    else player.play();
  }

  if (playPauseBtn) playPauseBtn.addEventListener('click', togglePlay);

  if (btnNext) btnNext.onclick = () => {
    const idx = currentTracks.findIndex(t => t.uuid === currentTrack?.uuid);
    if (idx >= 0 && idx < currentTracks.length - 1) playTrack(currentTracks[idx + 1]);
  };
  
  if (btnPrev) btnPrev.onclick = () => {
    const idx = currentTracks.findIndex(t => t.uuid === currentTrack?.uuid);
    if (idx > 0) playTrack(currentTracks[idx - 1]);
  };

  if (volumeSlider) {
    volumeSlider.addEventListener('input', (e) => {
      const v = e.target.value / 100;
      audioEl.volume = v;
      if (videoEl) videoEl.volume = v;
      if (volumeFill) volumeFill.style.width = e.target.value + '%';
    });
  }

  audioEl.addEventListener('ended', () => {
    if (btnNext) btnNext.click();
  });
  if (videoEl) {
    videoEl.addEventListener('ended', () => {
      if (btnNext) btnNext.click();
    });
  }

  const onTimeUpdate = (e) => {
    const player = e.target;
    if (currentTimeLabel) currentTimeLabel.textContent = formatTime(player.currentTime);
    if (totalTimeLabel) totalTimeLabel.textContent = formatTime(player.duration);
    if (player.duration && seekFill && seekSlider) {
      const pct = (player.currentTime / player.duration) * 100;
      seekFill.style.width = pct + '%';
      seekSlider.value = player.currentTime;
      seekSlider.max = player.duration;
    }
  };

  audioEl.addEventListener('timeupdate', onTimeUpdate);
  if (videoEl) videoEl.addEventListener('timeupdate', onTimeUpdate);
  const onPlay = () => updatePlayPauseUI(true);
  const onPause = () => updatePlayPauseUI(false);
  audioEl.addEventListener('play', onPlay);
  audioEl.addEventListener('pause', onPause);
  if (videoEl) { videoEl.addEventListener('play', onPlay); videoEl.addEventListener('pause', onPause); }

  if (seekSlider) {
    seekSlider.addEventListener('input', (e) => {
      const time = parseFloat(e.target.value);
      const player = (videoOverlay && !videoOverlay.classList.contains('hidden')) ? videoEl : audioEl;
      player.currentTime = time;
    });
  }

  function triggerUpload() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'audio/*,video/*';
    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const btn = document.querySelector('.header-actions .btn-primary');
      const originalText = btn.innerHTML;
      btn.innerHTML = '<i data-lucide="loader" style="animation: spin 1s linear infinite"></i> Uploading...';
      
      try {
        const res = await fetch('/api/upload?filename=' + encodeURIComponent(file.name), {
          method: 'POST',
          headers: { 'Content-Type': 'application/octet-stream' },
          body: file
        });
        
        if (res.ok) {
          btn.innerHTML = '<i data-lucide="check"></i> Success!';
          setTimeout(() => {
            btn.innerHTML = originalText;
            if (window.lucide) window.lucide.createIcons();
            loadLibrary();
          }, 2000);
        } else {
          alert('Upload failed');
          btn.innerHTML = originalText;
        }
      } catch (err) {
        alert('Upload error: ' + err.message);
        btn.innerHTML = originalText;
      }
    };
    input.click();
  }

  loadLibrary();
});
    `);
    return;
  }

  if (reqPath.startsWith('/src/assets/')) {
    const assetPath = path.join(__dirname, '../../src/renderer', reqPath);
    if (fs.existsSync(assetPath)) {
      res.writeHead(200, { 'Content-Type': getContentType(assetPath) });
      fs.createReadStream(assetPath).pipe(res);
    } else {
      res.writeHead(404); res.end();
    }
    return;
  }

  if (reqPath === '/' || reqPath === '/index.html') {
    const htmlPath = path.join(__dirname, '../../src/renderer/index.html');
    if (fs.existsSync(htmlPath)) {
      let html = fs.readFileSync(htmlPath, 'utf8');
      html = html.replace('<script type="module" src="./src/renderer.ts"></script>', '<script src="/web.js"></script>');
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(html);
    } else {
      res.writeHead(404);
      res.end('Not found');
    }
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
}

function serveMedia(req: http.IncomingMessage, res: http.ServerResponse, filePath: string) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('File not found');
    return;
  }

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const partialstart = parts[0];
    const partialend = parts[1];

    const start = parseInt(partialstart, 10);
    const end = partialend ? parseInt(partialend, 10) : total - 1;
    const chunksize = (end - start) + 1;
    
    const file = fs.createReadStream(filePath, {start: start, end: end});
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

export function startServer(port: number = 3000): { isRunning: boolean; ip: string; port: number } {
  if (server) {
    return getServerStatus();
  }

  server = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host}`);
    
    if (url.pathname === '/api/library') {
      const tracks = dbOps.getAllTracks();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tracks));
      return;
    }

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

    if (url.pathname.startsWith('/api/stream/')) {
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

    if (url.pathname.startsWith('/api/cover/')) {
      const uuid = url.pathname.split('/')[3];
      const coverPath = dbOps.getTrackCoverPath(uuid);
      if (coverPath && fs.existsSync(coverPath)) {
        res.writeHead(200, { 'Content-Type': getContentType(coverPath) });
        fs.createReadStream(coverPath).pipe(res);
      } else {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#2a2a2a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#666" font-family="sans-serif" font-size="48">🎵</text></svg>`;
        res.writeHead(200, { 'Content-Type': 'image/svg+xml' });
        res.end(svg);
      }
      return;
    }

    serveStatic(res, url.pathname);
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
    console.log(`Server listening on port ${port}`);
  });

  return getServerStatus();
}

export function stopServer(): { isRunning: boolean; ip: string; port: number } {
  if (server) {
    server.close();
    server = null;
  }
  return getServerStatus();
}

export function getServerStatus(): { isRunning: boolean; ip: string; port: number } {
  return {
    isRunning: server !== null,
    ip: localIpUrl(),
    port: currentPort
  };
}
