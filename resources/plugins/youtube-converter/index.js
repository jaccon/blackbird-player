// YouTube Converter Plugin for BlackBird
(function(context) {
  const { container, api, refreshLibrary, navigateTo } = context;

  container.innerHTML = `
    <div class="yt-converter-container">
      <div class="yt-converter-card">
        <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px;">
          <div style="display: flex; align-items: center; gap: 14px;">
            <div style="width: 48px; height: 48px; border-radius: 12px; background: rgba(230,0,0,0.12); display: flex; align-items: center; justify-content: center; color: #ff3333; border: 1px solid rgba(255,0,0,0.2);">
              <i data-lucide="youtube" style="width: 26px; height: 26px;"></i>
            </div>
            <div>
              <h3 style="margin: 0; font-size: 19px; font-weight: 700; color: var(--text-main);">YouTube Converter</h3>
              <p style="margin: 3px 0 0 0; font-size: 13px; color: var(--text-muted);">Convert YouTube media to high-fidelity MP3 or MP4 directly into your library.</p>
            </div>
          </div>
          <span class="yt-plugin-badge">Official Plugin</span>
        </div>

        <!-- System status banner -->
        <div id="yt-sys-banner" style="display: none; padding: 12px 16px; border-radius: 10px; margin-bottom: 20px; font-size: 13px; align-items: center; gap: 10px;">
          <i data-lucide="alert-circle" style="width: 18px; height: 18px; flex-shrink: 0;"></i>
          <span id="yt-sys-banner-text"></span>
        </div>

        <div class="input-group">
          <label for="yt-converter-url" style="font-weight: 600; font-size: 13px; color: var(--text-main); margin-bottom: 6px; display: block;">YouTube Video URL</label>
          <div style="display: flex; gap: 10px;">
            <input type="text" id="yt-converter-url" placeholder="https://www.youtube.com/watch?v=..." style="flex: 1; background: var(--glass); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 12px 16px; color: var(--text-main); font-size: 14px; outline: none;">
            <button class="btn-secondary" id="btn-yt-preview" style="white-space: nowrap; gap: 6px; padding: 0 18px;">
              <i data-lucide="search" style="width: 16px; height: 16px;"></i> Fetch Info
            </button>
          </div>
        </div>

        <!-- Video Preview Card -->
        <div id="yt-preview-box" class="yt-video-preview" style="display: none;">
          <img id="yt-preview-thumb" src="" alt="Thumbnail">
          <div class="yt-video-preview-info">
            <div class="yt-video-preview-title" id="yt-preview-title">Video Title</div>
            <div class="yt-video-preview-author" id="yt-preview-author">Channel</div>
            <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;" id="yt-preview-duration">00:00</div>
          </div>
        </div>

        <div style="margin-top: 24px;">
          <label style="font-size: 13px; font-weight: 600; color: var(--text-main); display: block; margin-bottom: 8px;">
            Select Format
          </label>
          <div class="yt-format-selector">
            <label class="yt-format-option selected" id="opt-format-mp3">
              <input type="radio" name="yt-format" value="mp3" checked>
              <div>
                <div style="font-weight: 600; font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="music" style="width: 16px; height: 16px; color: var(--accent);"></i> MP3 Audio
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Extract highest audio quality (320kbps)</div>
              </div>
            </label>
            <label class="yt-format-option" id="opt-format-mp4">
              <input type="radio" name="yt-format" value="mp4">
              <div>
                <div style="font-weight: 600; font-size: 14px; color: var(--text-main); display: flex; align-items: center; gap: 6px;">
                  <i data-lucide="video" style="width: 16px; height: 16px; color: var(--accent);"></i> MP4 Video
                </div>
                <div style="font-size: 12px; color: var(--text-muted); margin-top: 2px;">Full video with merged stereo audio</div>
              </div>
            </label>
          </div>
        </div>

        <!-- Download Action -->
        <div style="margin-top: 28px;">
          <button class="btn-primary" id="btn-yt-start-convert" style="width: 100%; justify-content: center; padding: 14px; font-size: 15px; font-weight: 600; gap: 8px;">
            <i data-lucide="download" style="width: 18px; height: 18px;"></i> Convert & Download to Library
          </button>
        </div>

        <!-- Progress Box -->
        <div id="yt-progress-container" class="yt-progress-box" style="display: none;">
          <div class="yt-progress-header">
            <span id="yt-progress-status" style="font-weight: 600; color: var(--text-main);">Starting...</span>
            <span id="yt-progress-details" style="font-weight: 600; color: var(--accent);">0%</span>
          </div>
          <div class="yt-progress-bar-bg">
            <div id="yt-progress-bar-fill" class="yt-progress-bar-fill"></div>
          </div>
          <div style="margin-top: 10px; display: flex; justify-content: space-between; font-size: 12px; color: var(--text-muted);">
            <span id="yt-progress-speed">Speed: --</span>
            <span id="yt-progress-eta">ETA: --</span>
          </div>
        </div>

        <!-- Success Box -->
        <div id="yt-success-box" style="display: none; margin-top: 22px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 16px; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px;">
          <div style="display: flex; align-items: center; gap: 10px; color: #10b981;">
            <i data-lucide="check-circle" style="width: 20px; height: 20px; flex-shrink: 0;"></i>
            <div>
              <div id="yt-success-message" style="font-weight: 600; font-size: 14px;">Media successfully converted and added to BlackBird library!</div>
              <div id="yt-success-path" style="font-size: 12px; color: var(--text-muted); margin-top: 3px; word-break: break-all;"></div>
            </div>
          </div>
          <div style="display: flex; gap: 8px;">
            <button class="btn-secondary" id="btn-yt-open-folder" style="padding: 8px 14px; font-size: 13px; font-weight: 600;">
              Open Folder
            </button>
            <button class="btn-secondary" id="btn-yt-view-media" style="padding: 8px 16px; font-size: 13px; font-weight: 600;">
              View in Library
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  if (window.lucide) window.lucide.createIcons();

  const urlInput = container.querySelector('#yt-converter-url');
  const btnPreview = container.querySelector('#btn-yt-preview');
  const previewBox = container.querySelector('#yt-preview-box');
  const previewThumb = container.querySelector('#yt-preview-thumb');
  const previewTitle = container.querySelector('#yt-preview-title');
  const previewAuthor = container.querySelector('#yt-preview-author');
  const previewDuration = container.querySelector('#yt-preview-duration');

  const optMp3 = container.querySelector('#opt-format-mp3');
  const optMp4 = container.querySelector('#opt-format-mp4');
  const btnStart = container.querySelector('#btn-yt-start-convert');

  const progressBox = container.querySelector('#yt-progress-container');
  const progressStatus = container.querySelector('#yt-progress-status');
  const progressDetails = container.querySelector('#yt-progress-details');
  const progressFill = container.querySelector('#yt-progress-bar-fill');
  const progressSpeed = container.querySelector('#yt-progress-speed');
  const progressEta = container.querySelector('#yt-progress-eta');

  const successBox = container.querySelector('#yt-success-box');
  const successMessage = container.querySelector('#yt-success-message');
  const successPath = container.querySelector('#yt-success-path');
  const btnOpenFolder = container.querySelector('#btn-yt-open-folder');
  const btnViewMedia = container.querySelector('#btn-yt-view-media');

  const sysBanner = container.querySelector('#yt-sys-banner');
  const sysBannerText = container.querySelector('#yt-sys-banner-text');

  // Check yt-dlp status
  api.checkYtDlp().then(status => {
    if (!status.available) {
      sysBanner.style.display = 'flex';
      sysBanner.style.background = 'rgba(239, 68, 68, 0.1)';
      sysBanner.style.border = '1px solid rgba(239, 68, 68, 0.3)';
      sysBanner.style.color = '#ef4444';
      sysBannerText.textContent = 'Notice: yt-dlp binary was not found in system PATH. Conversions may fail until yt-dlp is installed.';
      if (window.lucide) window.lucide.createIcons();
    }
  });

  // Format selection toggle
  optMp3.addEventListener('click', () => {
    optMp3.classList.add('selected');
    optMp4.classList.remove('selected');
    optMp3.querySelector('input').checked = true;
  });

  optMp4.addEventListener('click', () => {
    optMp4.classList.add('selected');
    optMp3.classList.remove('selected');
    optMp4.querySelector('input').checked = true;
  });

  // Format duration helper
  function formatTime(seconds) {
    if (!seconds) return '00:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  // Fetch info logic
  async function fetchVideoInfo() {
    const url = urlInput.value.trim();
    if (!url) return;

    btnPreview.disabled = true;
    btnPreview.innerHTML = '<i data-lucide="loader" class="spinner" style="width: 16px; height: 16px; animation: spin 1s linear infinite;"></i> Loading...';

    try {
      const res = await api.getYtVideoInfo(url);
      if (res.success && res.data) {
        previewBox.style.display = 'flex';
        previewThumb.src = res.data.thumbnail || '';
        previewTitle.textContent = res.data.title || 'YouTube Media';
        previewAuthor.textContent = res.data.author || 'YouTube';
        previewDuration.textContent = res.data.duration ? `Duration: ${formatTime(res.data.duration)}` : '';
      } else {
        alert(`Could not fetch video info: ${res.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Failed to fetch info: ${err.message}`);
    } finally {
      btnPreview.disabled = false;
      btnPreview.innerHTML = '<i data-lucide="search" style="width: 16px; height: 16px;"></i> Fetch Info';
      if (window.lucide) window.lucide.createIcons();
    }
  }

  btnPreview.addEventListener('click', fetchVideoInfo);

  // Auto fetch on paste
  urlInput.addEventListener('paste', () => {
    setTimeout(fetchVideoInfo, 100);
  });

  // Conversion process
  let unsubscribeProgress = null;

  btnStart.addEventListener('click', async () => {
    const url = urlInput.value.trim();
    if (!url) {
      alert('Please enter a YouTube video URL');
      return;
    }

    const formatInput = container.querySelector('input[name="yt-format"]:checked');
    const selectedFormat = formatInput ? formatInput.value : 'mp3';

    btnStart.disabled = true;
    btnStart.innerHTML = '<i data-lucide="loader" class="spinner" style="width: 18px; height: 18px; animation: spin 1s linear infinite;"></i> Converting...';

    progressBox.style.display = 'block';
    progressFill.style.width = '0%';
    progressStatus.textContent = 'Starting conversion...';
    progressDetails.textContent = '0%';
    progressSpeed.textContent = '';
    progressEta.textContent = '';
    successBox.style.display = 'none';

    // Subscribe to real-time progress events from Electron Main
    if (unsubscribeProgress) unsubscribeProgress();

    unsubscribeProgress = api.onYtDlpProgress((progress) => {
      if (progress.percent !== undefined) {
        progressFill.style.width = `${progress.percent}%`;
        progressDetails.textContent = `${progress.percent.toFixed(1)}%`;
      }
      if (progress.message) {
        progressStatus.textContent = progress.message;
      }
      if (progress.speed) {
        progressSpeed.textContent = `Speed: ${progress.speed}`;
      }
      if (progress.eta) {
        progressEta.textContent = `ETA: ${progress.eta}`;
      }
    });

    try {
      const result = await api.convertYtMedia({
        url,
        format: selectedFormat
      });

      if (result.success && result.track) {
        progressFill.style.width = '100%';
        progressDetails.textContent = '100%';
        progressStatus.textContent = 'Complete!';

        successBox.style.display = 'flex';
        successMessage.textContent = `"${result.track.title}" converted to ${selectedFormat.toUpperCase()} and added to library!`;

        const savedPath = result.track.file_path || (result.track.filePath);
        if (successPath && savedPath) {
          successPath.textContent = `Saved in: ${savedPath}`;
        }

        if (btnOpenFolder && savedPath) {
          btnOpenFolder.onclick = () => {
            const folder = savedPath.substring(0, savedPath.lastIndexOf('/'));
            if (api.openPath) {
              api.openPath(folder);
            }
          };
        }

        btnViewMedia.onclick = () => {
          if (selectedFormat === 'mp3') {
            navigateTo('btn-all-songs');
          } else {
            navigateTo('btn-all-videos');
          }
        };

        if (refreshLibrary) {
          await refreshLibrary();
        }
      } else {
        alert(`Conversion failed: ${result.error || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Conversion error: ${err.message}`);
    } finally {
      btnStart.disabled = false;
      btnStart.innerHTML = '<i data-lucide="download" style="width: 18px; height: 18px;"></i> Convert & Download to Library';
      if (window.lucide) window.lucide.createIcons();
      if (unsubscribeProgress) {
        unsubscribeProgress();
        unsubscribeProgress = null;
      }
    }
  });
})(context);
