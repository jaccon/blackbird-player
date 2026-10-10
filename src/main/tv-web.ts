export function getTvWebHtml(serverIp: string, serverPort: number): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>BlackBird TV • Central de Mídia & IPTV</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&family=Rajdhani:wght@500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/hls.js@latest"></script>
  <style>
    :root {
      --bg-dark: #08090d;
      --bg-card: rgba(22, 25, 38, 0.75);
      --bg-card-hover: rgba(35, 40, 60, 0.9);
      --accent: #3b82f6;
      --accent-glow: rgba(59, 130, 246, 0.45);
      --accent-purple: #8b5cf6;
      --text-main: #ffffff;
      --text-muted: #94a3b8;
      --border: rgba(255, 255, 255, 0.08);
      --border-focus: #3b82f6;
      --radius-lg: 16px;
      --radius-md: 10px;
      --font-family: 'Outfit', sans-serif;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      -webkit-font-smoothing: antialiased;
    }

    body {
      font-family: var(--font-family);
      background-color: var(--bg-dark);
      background-image: 
        radial-gradient(circle at 10% 20%, rgba(59, 130, 246, 0.12) 0%, transparent 40%),
        radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 40%);
      background-attachment: fixed;
      color: var(--text-main);
      min-height: 100vh;
      overflow-x: hidden;
      display: flex;
      flex-direction: column;
    }

    /* TV Remote & Keyboard Focus Ring */
    :focus-visible, .tv-focused {
      outline: 3px solid var(--border-focus) !important;
      outline-offset: 3px !important;
      box-shadow: 0 0 20px var(--accent-glow) !important;
      transform: scale(1.03) !important;
      z-index: 20 !important;
      transition: transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), outline 0.15s ease !important;
    }

    /* Top Navigation Header */
    header.tv-header {
      position: sticky;
      top: 0;
      z-index: 100;
      background: rgba(8, 9, 13, 0.85);
      backdrop-filter: blur(20px);
      border-bottom: 1px solid var(--border);
      padding: 14px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 20px;
    }

    .brand-section {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px var(--accent-glow);
    }

    .brand-logo svg {
      width: 24px;
      height: 24px;
      fill: #fff;
    }

    .brand-title {
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.5px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .tv-badge {
      background: linear-gradient(135deg, #3b82f6, #6366f1);
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      text-transform: uppercase;
      padding: 2px 8px;
      border-radius: 6px;
      letter-spacing: 0.5px;
    }

    .nav-tabs {
      display: flex;
      gap: 6px;
      background: rgba(255, 255, 255, 0.05);
      padding: 5px;
      border-radius: 12px;
      border: 1px solid var(--border);
      flex-wrap: wrap;
    }

    .nav-tab {
      background: transparent;
      border: none;
      color: var(--text-muted);
      padding: 8px 16px;
      border-radius: 8px;
      font-family: var(--font-family);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .nav-tab:hover {
      color: var(--text-main);
      background: rgba(255, 255, 255, 0.08);
    }

    .nav-tab.active {
      background: var(--accent);
      color: #fff;
      box-shadow: 0 4px 12px var(--accent-glow);
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .search-box {
      position: relative;
      display: flex;
      align-items: center;
    }

    .search-box input {
      background: rgba(255, 255, 255, 0.06);
      border: 1px solid var(--border);
      border-radius: 10px;
      color: #fff;
      font-family: var(--font-family);
      font-size: 14px;
      padding: 8px 14px 8px 36px;
      width: 220px;
      outline: none;
      transition: all 0.2s;
    }

    .search-box input:focus {
      background: rgba(255, 255, 255, 0.1);
      border-color: var(--accent);
      width: 260px;
    }

    .search-box svg {
      position: absolute;
      left: 10px;
      width: 16px;
      height: 16px;
      fill: var(--text-muted);
      pointer-events: none;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid rgba(16, 185, 129, 0.3);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 600;
      color: #34d399;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10b981;
      box-shadow: 0 0 8px #10b981;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.3); opacity: 0.7; }
    }

    /* Main Container */
    main.tv-content {
      flex: 1;
      padding: 24px 28px 120px;
      max-width: 1600px;
      width: 100%;
      margin: 0 auto;
    }

    /* Sub-header & Category Pills */
    .controls-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      margin-bottom: 20px;
      flex-wrap: wrap;
    }

    .category-pills {
      display: flex;
      gap: 8px;
      overflow-x: auto;
      padding-bottom: 6px;
      scrollbar-width: thin;
    }

    .category-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid var(--border);
      color: var(--text-muted);
      padding: 6px 16px;
      border-radius: 20px;
      font-family: var(--font-family);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
    }

    .category-pill:hover, .category-pill.active {
      background: rgba(59, 130, 246, 0.2);
      border-color: var(--accent);
      color: #fff;
    }

    /* Channel Grid */
    .channel-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 16px;
    }

    .channel-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      cursor: pointer;
      position: relative;
      transition: transform 0.2s, background 0.2s, border-color 0.2s, box-shadow 0.2s;
      overflow: hidden;
      min-height: 160px;
      justify-content: center;
    }

    .channel-card:hover {
      background: var(--bg-card-hover);
      border-color: rgba(255, 255, 255, 0.2);
      transform: translateY(-4px);
    }

    .channel-card.playing {
      border-color: var(--accent);
      background: rgba(59, 130, 246, 0.15);
      box-shadow: 0 0 20px var(--accent-glow);
    }

    .channel-logo-wrap {
      width: 76px;
      height: 76px;
      border-radius: 12px;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 12px;
      overflow: hidden;
      border: 1px solid rgba(255, 255, 255, 0.05);
      position: relative;
    }

    .channel-logo-wrap img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }

    .channel-logo-placeholder {
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .channel-name {
      font-size: 15px;
      font-weight: 700;
      color: #fff;
      margin-bottom: 4px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      line-height: 1.25;
    }

    .channel-group {
      font-size: 12px;
      color: var(--text-muted);
      background: rgba(255, 255, 255, 0.06);
      padding: 2px 8px;
      border-radius: 6px;
    }

    .channel-badge-live {
      position: absolute;
      top: 10px;
      right: 10px;
      background: #ef4444;
      color: #fff;
      font-size: 9px;
      font-weight: 800;
      padding: 2px 6px;
      border-radius: 4px;
      letter-spacing: 0.5px;
      display: none;
    }

    .channel-card.playing .channel-badge-live {
      display: block;
      animation: pulse 1.5s infinite;
    }

    /* Media List / Grid (Music & Video & Photos) */
    .media-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: 16px;
    }

    .media-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 12px;
      cursor: pointer;
      transition: all 0.2s;
      display: flex;
      flex-direction: column;
    }

    .media-card:hover {
      background: var(--bg-card-hover);
      transform: translateY(-4px);
    }

    .media-card.playing {
      border-color: var(--accent);
      box-shadow: 0 0 16px var(--accent-glow);
    }

    .media-cover {
      width: 100%;
      aspect-ratio: 1;
      border-radius: var(--radius-md);
      background: rgba(0, 0, 0, 0.4);
      margin-bottom: 10px;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
    }

    .media-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform 0.4s ease;
    }

    .media-card:hover .media-cover img {
      transform: scale(1.05);
    }

    .media-cover-placeholder {
      font-size: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 100%;
      height: 100%;
    }

    .media-title {
      font-size: 14px;
      font-weight: 600;
      color: #fff;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-bottom: 2px;
    }

    .media-artist {
      font-size: 12px;
      color: var(--text-muted);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    /* Connect Info Section (Smart TV guide) */
    .connect-container {
      max-width: 900px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .connect-card {
      background: var(--bg-card);
      border: 1px solid var(--border);
      border-radius: var(--radius-lg);
      padding: 28px;
      backdrop-filter: blur(16px);
    }

    .connect-card h2 {
      font-size: 20px;
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .connect-card p {
      color: var(--text-muted);
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 20px;
    }

    .url-display-box {
      background: rgba(0, 0, 0, 0.5);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      margin-bottom: 12px;
    }

    .url-text {
      font-family: monospace;
      font-size: 16px;
      color: #38bdf8;
      word-break: break-all;
    }

    .btn-copy {
      background: var(--accent);
      border: none;
      color: #fff;
      padding: 8px 16px;
      border-radius: 8px;
      font-family: var(--font-family);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      white-space: nowrap;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .btn-copy:hover {
      background: #2563eb;
    }

    .guide-steps {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }

    .guide-step {
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 16px;
    }

    .guide-step-num {
      font-family: 'Rajdhani', sans-serif;
      font-size: 24px;
      font-weight: 700;
      color: var(--accent);
      margin-bottom: 6px;
    }

    .guide-step h4 {
      font-size: 15px;
      margin-bottom: 4px;
    }

    .guide-step p {
      font-size: 13px;
      margin-bottom: 0;
    }

    /* Video Player Overlay (Full Screen / OSD for IPTV & Video) */
    .video-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: #000;
      z-index: 1000;
      display: flex;
      align-items: center;
      justify-content: center;
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .video-overlay.active {
      visibility: visible;
      opacity: 1;
    }

    .video-overlay video {
      width: 100%;
      height: 100%;
      object-fit: contain;
      background: #000;
    }

    /* OSD Top Bar */
    .player-osd-top {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      padding: 24px 32px;
      background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%);
      display: flex;
      justify-content: space-between;
      align-items: center;
      opacity: 1;
      transition: opacity 0.4s ease;
      z-index: 10;
    }

    .player-osd-info {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .osd-logo {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: rgba(255,255,255,0.1);
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
    }

    .osd-logo img {
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
    }

    .osd-title-group h3 {
      font-size: 20px;
      font-weight: 700;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .osd-live-tag {
      background: #ef4444;
      color: #fff;
      font-size: 11px;
      font-weight: 800;
      padding: 2px 8px;
      border-radius: 4px;
    }

    .osd-category {
      font-size: 13px;
      color: var(--text-muted);
    }

    .player-osd-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .btn-osd {
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #fff;
      padding: 10px 16px;
      border-radius: 10px;
      font-family: var(--font-family);
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 8px;
      backdrop-filter: blur(10px);
      transition: all 0.2s;
    }

    .btn-osd:hover {
      background: rgba(255, 255, 255, 0.3);
    }

    .btn-osd.active-proxy {
      background: #10b981;
      border-color: #10b981;
    }

    /* OSD Bottom Bar (Channel Switcher & Remote Bar) */
    .player-osd-bottom {
      position: absolute;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 24px 32px;
      background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%);
      display: flex;
      justify-content: space-between;
      align-items: center;
      opacity: 1;
      transition: opacity 0.4s ease;
      z-index: 10;
    }

    .osd-channels-quick {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .osd-remote-hint {
      color: var(--text-muted);
      font-size: 13px;
      display: flex;
      gap: 16px;
    }

    .osd-remote-hint kbd {
      background: rgba(255, 255, 255, 0.15);
      padding: 2px 6px;
      border-radius: 4px;
      color: #fff;
      font-family: inherit;
    }

    .player-error-banner {
      position: absolute;
      background: rgba(220, 38, 38, 0.9);
      color: #fff;
      padding: 14px 24px;
      border-radius: 12px;
      font-size: 15px;
      font-weight: 600;
      display: none;
      align-items: center;
      gap: 12px;
      box-shadow: 0 8px 24px rgba(0,0,0,0.5);
      z-index: 20;
    }

    /* Photo Lightbox Overlay */
    .photo-lightbox-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.95);
      z-index: 1050;
      display: flex;
      align-items: center;
      justify-content: center;
      backdrop-filter: blur(16px);
      visibility: hidden;
      opacity: 0;
      transition: opacity 0.3s ease, visibility 0.3s ease;
    }

    .photo-lightbox-overlay.active {
      visibility: visible;
      opacity: 1;
    }

    .photo-lightbox-img {
      max-width: 92vw;
      max-height: 85vh;
      object-fit: contain;
      border-radius: 10px;
      box-shadow: 0 0 50px rgba(0, 0, 0, 0.8);
      transition: transform 0.3s ease;
    }

    /* Persistent Bottom Audio Player Bar */
    .audio-player-bar {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: rgba(14, 16, 25, 0.95);
      backdrop-filter: blur(24px);
      border-top: 1px solid var(--border);
      padding: 12px 28px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      z-index: 90;
      transform: translateY(100%);
      transition: transform 0.3s ease;
    }

    .audio-player-bar.active {
      transform: translateY(0);
    }

    .audio-track-info {
      display: flex;
      align-items: center;
      gap: 14px;
      min-width: 200px;
    }

    .audio-cover {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      background: #000;
      overflow: hidden;
      position: relative;
    }

    .audio-cover img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .audio-details h4 {
      font-size: 14px;
      color: #fff;
      margin-bottom: 2px;
    }

    .audio-details p {
      font-size: 12px;
      color: var(--text-muted);
    }

    .audio-controls {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      flex: 1;
      max-width: 500px;
      margin: 0 20px;
    }

    .audio-btns {
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .btn-circle {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.1);
      border: none;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-circle:hover {
      background: rgba(255, 255, 255, 0.2);
    }

    .btn-circle.play-btn {
      width: 44px;
      height: 44px;
      background: var(--accent);
      box-shadow: 0 4px 12px var(--accent-glow);
    }

    .audio-timeline {
      display: flex;
      align-items: center;
      gap: 10px;
      width: 100%;
    }

    .timeline-slider {
      flex: 1;
      height: 4px;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 2px;
      outline: none;
      -webkit-appearance: none;
      cursor: pointer;
    }

    .timeline-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 12px;
      height: 12px;
      border-radius: 50%;
      background: var(--accent);
      cursor: pointer;
    }

    .time-label {
      font-size: 11px;
      color: var(--text-muted);
      font-variant-numeric: tabular-nums;
      width: 36px;
    }

    /* Mobile / Small TV Responsive */
    @media (max-width: 768px) {
      header.tv-header {
        padding: 12px 16px;
        flex-direction: column;
        align-items: stretch;
      }
      .brand-section {
        justify-content: space-between;
      }
      .nav-tabs {
        overflow-x: auto;
      }
      .search-box input {
        width: 100%;
      }
      main.tv-content {
        padding: 16px 16px 120px;
      }
      .channel-grid {
        grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      }
    }
  </style>
</head>
<body>

  <!-- Top Navigation Header -->
  <header class="tv-header">
    <div class="brand-section">
      <div class="brand-logo">
        <svg viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
      </div>
      <div class="brand-title">
        BlackBird <span class="tv-badge">TV SERVER</span>
      </div>
    </div>

    <!-- Navigation Tabs -->
    <nav class="nav-tabs" id="tv-tabs" role="tablist">
      <button class="nav-tab active" id="tab-btn-iptv" onclick="switchTab('iptv')">
        📺 Canais IPTV
      </button>
      <button class="nav-tab" id="tab-btn-music" onclick="switchTab('music')">
        🎵 Músicas
      </button>
      <button class="nav-tab" id="tab-btn-video" onclick="switchTab('video')">
        🎬 Vídeos
      </button>
      <button class="nav-tab" id="tab-btn-photos" onclick="switchTab('photos')">
        🖼️ Fotos
      </button>
      <button class="nav-tab" id="tab-btn-connect" onclick="switchTab('connect')">
        📡 Conectar Smart TV
      </button>
    </nav>

    <!-- Header Right -->
    <div class="header-right">
      <div class="search-box">
        <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
        <input type="text" id="tv-search" placeholder="Buscar canal, música ou foto..." oninput="handleSearch(this.value)">
      </div>

      <div class="status-badge" id="tv-status-badge" title="Servidor BlackBird Ativo">
        <div class="status-dot"></div>
        <span id="tv-connected-label">Online</span>
      </div>
    </div>
  </header>

  <!-- Main Content Container -->
  <main class="tv-content">
    
    <!-- IPTV SECTION -->
    <section id="section-iptv">
      <div class="controls-row">
        <div class="category-pills" id="iptv-categories">
          <!-- Rendered dynamically -->
        </div>
        <div id="iptv-counter" style="color: var(--text-muted); font-size: 13px;">Carregando canais...</div>
      </div>

      <div class="channel-grid" id="channel-grid">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- MUSIC SECTION -->
    <section id="section-music" style="display: none;">
      <div class="controls-row">
        <h2 style="font-size: 20px;">Biblioteca de Músicas</h2>
        <div id="music-counter" style="color: var(--text-muted); font-size: 13px;">0 faixas</div>
      </div>
      <div class="media-grid" id="music-grid">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- VIDEO SECTION -->
    <section id="section-video" style="display: none;">
      <div class="controls-row">
        <h2 style="font-size: 20px;">Vídeos Locais</h2>
        <div id="video-counter" style="color: var(--text-muted); font-size: 13px;">0 vídeos</div>
      </div>
      <div class="media-grid" id="video-grid">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- PHOTOS SECTION -->
    <section id="section-photos" style="display: none;">
      <div class="controls-row">
        <div>
          <h2 style="font-size: 20px; font-weight: 700; display: flex; align-items: center; gap: 8px;">
            Galeria de Fotos na Rede
          </h2>
          <div id="photos-counter" style="color: var(--text-muted); font-size: 13px; margin-top: 2px;">0 fotos</div>
        </div>
        <div>
          <button class="btn-copy" id="btn-start-slideshow" onclick="startSlideshow()" style="background: rgba(255,255,255,0.08); border: 1px solid var(--border);">
            ▶ Iniciar Slideshow na TV
          </button>
        </div>
      </div>
      <div class="media-grid" id="photos-grid" style="grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));">
        <!-- Rendered dynamically -->
      </div>
    </section>

    <!-- CONNECT SMART TV SECTION -->
    <section id="section-connect" style="display: none;">
      <div class="connect-container">
        
        <div class="connect-card">
          <h2>📺 Conectar Aplicativos IPTV na sua Smart TV</h2>
          <p>
            Você pode carregar todos os canais do BlackBird diretamente no aplicativo IPTV da sua TV (como <strong>TiviMate</strong>, <strong>IPTV Smarters</strong>, <strong>Smart IPTV</strong>, <strong>SS IPTV</strong>, <strong>Kodi</strong> ou <strong>VLC</strong>).
          </p>
          <div class="url-display-box">
            <span class="url-text" id="iptv-m3u-url">http://${serverIp}:${serverPort}/iptv.m3u</span>
            <button class="btn-copy" onclick="copyText('iptv-m3u-url', this)">Copiar URL M3U</button>
          </div>
          <p style="font-size: 12px; color: #64748b; margin-bottom: 0;">
            No app da Smart TV, escolha "Adicionar Playlist por URL" (M3U) e cole o endereço acima.
          </p>
        </div>

        <div class="connect-card">
          <h2>🌐 Acessar pelo Navegador da Smart TV</h2>
          <p>
            Abra o navegador de internet da sua TV (Samsung Tizen, LG webOS, Android TV) ou do seu smartphone e digite o endereço local:
          </p>
          <div class="url-display-box">
            <span class="url-text" id="web-tv-url">http://${serverIp}:${serverPort}</span>
            <button class="btn-copy" onclick="copyText('web-tv-url', this)">Copiar Link</button>
          </div>
          
          <div class="guide-steps">
            <div class="guide-step">
              <div class="guide-step-num">01</div>
              <h4>Mesma Rede Wi-Fi</h4>
              <p>Certifique-se de que a TV está conectada na mesma rede do BlackBird.</p>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">02</div>
              <h4>Navegação com Controle</h4>
              <p>Use as setas do controle da TV para alternar entre canais, músicas e fotos.</p>
            </div>
            <div class="guide-step">
              <div class="guide-step-num">03</div>
              <h4>Slideshow na TV</h4>
              <p>Na aba Fotos, inicie o Slideshow para transformar sua TV em porta-retrato digital.</p>
            </div>
          </div>
        </div>

      </div>
    </section>

  </main>

  <!-- VIDEO OVERLAY PLAYER (IPTV & LOCAL VIDEO) -->
  <div class="video-overlay" id="video-overlay">
    <video id="tv-video-player" playsinline controls></video>

    <!-- Top OSD -->
    <div class="player-osd-top" id="osd-top">
      <div class="player-osd-info">
        <div class="osd-logo" id="osd-logo">📺</div>
        <div class="osd-title-group">
          <h3 id="osd-title">Canal <span class="osd-live-tag">AO VIVO</span></h3>
          <span class="osd-category" id="osd-category">Geral</span>
        </div>
      </div>
      <div class="player-osd-actions">
        <button class="btn-osd" id="btn-toggle-proxy" onclick="toggleProxyStream()" title="Usar Proxy caso o stream direto falhe no navegador">
          🔄 Modo Proxy: <span id="proxy-status-text">Desligado</span>
        </button>
        <button class="btn-osd" onclick="toggleFullscreen()">⛶ Tela Cheia</button>
        <button class="btn-osd" onclick="closeVideoPlayer()" style="background: rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.6);">✕ Fechar (Esc)</button>
      </div>
    </div>

    <!-- Bottom OSD -->
    <div class="player-osd-bottom" id="osd-bottom">
      <div class="osd-channels-quick">
        <button class="btn-osd" onclick="prevChannel()">◀ Canal Anterior ([)</button>
        <button class="btn-osd" onclick="nextChannel()">Próximo Canal (]) ▶</button>
      </div>
      <div class="osd-remote-hint">
        <span>Controle: <kbd>▲</kbd> <kbd>▼</kbd> Troca canal</span>
        <span><kbd>Espaço</kbd> Pause/Play</span>
        <span><kbd>Esc</kbd> / <kbd>Voltar</kbd> Sair</span>
      </div>
    </div>

    <!-- Error Banner -->
    <div class="player-error-banner" id="player-error">
      <span>⚠️ Canal não carregou. Tentando modo Proxy automático...</span>
    </div>
  </div>

  <!-- PHOTO LIGHTBOX OVERLAY (FULLSCREEN & SLIDESHOW) -->
  <div class="photo-lightbox-overlay" id="photo-lightbox">
    <img id="lightbox-img" class="photo-lightbox-img" src="" alt="Photo">
    
    <!-- Top Bar -->
    <div style="position: absolute; top: 0; left: 0; right: 0; padding: 24px 32px; background: linear-gradient(180deg, rgba(0,0,0,0.85) 0%, transparent 100%); display: flex; justify-content: space-between; align-items: center; z-index: 10;">
      <div>
        <h3 id="lightbox-title" style="font-size: 20px; font-weight: 700; color: #fff;">Foto</h3>
        <span id="lightbox-counter" style="font-size: 13px; color: var(--text-muted);">Foto 1 de 1</span>
      </div>
      <div style="display: flex; gap: 12px; align-items: center;">
        <button class="btn-osd" id="btn-slideshow-toggle" onclick="toggleSlideshow()">▶ Iniciar Slideshow</button>
        <button class="btn-osd" onclick="closePhotoLightbox()" style="background: rgba(239, 68, 68, 0.4); border-color: rgba(239, 68, 68, 0.6);">✕ Fechar (Esc)</button>
      </div>
    </div>

    <!-- Bottom Nav / Remote Hints -->
    <div style="position: absolute; bottom: 0; left: 0; right: 0; padding: 24px 32px; background: linear-gradient(0deg, rgba(0,0,0,0.85) 0%, transparent 100%); display: flex; justify-content: space-between; align-items: center; z-index: 10;">
      <div style="display: flex; gap: 10px;">
        <button class="btn-osd" onclick="prevPhoto()">◀ Anterior (◀)</button>
        <button class="btn-osd" onclick="nextPhoto()">Próxima (▶) ▶</button>
      </div>
      <div class="osd-remote-hint">
        <span>Controle: <kbd>◀</kbd> <kbd>▶</kbd> Troca foto</span>
        <span><kbd>Espaço</kbd> Slideshow</span>
        <span><kbd>Esc</kbd> Fechar</span>
      </div>
    </div>
  </div>

  <!-- BOTTOM PERSISTENT AUDIO PLAYER -->
  <div class="audio-player-bar" id="audio-bar">
    <div class="audio-track-info">
      <div class="audio-cover" id="audio-cover-wrap">
        <img id="audio-cover-img" src="" alt="Cover" style="display:none;" onerror="this.style.display='none';">
        <div class="media-cover-placeholder" id="audio-placeholder">🎵</div>
      </div>
      <div class="audio-details">
        <h4 id="audio-title">Faixa</h4>
        <p id="audio-artist">Artista</p>
      </div>
    </div>

    <div class="audio-controls">
      <div class="audio-btns">
        <button class="btn-circle" onclick="prevTrack()">⏮</button>
        <button class="btn-circle play-btn" id="audio-play-btn" onclick="toggleAudioPlay()">▶</button>
        <button class="btn-circle" onclick="nextTrack()">⏭</button>
      </div>
      <div class="audio-timeline">
        <span class="time-label" id="audio-current-time">0:00</span>
        <input type="range" class="timeline-slider" id="audio-timeline-slider" min="0" max="100" value="0">
        <span class="time-label" id="audio-total-time">0:00</span>
      </div>
    </div>

    <div style="min-width: 140px; display: flex; justify-content: flex-end; align-items: center; gap: 8px;">
      <span style="font-size: 14px;">🔊</span>
      <input type="range" id="audio-volume" min="0" max="100" value="90" style="width: 80px; accent-color: var(--accent);">
    </div>
  </div>

  <audio id="tv-audio-player"></audio>

  <script>
    // Escape HTML helper
    function escapeHtml(str) {
      if (str === null || str === undefined) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    // App State
    let currentTab = 'iptv';
    let channels = [];
    let filteredChannels = [];
    let currentCategory = '';
    let currentChannelIndex = -1;
    let currentHls = null;
    let useProxy = false;

    let libraryTracks = [];
    let audioTracks = [];
    let videoTracks = [];
    let photoTracks = [];
    let currentTrackIndex = -1;
    let isAudioPlaying = false;

    let currentPhotoIndex = -1;
    let slideshowTimer = null;

    const videoOverlay = document.getElementById('video-overlay');
    const videoPlayer = document.getElementById('tv-video-player');
    const audioPlayer = document.getElementById('tv-audio-player');
    const audioBar = document.getElementById('audio-bar');
    const playerError = document.getElementById('player-error');
    const photoLightbox = document.getElementById('photo-lightbox');
    const lightboxImg = document.getElementById('lightbox-img');

    // Retrieve or create persistent Client ID
    let clientId = 'client_' + Math.random().toString(36).substring(2, 10);
    try {
      const stored = localStorage.getItem('bb_tv_client_id');
      if (stored) clientId = stored;
      else localStorage.setItem('bb_tv_client_id', clientId);
    } catch (e) {}

    // Determine device hint
    function detectDevice() {
      const ua = navigator.userAgent.toLowerCase();
      if (ua.includes('tizen')) return 'Smart TV (Samsung)';
      if (ua.includes('webos')) return 'Smart TV (LG)';
      if (ua.includes('android tv') || ua.includes('googletv')) return 'Android TV';
      if (ua.includes('smart-tv') || ua.includes('smarttv') || ua.includes('crkey')) return 'Smart TV';
      if (/iphone|ipad|ipod/.test(ua)) return 'Apple Mobile';
      if (/android/.test(ua)) return 'Android Mobile';
      return 'Web Browser';
    }

    // Send Heartbeat every 5 seconds
    async function sendHeartbeat() {
      try {
        const device = encodeURIComponent(detectDevice());
        const res = await fetch('/api/heartbeat?clientId=' + clientId + '&device=' + device);
        if (res.ok) {
          const data = await res.json();
          const label = document.getElementById('tv-connected-label');
          if (label && data.connectedCount !== undefined) {
            label.textContent = 'Online (' + data.connectedCount + ')';
          }
        }
      } catch (e) {}
    }
    setInterval(sendHeartbeat, 5000);
    sendHeartbeat();

    // Notify server on disconnect
    window.addEventListener('beforeunload', () => {
      try {
        navigator.sendBeacon('/api/disconnect?clientId=' + clientId);
      } catch (e) {}
    });

    // Helper functions for media types
    function getFileExtension(item) {
      if (!item) return '';
      if (item.format) return item.format.toLowerCase();
      if (item.file_path) {
        const parts = item.file_path.split('.');
        return parts.length > 1 ? parts.pop().toLowerCase() : '';
      }
      return '';
    }

    function isPhoto(t) {
      if (t.mimetype && t.mimetype.startsWith('image/')) return true;
      if (t.kind && t.kind.toLowerCase() === 'photo') return true;
      if (t.artist === 'Photo' || t.album === 'Photos') return true;
      const ext = getFileExtension(t);
      return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'avif', 'svg'].includes(ext);
    }

    function isVideo(t) {
      if (t.mimetype && t.mimetype.startsWith('video/')) return true;
      if (t.kind && t.kind.toLowerCase() === 'video') return true;
      const ext = getFileExtension(t);
      return ['mp4', 'm4v', 'webm', 'mkv', 'mov', 'avi'].includes(ext);
    }

    function isAudio(t) {
      return !isPhoto(t) && !isVideo(t);
    }

    // Switch Tabs
    function switchTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.nav-tab').forEach(b => b.classList.remove('active'));
      document.getElementById('tab-btn-' + tab)?.classList.add('active');

      document.getElementById('section-iptv').style.display = tab === 'iptv' ? 'block' : 'none';
      document.getElementById('section-music').style.display = tab === 'music' ? 'block' : 'none';
      document.getElementById('section-video').style.display = tab === 'video' ? 'block' : 'none';
      document.getElementById('section-photos').style.display = tab === 'photos' ? 'block' : 'none';
      document.getElementById('section-connect').style.display = tab === 'connect' ? 'block' : 'none';
    }

    // Load IPTV Channels
    async function loadIptv() {
      const counter = document.getElementById('iptv-counter');
      if (counter) counter.textContent = 'Carregando canais...';
      try {
        const res = await fetch('/api/iptv?clientId=' + clientId);
        if (!res.ok) throw new Error('HTTP ' + res.status);
        channels = await res.json();
        if (counter) counter.textContent = channels.length + ' canais disponíveis';
        extractCategories();
        filterChannels();
      } catch (err) {
        if (counter) counter.textContent = 'Erro ao carregar canais.';
        console.error('Failed to load IPTV channels:', err);
      }
    }

    // Extract categories & setup delegation
    function extractCategories() {
      const catContainer = document.getElementById('iptv-categories');
      if (!catContainer) return;

      const cats = new Set();
      channels.forEach(c => {
        if (c && c.group_title && typeof c.group_title === 'string' && c.group_title.trim()) {
          cats.add(c.group_title.trim());
        }
      });

      let html = '<button class="category-pill ' + (currentCategory === '' ? 'active' : '') + '" data-category="">Todos (' + channels.length + ')</button>';
      html += '<button class="category-pill ' + (currentCategory === 'FAV' ? 'active' : '') + '" data-category="FAV">⭐ Favoritos</button>';
      
      Array.from(cats).sort().forEach(cat => {
        const count = channels.filter(c => c && c.group_title === cat).length;
        const isActive = currentCategory === cat ? 'active' : '';
        html += '<button class="category-pill ' + isActive + '" data-category="' + escapeHtml(cat) + '">' + escapeHtml(cat) + ' (' + count + ')</button>';
      });

      catContainer.innerHTML = html;
    }

    // Event delegation for category clicks
    document.getElementById('iptv-categories')?.addEventListener('click', (e) => {
      const btn = e.target.closest('.category-pill');
      if (btn) {
        currentCategory = btn.getAttribute('data-category') || '';
        extractCategories();
        filterChannels();
      }
    });

    function filterChannels() {
      const query = (document.getElementById('tv-search')?.value || '').toLowerCase().trim();
      filteredChannels = channels.filter(c => {
        const matchesCategory = 
          !currentCategory ? true :
          currentCategory === 'FAV' ? (c.is_favorite === 1) :
          c.group_title === currentCategory;
        
        const matchesQuery = !query || 
          (c.name && c.name.toLowerCase().includes(query)) ||
          (c.group_title && c.group_title.toLowerCase().includes(query));

        return matchesCategory && matchesQuery;
      });

      renderChannelGrid();
    }

    function renderChannelGrid() {
      const grid = document.getElementById('channel-grid');
      if (!grid) return;
      if (filteredChannels.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted); font-size: 16px;">Nenhum canal encontrado.</div>';
        return;
      }

      grid.innerHTML = filteredChannels.map((ch, idx) => {
        const isCurrentPlaying = currentChannelIndex >= 0 && filteredChannels[currentChannelIndex]?.id === ch.id;
        const hasLogo = Boolean(ch.logo_url && typeof ch.logo_url === 'string' && ch.logo_url.trim().length > 0);
        const safeName = escapeHtml(ch.name || 'Canal');
        const safeGroup = escapeHtml(ch.group_title || 'Geral');

        return \`
          <div class="channel-card \${isCurrentPlaying ? 'playing' : ''}" 
               tabindex="0" 
               data-channel-idx="\${idx}">
            <span class="channel-badge-live">AO VIVO</span>
            <div class="channel-logo-wrap">
              \${hasLogo ? \`<img src="\${encodeURI(ch.logo_url)}" alt="\${safeName}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">\` : ''}
              <span class="channel-logo-placeholder" style="\${hasLogo ? 'display: none;' : 'display: flex;'}">📺</span>
            </div>
            <div class="channel-name">\${safeName}</div>
            <div class="channel-group">\${safeGroup}</div>
          </div>
        \`;
      }).join('');
    }

    // Delegation for channel cards
    document.getElementById('channel-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.channel-card');
      if (card) {
        const idx = parseInt(card.getAttribute('data-channel-idx') || '-1', 10);
        if (idx >= 0) playChannelIndex(idx);
      }
    });

    document.getElementById('channel-grid')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.channel-card');
        if (card) {
          const idx = parseInt(card.getAttribute('data-channel-idx') || '-1', 10);
          if (idx >= 0) playChannelIndex(idx);
        }
      }
    });

    // Play IPTV Channel
    function playChannelIndex(idx) {
      if (idx < 0 || idx >= filteredChannels.length) return;
      currentChannelIndex = idx;
      const ch = filteredChannels[idx];
      renderChannelGrid();

      // Pause audio if playing
      audioPlayer.pause();
      isAudioPlaying = false;
      audioBar.classList.remove('active');

      // Update OSD
      const osdTitle = document.getElementById('osd-title');
      if (osdTitle) osdTitle.innerHTML = escapeHtml(ch.name || 'Canal') + ' <span class="osd-live-tag">AO VIVO</span>';
      const osdCat = document.getElementById('osd-category');
      if (osdCat) osdCat.textContent = ch.group_title || 'IPTV';
      
      const osdLogo = document.getElementById('osd-logo');
      if (osdLogo) {
        if (ch.logo_url) {
          osdLogo.innerHTML = '<img src="' + encodeURI(ch.logo_url) + '" onerror="this.style.display=\\'none\\';">';
        } else {
          osdLogo.textContent = '📺';
        }
      }

      videoOverlay.classList.add('active');
      playerError.style.display = 'none';

      streamChannel(ch.url, useProxy);
    }

    function streamChannel(streamUrl, proxied) {
      if (currentHls) {
        currentHls.destroy();
        currentHls = null;
      }

      const finalUrl = proxied 
        ? '/api/stream-proxy?url=' + encodeURIComponent(streamUrl)
        : streamUrl;

      // Update proxy button text
      const pText = document.getElementById('proxy-status-text');
      const pBtn = document.getElementById('btn-toggle-proxy');
      if (pText && pBtn) {
        pText.textContent = proxied ? 'Ligado' : 'Desligado';
        if (proxied) pBtn.classList.add('active-proxy');
        else pBtn.classList.remove('active-proxy');
      }

      if (window.Hls && window.Hls.isSupported()) {
        currentHls = new window.Hls({
          enableWorker: true,
          lowLatencyMode: true,
          manifestLoadingTimeOut: 10000
        });

        currentHls.loadSource(finalUrl);
        currentHls.attachMedia(videoPlayer);
        currentHls.on(window.Hls.Events.MANIFEST_PARSED, () => {
          videoPlayer.play().catch(e => console.log('Autoplay blocked:', e));
        });

        currentHls.on(window.Hls.Events.ERROR, (event, data) => {
          if (data.fatal) {
            console.warn('HLS Fatal Error:', data.type, data.details);
            if (!proxied) {
              playerError.style.display = 'flex';
              playerError.textContent = 'CORS ou erro de rede detectado. Ativando Modo Proxy BlackBird...';
              setTimeout(() => {
                playerError.style.display = 'none';
                useProxy = true;
                streamChannel(streamUrl, true);
              }, 1200);
            } else {
              playerError.style.display = 'flex';
              playerError.textContent = 'Stream indisponível no momento. Tente outro canal.';
            }
          }
        });
      } else {
        videoPlayer.src = finalUrl;
        videoPlayer.play().catch(e => console.log(e));
      }
    }

    function toggleProxyStream() {
      useProxy = !useProxy;
      if (currentChannelIndex >= 0 && filteredChannels[currentChannelIndex]) {
        streamChannel(filteredChannels[currentChannelIndex].url, useProxy);
      }
    }

    function closeVideoPlayer() {
      if (currentHls) {
        currentHls.destroy();
        currentHls = null;
      }
      videoPlayer.pause();
      videoPlayer.removeAttribute('src');
      videoOverlay.classList.remove('active');
    }

    function nextChannel() {
      if (filteredChannels.length === 0) return;
      let next = currentChannelIndex + 1;
      if (next >= filteredChannels.length) next = 0;
      playChannelIndex(next);
    }

    function prevChannel() {
      if (filteredChannels.length === 0) return;
      let prev = currentChannelIndex - 1;
      if (prev < 0) prev = filteredChannels.length - 1;
      playChannelIndex(prev);
    }

    function toggleFullscreen() {
      if (!document.fullscreenElement) {
        videoOverlay.requestFullscreen().catch(err => {
          videoPlayer.requestFullscreen?.();
        });
      } else {
        document.exitFullscreen();
      }
    }

    // Photo Lightbox & Slideshow functions
    function openPhoto(idx) {
      if (idx < 0 || idx >= photoTracks.length) return;
      currentPhotoIndex = idx;
      const photo = photoTracks[idx];

      const lightboxImg = document.getElementById('lightbox-img');
      const titleEl = document.getElementById('lightbox-title');
      const counterEl = document.getElementById('lightbox-counter');
      const photoLightbox = document.getElementById('photo-lightbox');

      if (lightboxImg) lightboxImg.src = '/api/stream/' + photo.uuid;
      const pName = photo.title || (photo.file_path ? photo.file_path.split('/').pop() : '') || 'Foto';
      if (titleEl) titleEl.textContent = pName;
      if (counterEl) counterEl.textContent = 'Foto ' + (idx + 1) + ' de ' + photoTracks.length;

      if (photoLightbox) photoLightbox.classList.add('active');
    }

    function closePhotoLightbox() {
      stopSlideshow();
      const photoLightbox = document.getElementById('photo-lightbox');
      if (photoLightbox) photoLightbox.classList.remove('active');
    }

    function nextPhoto() {
      if (photoTracks.length === 0) return;
      let next = currentPhotoIndex + 1;
      if (next >= photoTracks.length) next = 0;
      openPhoto(next);
    }

    function prevPhoto() {
      if (photoTracks.length === 0) return;
      let prev = currentPhotoIndex - 1;
      if (prev < 0) prev = photoTracks.length - 1;
      openPhoto(prev);
    }

    function startSlideshow() {
      if (photoTracks.length === 0) return;
      if (currentPhotoIndex < 0) openPhoto(0);
      else openPhoto(currentPhotoIndex);

      stopSlideshow();
      const toggleBtn = document.getElementById('btn-slideshow-toggle');
      if (toggleBtn) toggleBtn.textContent = '⏸ Pausar Slideshow';

      slideshowTimer = setInterval(() => {
        nextPhoto();
      }, 4000);
    }

    function stopSlideshow() {
      if (slideshowTimer) {
        clearInterval(slideshowTimer);
        slideshowTimer = null;
      }
      const toggleBtn = document.getElementById('btn-slideshow-toggle');
      if (toggleBtn) toggleBtn.textContent = '▶ Slideshow';
    }

    function toggleSlideshow() {
      if (slideshowTimer) stopSlideshow();
      else startSlideshow();
    }

    // Keyboard & TV Remote Navigation
    window.addEventListener('keydown', (e) => {
      // Photo Lightbox Active
      if (photoLightbox?.classList.contains('active')) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          closePhotoLightbox();
        } else if (e.key === 'ArrowRight' || e.key === ']') {
          e.preventDefault();
          nextPhoto();
        } else if (e.key === 'ArrowLeft' || e.key === '[') {
          e.preventDefault();
          prevPhoto();
        } else if (e.key === ' ' || e.key === 'k') {
          e.preventDefault();
          toggleSlideshow();
        }
        return;
      }

      // Video overlay active
      if (videoOverlay.classList.contains('active')) {
        if (e.key === 'Escape' || e.key === 'Backspace') {
          e.preventDefault();
          closeVideoPlayer();
        } else if (e.key === 'ArrowUp' || e.key === ']' || e.key === 'PageUp') {
          e.preventDefault();
          nextChannel();
        } else if (e.key === 'ArrowDown' || e.key === '[' || e.key === 'PageDown') {
          e.preventDefault();
          prevChannel();
        } else if (e.key === ' ' || e.key === 'k') {
          e.preventDefault();
          if (videoPlayer.paused) videoPlayer.play();
          else videoPlayer.pause();
        } else if (e.key === 'f') {
          e.preventDefault();
          toggleFullscreen();
        }
      }
    });

    // Auto-hide OSD in video player after 4s of inactivity
    let osdTimer = null;
    function resetOsdTimeout() {
      const top = document.getElementById('osd-top');
      const bottom = document.getElementById('osd-bottom');
      if (top) top.style.opacity = '1';
      if (bottom) bottom.style.opacity = '1';
      clearTimeout(osdTimer);
      osdTimer = setTimeout(() => {
        if (videoOverlay.classList.contains('active') && !videoPlayer.paused) {
          if (top) top.style.opacity = '0';
          if (bottom) bottom.style.opacity = '0';
        }
      }, 4000);
    }
    videoOverlay.addEventListener('mousemove', resetOsdTimeout);
    videoOverlay.addEventListener('click', resetOsdTimeout);

    // Search input handler
    function handleSearch(val) {
      if (currentTab === 'iptv') {
        filterChannels();
      } else if (currentTab === 'music') {
        renderMusicGrid(val);
      } else if (currentTab === 'photos') {
        renderPhotosGrid(val);
      }
    }

    // Load Music, Video & Photos Library
    async function loadLibrary() {
      try {
        const res = await fetch('/api/library');
        libraryTracks = await res.json();
        
        audioTracks = libraryTracks.filter(isAudio);
        videoTracks = libraryTracks.filter(isVideo);
        photoTracks = libraryTracks.filter(isPhoto);

        const musicCounter = document.getElementById('music-counter');
        const videoCounter = document.getElementById('video-counter');
        const photosCounter = document.getElementById('photos-counter');
        if (musicCounter) musicCounter.textContent = audioTracks.length + ' faixas';
        if (videoCounter) videoCounter.textContent = videoTracks.length + ' vídeos';
        if (photosCounter) photosCounter.textContent = photoTracks.length + ' fotos';

        renderMusicGrid();
        renderVideoGrid(videoTracks);
        renderPhotosGrid();
      } catch (e) {
        console.error(e);
      }
    }

    function renderMusicGrid(query = '') {
      const grid = document.getElementById('music-grid');
      if (!grid) return;
      const q = query.toLowerCase().trim();
      const list = audioTracks.filter(t => {
        if (!q) return true;
        return (t.title && t.title.toLowerCase().includes(q)) || (t.artist && t.artist.toLowerCase().includes(q));
      });

      if (list.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">Nenhuma música encontrada.</div>';
        return;
      }

      grid.innerHTML = list.map((t, idx) => \`
        <div class="media-card \${currentTrackIndex >= 0 && audioTracks[currentTrackIndex]?.uuid === t.uuid ? 'playing' : ''}" 
             tabindex="0" 
             data-track-uuid="\${t.uuid}">
          <div class="media-cover">
            <img src="/api/cover/\${t.uuid}" alt="\${escapeHtml(t.title)}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
            <span class="media-cover-placeholder" style="display:none;">🎵</span>
          </div>
          <div class="media-title">\${escapeHtml(t.title || 'Faixa')}</div>
          <div class="media-artist">\${escapeHtml(t.artist || 'Artista Desconhecido')}</div>
        </div>
      \`).join('');
    }

    document.getElementById('music-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.media-card');
      if (card) {
        const uuid = card.getAttribute('data-track-uuid');
        if (uuid) playMusicTrack(uuid);
      }
    });

    document.getElementById('music-grid')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.media-card');
        if (card) {
          const uuid = card.getAttribute('data-track-uuid');
          if (uuid) playMusicTrack(uuid);
        }
      }
    });

    function playMusicTrack(uuid) {
      const idx = audioTracks.findIndex(t => t.uuid === uuid);
      if (idx < 0) return;
      currentTrackIndex = idx;
      const t = audioTracks[idx];

      audioPlayer.src = '/api/stream/' + uuid;
      audioPlayer.play();
      isAudioPlaying = true;

      const titleEl = document.getElementById('audio-title');
      const artistEl = document.getElementById('audio-artist');
      const coverImg = document.getElementById('audio-cover-img');
      const playBtn = document.getElementById('audio-play-btn');

      if (titleEl) titleEl.textContent = t.title || 'Faixa';
      if (artistEl) artistEl.textContent = t.artist || 'Artista';
      if (coverImg) {
        coverImg.src = '/api/cover/' + uuid;
        coverImg.style.display = 'block';
      }
      if (playBtn) playBtn.textContent = '⏸';
      audioBar.classList.add('active');

      renderMusicGrid();
    }

    function toggleAudioPlay() {
      if (audioPlayer.paused) {
        audioPlayer.play();
        document.getElementById('audio-play-btn').textContent = '⏸';
        isAudioPlaying = true;
      } else {
        audioPlayer.pause();
        document.getElementById('audio-play-btn').textContent = '▶';
        isAudioPlaying = false;
      }
    }

    function nextTrack() {
      if (audioTracks.length === 0) return;
      let next = currentTrackIndex + 1;
      if (next >= audioTracks.length) next = 0;
      playMusicTrack(audioTracks[next].uuid);
    }

    function prevTrack() {
      if (audioTracks.length === 0) return;
      let prev = currentTrackIndex - 1;
      if (prev < 0) prev = audioTracks.length - 1;
      playMusicTrack(audioTracks[prev].uuid);
    }

    // Audio Timeline & Volume
    audioPlayer.addEventListener('timeupdate', () => {
      if (audioPlayer.duration) {
        const pct = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        const slider = document.getElementById('audio-timeline-slider');
        const curTime = document.getElementById('audio-current-time');
        const totTime = document.getElementById('audio-total-time');
        if (slider) slider.value = pct;
        if (curTime) curTime.textContent = formatTime(audioPlayer.currentTime);
        if (totTime) totTime.textContent = formatTime(audioPlayer.duration);
      }
    });

    document.getElementById('audio-timeline-slider')?.addEventListener('input', (e) => {
      if (audioPlayer.duration) {
        audioPlayer.currentTime = (e.target.value / 100) * audioPlayer.duration;
      }
    });

    document.getElementById('audio-volume')?.addEventListener('input', (e) => {
      audioPlayer.volume = e.target.value / 100;
    });

    function formatTime(s) {
      if (isNaN(s)) return '0:00';
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + (sec < 10 ? '0' : '') + sec;
    }

    // Render Videos
    function renderVideoGrid(videos) {
      const grid = document.getElementById('video-grid');
      if (!grid) return;
      if (videos.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 40px; color: var(--text-muted);">Nenhum vídeo local cadastrado.</div>';
        return;
      }

      grid.innerHTML = videos.map(v => \`
        <div class="media-card" tabindex="0" data-video-uuid="\${v.uuid}" data-video-title="\${escapeHtml(v.title || 'Vídeo')}">
          <div class="media-cover" style="aspect-ratio: 16/9;">
            <img src="/api/cover/\${v.uuid}" alt="\${escapeHtml(v.title)}" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
            <span class="media-cover-placeholder" style="display:none;">🎬</span>
          </div>
          <div class="media-title">\${escapeHtml(v.title || 'Vídeo')}</div>
          <div class="media-artist">Vídeo Local</div>
        </div>
      \`).join('');
    }

    document.getElementById('video-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.media-card');
      if (card) {
        const uuid = card.getAttribute('data-video-uuid');
        const title = card.getAttribute('data-video-title') || 'Vídeo';
        if (uuid) playLocalVideo(uuid, title);
      }
    });

    document.getElementById('video-grid')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.media-card');
        if (card) {
          const uuid = card.getAttribute('data-video-uuid');
          const title = card.getAttribute('data-video-title') || 'Vídeo';
          if (uuid) playLocalVideo(uuid, title);
        }
      }
    });

    function playLocalVideo(uuid, title) {
      audioPlayer.pause();
      isAudioPlaying = false;
      audioBar.classList.remove('active');

      const osdTitle = document.getElementById('osd-title');
      const osdCat = document.getElementById('osd-category');
      const osdLogo = document.getElementById('osd-logo');
      if (osdTitle) osdTitle.innerHTML = escapeHtml(title);
      if (osdCat) osdCat.textContent = 'Vídeo Local';
      if (osdLogo) osdLogo.textContent = '🎬';

      videoOverlay.classList.add('active');
      playerError.style.display = 'none';

      videoPlayer.src = '/api/stream/' + uuid;
      videoPlayer.play();
    }

    // Render Photos
    function renderPhotosGrid(query = '') {
      const grid = document.getElementById('photos-grid');
      if (!grid) return;
      const q = query.toLowerCase().trim();
      const list = photoTracks.filter(p => {
        if (!q) return true;
        const name = (p.title || p.file_path || '').toLowerCase();
        return name.includes(q);
      });

      if (list.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align: center; padding: 48px; color: var(--text-muted); font-size: 15px;">Nenhuma foto encontrada na biblioteca. Importe imagens na tela "Photos" do aplicativo.</div>';
        return;
      }

      grid.innerHTML = list.map((p) => {
        const photoIdx = photoTracks.indexOf(p);
        const pName = p.title || (p.file_path ? p.file_path.split('/').pop() : '') || 'Foto';
        const safeTitle = escapeHtml(pName);
        const ext = getFileExtension(p).toUpperCase();
        return \`
          <div class="media-card" tabindex="0" data-photo-idx="\${photoIdx}" style="cursor: pointer;">
            <div class="media-cover" style="aspect-ratio: 1; border-radius: 12px;">
              <img src="/api/stream/\${p.uuid}" alt="\${safeTitle}" loading="lazy" onerror="this.style.display='none'; if(this.nextElementSibling) this.nextElementSibling.style.display='flex';">
              <span class="media-cover-placeholder" style="display:none;">🖼️</span>
            </div>
            <div class="media-title">\${safeTitle}</div>
            <div class="media-artist" style="color: var(--accent); font-weight: 600;">\${ext || 'IMG'}</div>
          </div>
        \`;
      }).join('');
    }

    document.getElementById('photos-grid')?.addEventListener('click', (e) => {
      const card = e.target.closest('.media-card');
      if (card) {
        const idx = parseInt(card.getAttribute('data-photo-idx') || '-1', 10);
        if (idx >= 0) openPhoto(idx);
      }
    });

    document.getElementById('photos-grid')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const card = e.target.closest('.media-card');
        if (card) {
          const idx = parseInt(card.getAttribute('data-photo-idx') || '-1', 10);
          if (idx >= 0) openPhoto(idx);
        }
      }
    });

    // Helper: Copy Text
    function copyText(elemId, btn) {
      const text = document.getElementById(elemId)?.textContent;
      if (text) {
        navigator.clipboard.writeText(text).then(() => {
          const orig = btn.innerHTML;
          btn.innerHTML = '✓ Copiado!';
          setTimeout(() => btn.innerHTML = orig, 2000);
        });
      }
    }

    // Initial Load
    document.addEventListener('DOMContentLoaded', () => {
      loadIptv();
      loadLibrary();
    });
    if (document.readyState === 'interactive' || document.readyState === 'complete') {
      loadIptv();
      loadLibrary();
    }
  </script>
</body>
</html>`;
}
