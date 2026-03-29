export interface TrackMetadata {
  uuid: string;
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
  is_favorite?: number;
  description?: string;
}

export interface Playlist {
  id: string;
  name: string;
  trackCount?: number;
  totalDuration?: number;
}

export interface Theme {
  name: string;
  variables: { [key: string]: string };
}

// State management
let library: TrackMetadata[] = []
let currentPlaylist: TrackMetadata[] = []
let userPlaylists: Playlist[] = []
let availableThemes: Theme[] = []

function createPlaceholderMarkup(text: string): string {
  const initial = (text || '?').charAt(0).toUpperCase()
  const charCode = text ? text.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) : 0
  
  const gradients = [
    'linear-gradient(135deg, #FF512F 0%, #DD2476 100%)',
    'linear-gradient(135deg, #12c2e9 0%, #c471ed 50%, #f64f59 100%)',
    'linear-gradient(135deg, #00b09b 0%, #96c93d 100%)',
    'linear-gradient(135deg, #8E2DE2 0%, #4A00E0 100%)',
    'linear-gradient(135deg, #f12711 0%, #f5af19 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #ff0844 0%, #ffb199 100%)'
  ]
  const gradient = gradients[charCode % gradients.length]
  
  return `
    <div class="artwork-placeholder" style="background: ${gradient};">
      <span class="initial">${initial}</span>
    </div>
  `
}

let currentTrackIndex = -1
let isShuffle = false
let repeatMode: 'none' | 'one' | 'all' = 'all'
let selectedTrackUuids: Set<string> = new Set()
let lastTrackListView: TrackMetadata[] = []
let sidebarTrack: TrackMetadata | null = null
let lastListViewTitle: string = 'All Songs'
let currentRadioBeingViewed: any = null
let isRadioMode = false

const audio = new Audio()
let videoPlayer: HTMLVideoElement
let videoOverlay: HTMLElement
let btnCloseVideo: HTMLElement

// DOM Elements
let contentView: HTMLElement

let btnAddFolderHero: HTMLElement
let playerTitle: HTMLElement
let playerArtist: HTMLElement
let playerAlbum: HTMLElement
let playerFormat: HTMLElement
let playerArtwork: HTMLElement
let btnPlayPause: HTMLElement
let seekSlider: HTMLInputElement
let seekFill: HTMLElement
let currentTimeLabel: HTMLElement
let totalTimeLabel: HTMLElement
let volumeSlider: HTMLInputElement
let volumeFill: HTMLElement
let btnNext: HTMLElement
let btnPrev: HTMLElement
let btnShuffle: HTMLElement
let btnRepeat: HTMLElement
let btnAllSongs: HTMLElement
let btnAlbums: HTMLElement
let btnArtists: HTMLElement
let btnAllVideos: HTMLElement
let btnFavorites: HTMLElement
let btnRadio: HTMLElement
let btnToggleFavorite: HTMLElement
let playlistList: HTMLElement
let btnNewPlaylist: HTMLElement

// Modal Elements
let modalContainer: HTMLElement
let playlistModal: HTMLElement
let editModal: HTMLElement
let btnSavePlaylist: HTMLElement
let btnSaveEdit: HTMLElement
let inputPlaylistName: HTMLInputElement
let inputEditTitle: HTMLInputElement
let inputEditArtist: HTMLInputElement
let inputEditAlbum: HTMLInputElement
let inputEditKind: HTMLInputElement
let inputEditDescription: HTMLTextAreaElement
let inputEditArtwork: HTMLInputElement
let previewEditArtwork: HTMLElement
let currentEditArtworkBase64: string | null = null
let trackBeingEdited: TrackMetadata | null = null
let searchInput: HTMLInputElement
let btnImportMedia: HTMLElement
let btnImportYoutube: HTMLElement
let youtubeModal: HTMLElement

let btnSaveYoutube: HTMLElement
let inputYTUrl: HTMLInputElement

// Radio Modal Elements
let radioModal: HTMLElement
let inputRadioName: HTMLInputElement
let inputRadioUrl: HTMLInputElement
let checkRadioShare: HTMLInputElement
let btnSaveRadio: HTMLElement

let btnCast: HTMLElement
let castModal: HTMLElement
let castDeviceList: HTMLElement


// Theme Switcher Element
let themeSelector: HTMLSelectElement

let isInitialized = false
async function init(): Promise<void> {
  if (isInitialized) return
  isInitialized = true

  try {
    videoPlayer = document.getElementById('video-player') as HTMLVideoElement
    videoOverlay = document.getElementById('video-overlay')!
    btnCloseVideo = document.getElementById('btn-close-video')!
    contentView = document.getElementById('content-view')!

    btnAddFolderHero = document.getElementById('btn-add-folder-hero')!
    playerTitle = document.getElementById('player-title')!
    playerArtist = document.getElementById('player-artist')!
    playerAlbum = document.getElementById('player-album')!
    playerFormat = document.getElementById('player-format')!
    playerArtwork = document.getElementById('player-artwork')!
    btnPlayPause = document.getElementById('btn-play-pause')!
    seekSlider = document.getElementById('seek-slider') as HTMLInputElement
    seekFill = document.getElementById('seek-fill')!
    currentTimeLabel = document.getElementById('current-time')!
    totalTimeLabel = document.getElementById('total-time')!
    volumeSlider = document.getElementById('volume-slider') as HTMLInputElement
    volumeFill = document.getElementById('volume-fill')!
    btnNext = document.getElementById('btn-next')!
    btnPrev = document.getElementById('btn-prev')!
    btnShuffle = document.getElementById('btn-shuffle')!
    btnRepeat = document.getElementById('btn-repeat')!
    btnAllSongs = document.getElementById('btn-all-songs')!
    btnAlbums = document.getElementById('btn-albums')!
    btnArtists = document.getElementById('btn-artists')!
    btnAllVideos = document.getElementById('btn-all-videos')!
    btnFavorites = document.getElementById('btn-favorites')!
    btnToggleFavorite = document.getElementById('btn-toggle-favorite')!
    playlistList = document.getElementById('playlist-list')!
    btnNewPlaylist = document.getElementById('btn-new-playlist')!
    btnRadio = document.getElementById('btn-radio')!
    modalContainer = document.getElementById('modal-container')!
    playlistModal = document.getElementById('playlist-modal')!
    editModal = document.getElementById('edit-modal')!
    searchInput = document.getElementById('search-input') as HTMLInputElement
    btnSavePlaylist = document.getElementById('btn-save-playlist')!
    btnSaveEdit = document.getElementById('btn-save-edit')!
    inputPlaylistName = document.getElementById('playlist-name') as HTMLInputElement
    inputEditTitle = document.getElementById('edit-title') as HTMLInputElement
    inputEditArtist = document.getElementById('edit-artist') as HTMLInputElement
    btnImportMedia = document.getElementById('btn-import-media')!
    btnImportYoutube = document.getElementById('btn-import-youtube')!
    youtubeModal = document.getElementById('youtube-modal')!

    btnSaveYoutube = document.getElementById('btn-save-youtube')!
    inputYTUrl = document.getElementById('yt-url') as HTMLInputElement

    inputEditAlbum = document.getElementById('edit-album') as HTMLInputElement
    inputEditKind = document.getElementById('edit-kind') as HTMLInputElement
    inputEditDescription = document.getElementById('edit-description') as HTMLTextAreaElement
    inputEditArtwork = document.getElementById('edit-artwork-input') as HTMLInputElement
    previewEditArtwork = document.getElementById('edit-artwork-preview')!

    btnRadio = document.getElementById('btn-radio')!
    radioModal = document.getElementById('radio-modal')!
    inputRadioName = document.getElementById('radio-name') as HTMLInputElement
    inputRadioUrl = document.getElementById('radio-url') as HTMLInputElement
    checkRadioShare = document.getElementById('radio-share') as HTMLInputElement
    btnSaveRadio = document.getElementById('btn-save-radio')!
    
    btnCast = document.getElementById('btn-cast')!
    castModal = document.getElementById('cast-modal')!
    castDeviceList = document.getElementById('cast-device-list')!

    // Inject Theme Selector into Sidebar Footer
    const footer = document.querySelector('.sidebar-footer')
    if (footer) {
      footer.innerHTML = `
        <div class="theme-management-container" style="display:flex; flex-direction:column; gap:8px; width:100%; padding:12px; background:rgba(0,0,0,0.15); border:1px solid var(--border); border-radius:var(--radius-md); margin-bottom: 24px;">
          <div style="font-size:11px; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted); font-weight:600;">Theme Options</div>
          <div style="display:flex; gap:8px; width:100%;">
            <select id="theme-selector" style="flex:1; width:auto; background:var(--glass); color:var(--text-main); border:1px solid var(--border); padding:8px; border-radius:var(--radius-md); font-family:inherit; outline:none; cursor:pointer;">
              <option value="">Select Theme</option>
            </select>
            <button class="btn-secondary" id="btn-import-theme" title="Import Theme" style="padding: 8px; display:flex; align-items:center; justify-content:center;">
              <i data-lucide="download"></i>
            </button>
          </div>
        </div>
        <div style="border-top: 1px solid var(--border); padding-top: 16px; width: 100%;">
          <button class="btn-secondary" id="btn-update-player" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--bg-card); color: var(--text-main);">
            <i data-lucide="github"></i> Check for Updates
          </button>
        </div>
      `

      themeSelector = document.getElementById('theme-selector') as HTMLSelectElement
      
      document.getElementById('btn-update-player')?.addEventListener('click', () => {
        window.open('https://github.com/jaccon/blackbird-player', '_blank')
      })
      
      document.getElementById('btn-import-theme')?.addEventListener('click', async () => {
        const result = await (window as any).api.importTheme()
        if (result && result.success) {
          await setupThemes()
          alert('Theme imported successfully!')
        } else if (result && result.error) {
          alert(`Failed to import theme: ${result.error}`)
        }
      })
    }

    if ((window as any).electron?.process?.platform === 'darwin') {
      document.body.classList.add('is-mac')
    }

    attachListeners()
    updateVolume(80)
    loadPlaylists()
    setupThemes()
    loadLibrary()
    attachGlobalKeyboardListeners()
    attachGlobalClickDelegation() 
    loadSession() 
    
    // Save on close
    window.addEventListener('beforeunload', () => saveSession())
  } catch (err) {
    console.error('Initialization error:', err)
  }
}

async function loadLibrary(): Promise<void> {
  library = await (window as any).api.getLibrary()
  if (library.length > 0) {
    currentPlaylist = [...library]
    renderTrackList(library)
  } else {
    contentView.innerHTML = `
      <div class="welcome-screen">
        <h2>No Music Found</h2>
        <p>Your library is empty. Add a folder with music to get started.</p>
        <button class="btn-primary large" id="btn-add-folder-hero">Pick a Folder</button>
      </div>
    `
    document.getElementById('btn-add-folder-hero')?.addEventListener('click', handleAddFolder)
  }
}

async function setupThemes(): Promise<void> {
  availableThemes = await window.api.getThemes()
  themeSelector.innerHTML = availableThemes.map(t => `<option value="${t.name}">${t.name}</option>`).join('')
  
  const savedTheme = localStorage.getItem('selected-theme') || 'Neon Midnight'
  const theme = availableThemes.find(t => t.name === savedTheme)
  if (theme) {
    applyTheme(theme)
    themeSelector.value = savedTheme
  }

  themeSelector.onchange = () => {
    const theme = availableThemes.find(t => t.name === themeSelector.value)
    if (theme) {
      applyTheme(theme)
      localStorage.setItem('selected-theme', theme.name)
    }
  }
}

function applyTheme(theme: Theme): void {
  const root = document.documentElement
  Object.entries(theme.variables).forEach(([key, value]) => {
    root.style.setProperty(key, value)
  })
}

async function loadPlaylists(): Promise<void> {
  userPlaylists = await window.api.getPlaylists()
  renderPlaylistSidebar()
}

function renderPlaylistSidebar(): void {
  playlistList.innerHTML = userPlaylists.map(pl => `
    <li class="playlist-nav-item" data-id="${pl.id}" draggable="false">
      <div class="pl-info">
        <i data-lucide="list-music"></i> 
        <span>${pl.name}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-size: 10px; color: var(--text-muted); font-variant-numeric: tabular-nums;">${pl.totalDuration ? formatTime(pl.totalDuration) : '0:00'}</span>
        <button class="btn-delete-pl" data-id="${pl.id}"><i data-lucide="trash-2"></i></button>
      </div>
    </li>
  `).join('')
  
  if ((window as any).lucide) (window as any).lucide.createIcons()

  document.querySelectorAll('.playlist-nav-item').forEach(li => {
    const htmlLi = li as HTMLElement
    const playlistId = htmlLi.getAttribute('data-id')!
    
    htmlLi.querySelector('.pl-info')?.addEventListener('click', async () => {
      selectedTrackUuids.clear()
      setActiveNav(htmlLi)
      const tracks = await window.api.getPlaylistTracks(playlistId)
      renderTrackList(tracks, `Playlist: ${userPlaylists.find(p => p.id === playlistId)?.name}`)
    })

    htmlLi.addEventListener('dragover', (e) => {
      e.preventDefault()
      htmlLi.classList.add('drag-over')
    })

    htmlLi.addEventListener('dragleave', () => {
      htmlLi.classList.remove('drag-over')
    })

    htmlLi.addEventListener('drop', async (e) => {
      const dragEvent = e as DragEvent
      dragEvent.preventDefault()
      htmlLi.classList.remove('drag-over')
      const trackUuid = dragEvent.dataTransfer?.getData('track-uuid')
      if (trackUuid) {
        const result = await window.api.addToPlaylist(playlistId, trackUuid)
        if (result.error) {
          alert(`Error: ${result.error}`)
        } else {
          htmlLi.style.background = 'var(--accent-glow)'
          setTimeout(() => htmlLi.style.background = '', 500)
          await loadPlaylists()
        }
      }
    })
  })

  document.querySelectorAll('.btn-delete-pl').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const id = btn.getAttribute('data-id')!
      if (confirm('Are you sure you want to delete this playlist?')) {
        await window.api.deletePlaylist(id)
        await loadPlaylists()
      }
    })
  })
}

function attachListeners(): void {

  btnAddFolderHero?.addEventListener('click', handleAddFolder)
  
  btnPlayPause.addEventListener('click', togglePlay)
  btnNext.addEventListener('click', playNext)
  btnPrev.addEventListener('click', playPrev)
  
  btnShuffle.addEventListener('click', toggleShuffle)
  btnRepeat.addEventListener('click', toggleRepeat)
  
  btnAllSongs.addEventListener('click', () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-all-songs')
    renderTrackList(library)
  })
  btnAlbums.addEventListener('click', () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-albums')
    renderAlbumGrid()
  })
  btnArtists.addEventListener('click', () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-artists')
    renderArtistGrid()
  })
  
  btnAllVideos.addEventListener('click', () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-all-videos')
    const videos = library.filter(t => {
      const format = t.format?.toLowerCase() || ''
      return format.includes('mp4') || format.includes('youtube')
    })
    renderTrackList(videos, 'All Videos')
  })

  btnFavorites.addEventListener('click', async () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-favorites')
    const favs = await (window as any).api.getFavorites()
    renderTrackList(favs, 'My Favorites')
  })

  btnRadio.addEventListener('click', () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-radio')
    renderRadioStreaming()
  })

  document.getElementById('btn-statistics')?.addEventListener('click', async () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-statistics')
    
    // UI Loader State
    contentView.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); gap: 16px;">
        <i data-lucide="loader" class="spinner" style="width: 32px; height: 32px; animation: spin 1s linear infinite;"></i>
        <p>Crunching your listening data...</p>
      </div>
      <style>
        @keyframes spin { 100% { transform: rotate(360deg); } }
      </style>
    `
    if ((window as any).lucide) (window as any).lucide.createIcons()

    const stats = await (window as any).api.getStatistics()
    renderStatistics(stats)
  })

  document.getElementById('btn-history')?.addEventListener('click', async () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-history')
    
    contentView.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; color: var(--text-muted); gap: 16px;">
        <i data-lucide="loader" class="spinner" style="width: 32px; height: 32px; animation: spin 1s linear infinite;"></i>
        <p>Loading history...</p>
      </div>
    `
    if ((window as any).lucide) (window as any).lucide.createIcons()

    const historyItems = await (window as any).api.getPlayHistory()
    renderHistory(historyItems)
  })

  btnImportMedia.addEventListener('click', handleAddFolder)
  btnImportYoutube.addEventListener('click', () => {
    modalContainer.classList.remove('hidden')
    youtubeModal.classList.remove('hidden')
  })

  btnSaveYoutube.addEventListener('click', handleSaveYoutube)

  btnCast.addEventListener('click', () => {
    modalContainer.classList.remove('hidden')
    castModal.classList.remove('hidden')
    handleCastScan()
  })

  btnSaveRadio.onclick = async () => {
    const name = inputRadioName.value.trim()
    const url = inputRadioUrl.value.trim()
    const share = checkRadioShare.checked ? 1 : 0

    if (!name || !url) {
      alert('Please provide both name and URL')
      return
    }

    const id = crypto.randomUUID()
    await (window as any).api.saveUserRadio({ id, name, url, share })
    closeModal()
    renderRadioStreaming()
  }

  btnToggleFavorite.addEventListener('click', async () => {
    if (!sidebarTrack) return
    const newState = sidebarTrack.is_favorite ? 0 : 1
    await (window as any).api.updateTrack(sidebarTrack.uuid, { is_favorite: newState })
    
    // Update local state
    sidebarTrack.is_favorite = newState
    const libTrack = library.find(t => t.uuid === sidebarTrack?.uuid)
    if (libTrack) libTrack.is_favorite = newState
    
    // Update UI
    btnToggleFavorite.classList.toggle('active', !!newState)
    if ((window as any).lucide) (window as any).lucide.createIcons() 
    
    // If we are in Favorites view, we might want to refresh, but it might be jarring
    // Let's at least update the current list item if visible
    document.querySelectorAll('.track-item').forEach(item => {
      if (item.getAttribute('data-uuid') === sidebarTrack?.uuid) {
        // We could add a heart icon to the list item too eventually
      }
    })
  })

  btnNewPlaylist.addEventListener('click', () => {
    modalContainer.classList.remove('hidden')
    playlistModal.classList.remove('hidden')
    editModal.classList.add('hidden')
    inputPlaylistName.focus()
  })
  
  const closeModal = () => {
    modalContainer.classList.add('hidden')
    playlistModal.classList.add('hidden')
    editModal.classList.add('hidden')
    youtubeModal.classList.add('hidden')
    castModal.classList.add('hidden')
    radioModal.classList.add('hidden')
    
    inputPlaylistName.value = ''
    inputYTUrl.value = ''
    inputRadioName.value = ''
    inputRadioUrl.value = ''
    checkRadioShare.checked = false
  }

  document.querySelectorAll('.btn-cancel-modal, .btn-close-modal').forEach(btn => {
    btn.addEventListener('click', closeModal)
  })
  
  btnSavePlaylist.addEventListener('click', async () => {
    const name = inputPlaylistName.value.trim()
    if (name) {
      await window.api.createPlaylist(name)
      await loadPlaylists()
      closeModal()
    }
  })

  searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim()
    if (!query) {
      renderTrackList(library)
      return
    }

    const filtered = library.filter(track => {
      const title = (track.title || '').toLowerCase()
      const artist = (track.artist || '').toLowerCase()
      const album = (track.album || '').toLowerCase()
      const format = (track.format || '').toLowerCase()
      const description = (track.description || '').toLowerCase()
      return title.includes(query) || artist.includes(query) || album.includes(query) || format.includes(query) || description.includes(query)
    })

    renderTrackList(filtered, `Search results for "${query}"`)
  })

  btnSaveEdit.addEventListener('click', handleSaveEdit)

  inputEditArtwork.addEventListener('change', (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        currentEditArtworkBase64 = base64
        previewEditArtwork.innerHTML = `<img src="${base64}">`
      }
      reader.readAsDataURL(file)
    }
  })

  modalContainer.addEventListener('click', (e) => {
    if (e.target === modalContainer) closeModal()
  })

  audio.addEventListener('timeupdate', updatePlaybackProgress)
  audio.addEventListener('pause', () => saveSession())
  audio.addEventListener('loadedmetadata', () => {
     totalTimeLabel.textContent = formatTime(audio.duration)
     seekSlider.max = audio.duration.toString()
  })
  audio.addEventListener('ended', handleTrackEnded)
  
  audio.addEventListener('error', () => {
    const error = audio.error
    console.error('Audio object error event:', error)
    if (error && (window as any).showRadioToast) {
      // Code 3 (Network error) or 4 (Src not supported) usually means file is missing/moved
      if ((error.code === 3 || error.code === 4) && currentPlaylist && currentPlaylist[currentTrackIndex]) {
        const track = currentPlaylist[currentTrackIndex]
        ;(window as any).showRadioToast(`⚠️ Arquivo não encontrado: ${track.title || 'Música'}. Pulando...`)
        
        // Visually mark track as missing
        const trackEls = document.querySelectorAll(`.track-item[data-uuid="${track.uuid}"]`)
        trackEls.forEach(el => {
          (el as HTMLElement).style.opacity = '0.4'
          const pathDiv = el.querySelector('.track-list-path')
          if (pathDiv) pathDiv.innerHTML = '<span style="color: #ff4c4c; font-weight: 600;">⚠️ Arquivo ou pasta original não encontrada</span>'
        })

        // Auto-skip after a brief delay
        setTimeout(() => {
          if (currentPlaylist.length > 1) playNext()
        }, 2500)
        
        return
      }
      
      const msgs = ['Unknown error', 'Aborted', 'Network error', 'Decode error', 'Source not supported']
      ;(window as any).showRadioToast(`Player Error: ${msgs[error.code] || 'Failed to load'}`)
    }
  })

  seekSlider.addEventListener('input', () => {
    const time = parseFloat(seekSlider.value)
    if (!videoOverlay.classList.contains('hidden')) {
      videoPlayer.currentTime = time
    } else {
      audio.currentTime = time
    }
    saveSession()
    updatePlaybackProgress()
  })

  volumeSlider.addEventListener('input', () => {
    updateVolume(parseInt(volumeSlider.value))
  })

  btnCloseVideo.addEventListener('click', () => {
    videoPlayer.pause()
    videoOverlay.classList.add('hidden')
    audio.play()
  })
}

function attachGlobalClickDelegation(): void {
  document.addEventListener('click', (_e) => {
    // We already handle the edit button via direct onclick in updateSidebarUI 
    // to ensure it always has the correct track context.
  })
}

function setActiveNav(target: string | HTMLElement): void {
  document.querySelectorAll('.sidebar li').forEach(li => {
    li.classList.remove('active')
  })
  const element = typeof target === 'string' ? document.getElementById(target) : target
  if (element) element.classList.add('active')
}

async function handleEditSidebarTrack(trackId?: string): Promise<void> {
  const targetUuid = trackId || sidebarTrack?.uuid
  if (!targetUuid) {
    console.warn('No track passed and no sidebarTrack found!')
    return
  }
  
  const track = library.find(t => t.uuid === targetUuid) || sidebarTrack
  if (!track) return

  trackBeingEdited = track
  inputEditTitle.value = track.title || track.fileName || ''
  inputEditArtist.value = track.artist || ''
  inputEditAlbum.value = track.album || ''
  inputEditKind.value = track.format || ''
  inputEditDescription.value = track.description || ''
  inputEditArtwork.value = '' 
  currentEditArtworkBase64 = track.cover || null
  
  if (track.cover) {
    previewEditArtwork.innerHTML = `<img src="${track.cover}">`
  } else {
    previewEditArtwork.innerHTML = (createPlaceholderMarkup as any)(track.title || track.fileName || '?')
  }

  modalContainer.classList.remove('hidden')
  editModal.classList.remove('hidden')
  playlistModal.classList.add('hidden')
  inputEditTitle.focus()
}

async function handleSaveEdit(): Promise<void> {
  if (!trackBeingEdited) return
  
  const track = trackBeingEdited
  const newTitle = inputEditTitle.value.trim()
  const newArtist = inputEditArtist.value.trim()
  const newAlbum = inputEditAlbum.value.trim()
  const newKind = inputEditKind.value.trim()
  const newDesc = inputEditDescription.value.trim()

  try {
    const updatedMetadata: any = {
      title: newTitle || track.title,
      artist: newArtist || track.artist,
      album: newAlbum || track.album,
      format: newKind || track.format,
      description: newDesc
    }

    if (currentEditArtworkBase64) {
      updatedMetadata.cover = currentEditArtworkBase64
    }
    
    await (window as any).api.updateTrack(track.uuid, updatedMetadata)
    
    // Update local object directly
    track.title = updatedMetadata.title
    track.artist = updatedMetadata.artist
    track.album = updatedMetadata.album
    track.format = updatedMetadata.format
    track.description = updatedMetadata.description
    
    if (updatedMetadata.cover) {
      track.cover = updatedMetadata.cover
    }
    
    // Refresh UI
    if (sidebarTrack && sidebarTrack.uuid === track.uuid) {
      updateSidebarUI(track)
    } else if (currentTrackIndex >= 0 && currentPlaylist[currentTrackIndex]?.uuid === track.uuid) {
      updateSidebarUI(track)
    }
    
    renderTrackList(lastTrackListView, lastListViewTitle)
    
    // Close modal
    modalContainer.classList.add('hidden')
    editModal.classList.add('hidden')
    trackBeingEdited = null
  } catch (err) {
    console.error('Failed to update track:', err)
    alert('Failed to save changes.')
  }
}

// Make it global for absolute reliability
;(window as any).handleEditSidebarTrack = handleEditSidebarTrack

async function handleAddFolder(): Promise<void> {
  console.log('handleAddFolder triggered')
  try {
    const paths = await (window as any).api.selectFolder()
    console.log('Selected paths:', paths)
    if (paths && paths.length > 0) {
      contentView.innerHTML = `
        <div class="welcome-screen">
          <div class="spinner"></div>
          <h2>Scanning Library...</h2>
          <p>Analyzing ${paths.length} source(s)...</p>
          <p>Please wait while we index your media.</p>
        </div>
      `
      
      for (const p of paths) {
        try {
          const result = await (window as any).api.scanFolder(p)
          console.log(`Scan result for ${p}:`, result)
        } catch (e) {
          console.error(`Failed scanning ${p}:`, e)
        }
      }
      await loadLibrary()
    }
  } catch (error) {
    console.error('Error in handleAddFolder:', error)
    alert('Failed to add media. Check console for details.')
    await loadLibrary() // Restore UI state
  }
}

async function handleSaveYoutube(): Promise<void> {
  const url = inputYTUrl.value.trim()
  
  if (!url) return alert('Please enter a YouTube URL')
  
  // Show visual feedback or disable button if you want
  const meta = await (window as any).api.getYTMeta(url)
  if (meta.error) return alert(meta.error)
  
  const uuid = self.crypto.randomUUID()
  const track = {
    uuid,
    title: meta.title || 'YouTube Video',
    artist: meta.author || 'YouTube',
    album: 'YouTube Visuals',
    file_path: url,
    format: 'youtube', 
    cover: meta.thumbnail,
    duration: 0,
    is_favorite: 0,
    description: ''
  }
  
  try {
    const result = await (window as any).api.upsertTrack(track)
    if (result && result.error) {
      alert(`Erro ao salvar no banco de dados: ${result.error}`)
      return
    }
  } catch (dbErr) {
    console.error('Database error on YT import:', dbErr)
    alert('Erro inesperado ao salvar a faixa do YouTube.')
    return
  }
  
  // Clear and close
  inputYTUrl.value = ''
  modalContainer.classList.add('hidden')
  youtubeModal.classList.add('hidden')
  
  await loadLibrary()
  
  // Optionally, automatically swap to "All Videos" to show the new item
  document.getElementById('btn-all-videos')?.click()
}



function renderTrackList(tracks: TrackMetadata[], title = 'All Songs'): void {
  // If we already have a sidebarTrack, try to keep it if it's in the list
  if (sidebarTrack) {
    const found = tracks.find(t => t.uuid === sidebarTrack?.uuid)
    if (found) {
      sidebarTrack = found
    }
  }

  // If no sidebarTrack or it wasn't found, pick a default
  if (!sidebarTrack) {
    if (currentTrackIndex >= 0 && currentPlaylist === tracks) {
      sidebarTrack = currentPlaylist[currentTrackIndex]
    } else if (tracks.length > 0) {
      sidebarTrack = tracks[0]
    }
  }

  const totalDuration = tracks.reduce((acc, t) => acc + (t.duration || 0), 0)

  contentView.innerHTML = `
    <div class="track-list-view">
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h2 class="view-title">${title}</h2>
          <p class="view-subtitle">${tracks.length} tracks available</p>
        </div>
        <div style="text-align: right;">
           <p class="view-subtitle" style="font-weight: 600; color: var(--accent);">${formatTime(totalDuration)} total time</p>
        </div>
      </div>
      
      <div id="selection-bar" class="selection-bar ${selectedTrackUuids.size > 0 ? '' : 'hidden'}">
        <span id="selection-count">${selectedTrackUuids.size} tracks selected</span>
        <button class="btn-danger small" id="btn-delete-selected">
          <i data-lucide="trash-2"></i> Delete Selected
        </button>
        <button class="btn-secondary small" id="btn-clear-selection">Clear</button>
      </div>
      
      <div class="track-view-container">
        <div class="track-list">
          ${tracks.map((track, index) => `
            <div class="track-item ${currentTrackIndex >= 0 && currentPlaylist[currentTrackIndex]?.uuid === track.uuid ? 'playing' : ''} ${selectedTrackUuids.has(track.uuid) ? 'selected' : ''}" 
                 data-index="${index}" 
                 data-uuid="${track.uuid}"
                 draggable="true">
              <div class="track-num">${index + 1}</div>
              <div class="track-name-cell" style="overflow: hidden;">
                <div class="track-name">${track.title || track.fileName || (track.filePath ? track.filePath.split(/[\\\/]/).pop() ?? 'Unknown' : 'Unknown')}</div>
                <div class="track-list-artist">${track.artist || 'Unknown'}</div>
                <div class="track-list-path" style="font-size: 10px; color: var(--text-muted); opacity: 0.6; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${track.filePath || ''}">${track.filePath || ''}</div>
              </div>
              <div class="track-album-cell">${track.album || 'Unknown Album'}</div>
              <div class="track-kind-cell" style="font-size: 13px; color: var(--text-muted); text-transform: uppercase;">${track.format || 'Unknown'}</div>
              <div class="track-duration" style="display:flex; align-items:center; justify-content:flex-end; gap:16px;">
                 ${formatTime(track.duration || 0)}
                 <button class="btn-icon circle-small btn-edit-list-item" data-uuid="${track.uuid}" title="Edit Metadata" style="transition:all 0.2s; background:var(--glass);" onclick="event.stopPropagation(); window.handleEditSidebarTrack('${track.uuid}')">
                   <i data-lucide="edit"></i>
                 </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `

  lastTrackListView = tracks
  lastListViewTitle = title
  
  // Update UI for the currently focused track in this list
  if (sidebarTrack) {
    updateSidebarUI(sidebarTrack)
  }
  
  document.querySelectorAll('.track-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const mouseEvent = e as MouseEvent
      const index = parseInt(item.getAttribute('data-index')!)
      const track = tracks[index]
      const uuid = item.getAttribute('data-uuid')!

      if (mouseEvent.metaKey || mouseEvent.ctrlKey) {
        // Toggle selection
        if (selectedTrackUuids.has(uuid)) {
          selectedTrackUuids.delete(uuid)
          item.classList.remove('selected')
        } else {
          selectedTrackUuids.add(uuid)
          item.classList.add('selected')
        }
      } else if (mouseEvent.shiftKey && selectedTrackUuids.size > 0) {
        // Range selection (simple implementation)
        const allItems = Array.from(document.querySelectorAll('.track-item'))
        const lastSelectedUuid = Array.from(selectedTrackUuids).pop()!
        const lastSelectedIndex = allItems.findIndex(i => i.getAttribute('data-uuid') === lastSelectedUuid)
        
        const start = Math.min(lastSelectedIndex, index)
        const end = Math.max(lastSelectedIndex, index)
        
        for (let i = start; i <= end; i++) {
          const itemToSelect = allItems[i]
          const uuidToSelect = itemToSelect.getAttribute('data-uuid')!
          selectedTrackUuids.add(uuidToSelect)
          itemToSelect.classList.add('selected')
        }
      } else {
        // Normal click: select just this one and play if double clicked or just stay selected
        // For better UX, single click selects, double click plays
        // But the previous behavior was single click plays. 
        // Let's make single click select, but if it was already selected, we play? 
        // Or just keep it simple: single click selects and plays (spotify style mostly)
        if (!selectedTrackUuids.has(uuid)) {
          document.querySelectorAll('.track-item.selected').forEach(i => i.classList.remove('selected'))
          selectedTrackUuids.clear()
          selectedTrackUuids.add(uuid)
          item.classList.add('selected')
        }
        
        currentPlaylist = tracks
        playTrack(index)
      }
      
      updateSidebarUI(track)
      updateSelectionUI()
    })

    item.addEventListener('dragstart', (e) => {
      const dragEvent = e as DragEvent
      const uuid = item.getAttribute('data-uuid')!
      dragEvent.dataTransfer?.setData('track-uuid', uuid)
    })
  })

  document.getElementById('btn-delete-selected')?.addEventListener('click', handleDeleteSelected)

  document.getElementById('btn-clear-selection')?.addEventListener('click', () => {
    selectedTrackUuids.clear()
    renderTrackList(tracks, title)
    if ((window as any).lucide) (window as any).lucide.createIcons()
  })
}

// Sidebar logic moved to bottom bar - Delegation for Edit button handles updates
function updateSidebarUI(track: TrackMetadata): void {
  if (!track) return
  sidebarTrack = track
  
  // Update Player Bar Details
  const displayName = track.title || track.fileName || (track.filePath ? track.filePath.replace(/^.*[\\\/]/, '') : 'Unknown Title')
  playerTitle.textContent = displayName
  playerArtist.textContent = track.artist ?? 'Unknown Artist'
  playerAlbum.textContent = track.album ?? 'Unknown Album'
  playerFormat.textContent = track.format?.toUpperCase() || 'AUDIO'

  if (track.cover) {
    playerArtwork.innerHTML = `<img src="${track.cover}">`
  } else {
    playerArtwork.innerHTML = (createPlaceholderMarkup as any)(displayName)
    // Fetch cover on demand if missing
    ;(window as any).api.getTrackCover(track.uuid, track.filePath).then(cover => {
      if (cover) {
        track.cover = cover
        playerArtwork.innerHTML = `<img src="${cover}">`
      }
    })
  }

  // Update Favorite status
  btnToggleFavorite.classList.toggle('active', !!track.is_favorite)

  if ((window as any).lucide) (window as any).lucide.createIcons()
  
  // Re-bind Edit Button explicitly
  const btnEdit = document.getElementById('btn-edit-track')
  if (btnEdit) {
    btnEdit.onclick = (e) => {
      e.stopPropagation()
      handleEditSidebarTrack()
    }
  }

  // Visually highlight the selected track in the list
  document.querySelectorAll('.track-item').forEach(item => {
    if (item.getAttribute('data-uuid') === track.uuid) {
      item.classList.add('selected')
    } else if (!selectedTrackUuids.has(item.getAttribute('data-uuid')!)) {
      item.classList.remove('selected')
    }
  })
}

// Removed attachSidebarListeners as we use delegation now


function updateSelectionUI(): void {
  const selectionBar = document.getElementById('selection-bar')
  const selectionCount = document.getElementById('selection-count')
  
  if (selectionBar && selectionCount) {
    if (selectedTrackUuids.size > 0) {
      selectionBar.classList.remove('hidden')
      selectionCount.textContent = `${selectedTrackUuids.size} tracks selected`
    } else {
      selectionBar.classList.add('hidden')
    }
  }
}

function attachGlobalKeyboardListeners(): void {
  window.addEventListener('keydown', (e) => {
    // Check if user is typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

    const isMod = e.metaKey || e.ctrlKey

    // Select All
    if (isMod && e.key.toLowerCase() === 'a') {
      if (lastTrackListView.length > 0) {
        e.preventDefault()
        selectedTrackUuids.clear()
        lastTrackListView.forEach(track => selectedTrackUuids.add(track.uuid))
        
        // Update UI
        document.querySelectorAll('.track-item').forEach(item => {
          item.classList.add('selected')
        })
        updateSelectionUI()
      }
    }

    // Delete
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (selectedTrackUuids.size > 0) {
        e.preventDefault()
        handleDeleteSelected()
      }
    }

    // Escape to clear
    if (e.key === 'Escape') {
      selectedTrackUuids.clear()
      document.querySelectorAll('.track-item').forEach(item => item.classList.remove('selected'))
      updateSelectionUI()
    }
  })
}

async function handleDeleteSelected(): Promise<void> {
  if (selectedTrackUuids.size === 0) return
  
  if (confirm(`Are you sure you want to delete ${selectedTrackUuids.size} tracks from the library?`)) {
    const uuids = Array.from(selectedTrackUuids)
    await (window as any).api.deleteTracks(uuids)
    selectedTrackUuids.clear()
    await loadLibrary()
  }
}

function renderAlbumGrid(): void {
  const albums: { [key: string]: TrackMetadata[] } = {}
  library.forEach(track => {
    const albumName = track.album || 'Unknown Album'
    if (!albums[albumName]) albums[albumName] = []
    albums[albumName].push(track)
  })

  contentView.innerHTML = `
    <div class="view-header">
      <h2 style="font-size:24px; font-weight:700; margin-bottom:24px;">Albums</h2>
    </div>
    <div class="album-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:24px;">
      ${Object.keys(albums).map(albumName => {
        const firstTrack = albums[albumName][0]
        return `
          <div class="album-card" data-album="${albumName}" style="background:var(--bg-card); border:1px solid var(--border); padding:16px; border-radius:var(--radius-lg); cursor:pointer; transition:all 0.2s ease;">
            <div class="album-cover" style="width:100%; aspect-ratio:1/1; border-radius:var(--radius-md); overflow:hidden; margin-bottom:12px; container-type: size;">
              ${firstTrack.cover ? `<img src="${firstTrack.cover}" style="width:100%; height:100%; object-fit:cover;">` : (createPlaceholderMarkup as any)(albumName)}
            </div>
            <div class="album-info">
              <h4 style="font-weight:600; font-size:15px; margin-bottom:2px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${albumName}</h4>
              <p style="color:var(--text-muted); font-size:13px;">${firstTrack.artist}</p>
            </div>
          </div>
        `
      }).join('')}
    </div>
  `

  document.querySelectorAll('.album-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedTrackUuids.clear()
      const albumName = card.getAttribute('data-album')!
      renderTrackList(albums[albumName], `Album: ${albumName}`)
    })
  })
}

function renderArtistGrid(): void {
  const artists: { [key: string]: TrackMetadata[] } = {}
  library.forEach(track => {
    const artistName = track.artist || 'Unknown Artist'
    if (!artists[artistName]) artists[artistName] = []
    artists[artistName].push(track)
  })

  contentView.innerHTML = `
    <div class="view-header">
      <h2 style="font-size:24px; font-weight:700; margin-bottom:24px;">Artists</h2>
    </div>
    <div class="artist-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap:24px;">
      ${Object.keys(artists).map(artistName => {
        const firstTrack = artists[artistName][0]
        return `
          <div class="artist-card" data-artist="${artistName}" style="background:var(--bg-card); border:1px solid var(--border); padding:16px; border-radius:var(--radius-lg); cursor:pointer; transition:all 0.2s ease; text-align:center;">
            <div class="artist-avatar" style="width:140px; height:140px; border-radius:50%; overflow:hidden; margin:0 auto 16px; container-type: size; border:1px solid var(--border);">
              ${firstTrack.cover ? `<img src="${firstTrack.cover}" style="width:100%; height:100%; object-fit:cover;">` : (createPlaceholderMarkup as any)(artistName)}
            </div>
            <div class="artist-info">
              <h4 style="font-weight:600; font-size:16px; margin-bottom:4px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${artistName}</h4>
              <p style="color:var(--text-muted); font-size:13px;">${artists[artistName].length} tracks</p>
            </div>
          </div>
        `
      }).join('')}
    </div>
  `

  document.querySelectorAll('.artist-card').forEach(card => {
    card.addEventListener('click', () => {
      selectedTrackUuids.clear()
      const artistName = card.getAttribute('data-artist')!
      renderTrackList(artists[artistName], `Artist: ${artistName}`)
    })
  })
}

function renderHistory(items: any[]): void {
  contentView.innerHTML = `
    <div class="track-list-view">
      <div class="view-header" style="display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 24px;">
        <div>
          <h2 class="view-title">Listening History</h2>
          <p class="view-subtitle">Your recently played tracks</p>
        </div>
      </div>
      
      <div class="track-view-container">
        <div class="track-list" style="padding-top: 8px;">
          ${items.length === 0 ? '<div style="padding: 24px; color: var(--text-muted); text-align: center;">No history recorded yet.</div>' : ''}
          ${items.map((item, index) => {
            const rawDate = item.played_at || ''
            const dateStr = rawDate ? new Date(rawDate.replace(' ', 'T') + 'Z').toLocaleString([], {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit'
            }) : 'Unknown Time'
            return `
            <div class="track-item" style="cursor: pointer; display: grid; grid-template-columns: 40px 56px 1fr 180px; align-items: center; padding: 12px 16px; gap: 8px; border-radius: var(--radius-md);" data-uuid="${item.uuid}" data-index="${index}">
              <div class="track-num">${index + 1}</div>
              <div style="width: 48px; height: 48px; border-radius: var(--radius-sm); overflow: hidden; background: var(--glass); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 10px rgba(0,0,0,0.2);">
                ${item.cover ? `<img src="${item.cover}" style="width:100%; height:100%; object-fit:cover;">` : `<i data-lucide="music" style="color:var(--text-muted); width:20px; height:20px;"></i>`}
              </div>
              <div class="track-name-cell" style="overflow: hidden; padding-right: 16px;">
                <div class="track-name" style="font-size: 15px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; overflow: hidden; color: var(--text-main);">${item.title || 'Unknown Title'}</div>
                <div class="track-list-artist" style="font-size: 13px; color: var(--text-muted); text-overflow: ellipsis; white-space: nowrap; overflow: hidden;">${item.artist || 'Unknown Artist'}</div>
              </div>
              <div style="display: flex; justify-content: flex-end;">
                <span class="tag small" style="background: rgba(255, 255, 255, 0.05); color: var(--text-muted); padding: 4px 10px; font-size: 11px; font-weight: 600; border-radius: 6px; letter-spacing: 0.5px; border: 1px solid rgba(255, 255, 255, 0.05);">${dateStr}</span>
              </div>
            </div>
            `
          }).join('')}
        </div>
      </div>
    </div>
  `
  
  if ((window as any).lucide) (window as any).lucide.createIcons()

  document.querySelectorAll('.track-item').forEach(item => {
    item.addEventListener('click', (e) => {
      const mouseEvent = e as MouseEvent
      const index = parseInt(item.getAttribute('data-index')!)
      const track = items[index]
      const uuid = track.uuid

      if (mouseEvent.metaKey || mouseEvent.ctrlKey) {
        if (selectedTrackUuids.has(uuid)) {
          selectedTrackUuids.delete(uuid)
          item.classList.remove('selected')
        } else {
          selectedTrackUuids.add(uuid)
          item.classList.add('selected')
        }
      } else {
        if (!selectedTrackUuids.has(uuid)) {
          document.querySelectorAll('.track-item.selected').forEach(i => i.classList.remove('selected'))
          selectedTrackUuids.clear()
          selectedTrackUuids.add(uuid)
          item.classList.add('selected')
        }
        currentPlaylist = items
        playTrack(index)
      }
      
      // We must check if updateSidebarUI exists and run it
      if (typeof updateSidebarUI === 'function') {
        updateSidebarUI(track)
      }
    })
  })
}

function renderStatistics(stats: any): void {
  contentView.innerHTML = `
    <div class="stats-view-scrollable">
      <div class="view-header">
        <h2 class="view-title">Your Statistics</h2>
        <p class="view-subtitle">Insights into your listening habits</p>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; margin-bottom: 32px;">
        <!-- Listening Time -->
        <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
          <h3 style="color: var(--text-muted); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Listening Time (Last 30 Days)</h3>
          <div style="font-size: 36px; font-weight: 700; color: var(--accent);">${stats.hoursListenedLastMonth.toFixed(1)} <span style="font-size: 13px; font-weight: 400;">hrs</span></div>
          <div style="color: var(--text-muted); font-size: 13px;">Music played locally</div>
        </div>

        <!-- Library Size -->
        <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
          <h3 style="color: var(--text-muted); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Library Size</h3>
          <div style="font-size: 36px; font-weight: 700; color: var(--accent);">${stats.totalTracks || 0} <span style="font-size: 13px; font-weight: 400;">tracks</span></div>
          <div style="color: var(--text-muted); font-size: 13px;">Across ${stats.totalAlbums || 0} unique albums</div>
        </div>

        <!-- Favorite Format -->
        <div style="background: var(--bg-card); padding: 24px; border-radius: var(--radius-lg); border: 1px solid var(--border); display: flex; flex-direction: column; gap: 8px;">
          <h3 style="color: var(--text-muted); font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Favorite Audio Format</h3>
          <div style="font-size: 36px; font-weight: 700; color: var(--accent); text-transform: uppercase;">${stats.topFormat}</div>
          <div style="color: var(--text-muted); font-size: 13px;">Most frequently played file type</div>
        </div>
      </div>

      <div class="stats-grid-2-1">
        <!-- Top Tracks -->
        <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden;">
          <div style="padding: 24px; border-bottom: 1px solid var(--border);">
            <h3 style="font-size: 18px; font-weight: 600;">Top 10 Most Listened Tracks</h3>
          </div>
          <div class="track-list" style="padding: 12px;">
            ${stats.topTracks.length > 0 ? stats.topTracks.map((track: any, index: number) => `
              <div class="track-item" style="cursor: default;" data-uuid="${track.uuid}">
                <div class="track-num">${index + 1}</div>
                <div class="track-name-cell" style="overflow: hidden;">
                  <div class="track-name">${track.title || 'Unknown Title'}</div>
                  <div class="track-list-artist">${track.artist || 'Unknown Artist'}</div>
                  <div class="track-list-path" style="font-size: 10px; color: var(--text-muted); opacity: 0.6; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${track.filePath || ''}">${track.filePath || ''}</div>
                </div>
                <div class="track-album-cell" style="flex: 1; align-items: center; justify-content: flex-end; padding-right: 24px;">
                  <span class="tag small" style="background: var(--glass); color: var(--accent);">${track.playCount} Plays</span>
                </div>
              </div>
            `).join('') : '<div style="padding: 24px; color: var(--text-muted);">No play history recorded yet.</div>'}
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 24px;">
          <!-- Favorite Types Breakdown -->
          <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; height: fit-content;">
            <div style="padding: 24px; border-bottom: 1px solid var(--border);">
              <h3 style="font-size: 18px; font-weight: 600;">Favorited Formats</h3>
            </div>
            <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
              ${stats.favoriteTypes.length > 0 ? stats.favoriteTypes.map((type: any) => `
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="text-transform: uppercase; font-weight: 600; color: var(--text-main);">${type.format || 'Unknown'}</span>
                  <span style="color: var(--text-muted);">${type.count} tracks</span>
                </div>
              `).join('') : '<div style="color: var(--text-muted);">No favorited tracks yet.</div>'}
            </div>
          </div>
          
          <!-- Most Active Hours -->
          <div style="background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border); overflow: hidden; height: fit-content;">
            <div style="padding: 24px; border-bottom: 1px solid var(--border);">
              <h3 style="font-size: 18px; font-weight: 600;">Most Active Hours</h3>
            </div>
            <div style="padding: 24px; display: flex; flex-direction: column; gap: 16px;">
              ${(() => {
                if (!stats.activeHours || stats.activeHours.length === 0) return '<div style="color: var(--text-muted);">No activity recorded yet.</div>';
                const maxCount = Math.max(...stats.activeHours.map((h: any) => h.count));
                return stats.activeHours.map((hourObj: any) => {
                  const percentage = (hourObj.count / maxCount) * 100;
                  return `
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 13px;">
                        <span style="font-weight: 600; color: var(--text-main);">${hourObj.hour}:00 - ${parseInt(hourObj.hour) + 1}:00</span>
                        <span style="color: var(--text-muted);">${hourObj.count} plays</span>
                      </div>
                      <div style="width: 100%; height: 6px; background: var(--glass); border-radius: 4px; overflow: hidden;">
                        <div style="width: ${percentage}%; height: 100%; background: var(--accent); border-radius: 4px;"></div>
                      </div>
                    </div>
                  `;
                }).join('');
              })()}
            </div>
          </div>
        </div>
      </div>
    </div>
  `
}

function playTrack(index: number): void {
  // If playing a regular track from library, reset radio mode
  if (!currentPlaylist[index]?.filePath?.startsWith('http') && !currentPlaylist[index]?.format?.includes('stream')) {
    isRadioMode = false
  }

  if (index < 0 || index >= currentPlaylist.length) return
  
  currentTrackIndex = index
  const track = currentPlaylist[index]
  const safePath = track.filePath.split(/[\\/]/).map(encodeURIComponent).join('/')
  const fileUrl = track.filePath.startsWith('http') ? track.filePath : `local://${safePath}`

  console.log('playTrack: Preparing track:', { index, title: track.title, url: fileUrl, isRadioMode })

  if (!isRadioMode && (window as any).api.recordPlay && track.uuid) {
    (window as any).api.recordPlay(track.uuid)
  }

  // Cleanup: if we were previously playing a YouTube video (iframe) and now switching formats, reset DOM
  const ytIframe = document.getElementById('yt-iframe');
  if (ytIframe && track.format !== 'youtube') {
    const container = document.getElementById('video-overlay')!
    container.innerHTML = `
      <video id="video-player" controls></video>
      <button id="btn-close-video" class="btn-icon circle"><i data-lucide="x"></i></button>
    `
    videoPlayer = document.getElementById('video-player') as HTMLVideoElement
    btnCloseVideo = document.getElementById('btn-close-video')!
    btnCloseVideo.onclick = () => {
      videoPlayer.pause()
      videoOverlay.classList.add('hidden')
      audio.play()
    }
    if ((window as any).lucide) (window as any).lucide.createIcons()
  }

  if (track.format === 'youtube') {
    audio.pause()
    videoOverlay.classList.remove('hidden')
    
    const match = track.filePath.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)
    const ytId = match ? match[1] : track.filePath.split('/').pop()

    const container = document.getElementById('video-overlay')!
    container.innerHTML = `
      <iframe id="yt-iframe" width="100%" height="100%" src="https://www.youtube.com/embed/${ytId}?autoplay=1&origin=https://www.youtube.com" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      <button id="btn-close-video" class="btn-icon circle"><i data-lucide="x"></i></button>
    `
    document.getElementById('btn-close-video')!.onclick = () => {
      container.innerHTML = `
        <video id="video-player" controls></video>
        <button id="btn-close-video" class="btn-icon circle"><i data-lucide="x"></i></button>
      `
      videoPlayer = document.getElementById('video-player') as HTMLVideoElement
      btnCloseVideo = document.getElementById('btn-close-video')!
      btnCloseVideo.onclick = () => {
        videoPlayer.pause()
        videoOverlay.classList.add('hidden')
        audio.play()
      }
      videoOverlay.classList.add('hidden')
      audio.play()
      if ((window as any).lucide) (window as any).lucide.createIcons()
    }
  } else if (track.format === 'mp4') {
    audio.pause()
    videoOverlay.classList.remove('hidden')
    videoPlayer.src = fileUrl
    videoPlayer.play()
  } else {
    videoOverlay.classList.add('hidden')
    videoPlayer.pause()
    
    // IMPORTANT: Clear previous state and remove crossOrigin for anonymous/public files
    // CrossOrigin "anonymous" requires the server to return Access-Control-Allow-Origin headers.
    // Many file servers don't. Standard playback works find without it (opaque mode).
    audio.removeAttribute('crossorigin')
    
    if (fileUrl.startsWith('http')) {
      audio.preload = "auto"
    }
    
    audio.pause()
    audio.src = fileUrl
    
    console.log('playTrack: Loading source:', fileUrl)
    
    // Safety check for volume/mute on radio start
    if (fileUrl.startsWith('http')) {
      audio.muted = false
      if (audio.volume === 0) audio.volume = 0.5
      updateVolume(audio.volume * 100)
    }

    audio.load() 

    audio.play().then(() => {
      console.log('playTrack: Successfully started playing:', fileUrl)
    }).catch(err => {
      console.error('playTrack: Audio Playback Error:', err)
      if (fileUrl.startsWith('http') && (window as any).showRadioToast) {
        ;(window as any).showRadioToast(`Playback Blocked: ${err.message || 'Network/Protocol error'}`)
      }
    })
  }
  
  const displayName = track.title || track.fileName || (track.filePath ? track.filePath.replace(/^.*[\\\/]/, '') : 'Unknown Title')
  playerTitle.textContent = displayName
  playerArtist.textContent = track.artist ?? 'Unknown Artist'
  playerAlbum.textContent = track.album ?? 'Unknown Album'
  playerFormat.textContent = track.format?.toUpperCase() || 'AUDIO'

  // Update visual highlight in radio detail if currently viewed
  if (isRadioMode && currentRadioBeingViewed) {
    document.querySelectorAll('.track-item').forEach((element, i) => {
      const item = element as HTMLElement
      if (i === currentTrackIndex) {
        item.classList.add('playing')
        item.style.background = 'rgba(255,255,255,0.1)'
        item.style.opacity = '1'
        const num = item.querySelector('.track-num') as HTMLElement
        const name = item.querySelector('.track-name') as HTMLElement
        if (num) num.style.color = 'var(--accent)'
        if (name) name.style.color = 'var(--accent)'
      } else {
        item.classList.remove('playing')
        item.style.background = 'transparent'
        item.style.opacity = '0.6'
        const num = item.querySelector('.track-num') as HTMLElement
        const name = item.querySelector('.track-name') as HTMLElement
        if (num) num.style.color = 'inherit'
        if (name) name.style.color = 'inherit'
      }
    })
  }
  
  if (track.cover) {
    playerArtwork.innerHTML = `<img src="${track.cover}">`
  } else {
    playerArtwork.innerHTML = (createPlaceholderMarkup as any)(displayName)
    // Only fetch cover from disk if it's a local file and not in radio mode
    if (!isRadioMode && !track.filePath.startsWith('http')) {
      ;(window as any).api.getTrackCover(track.uuid, track.filePath).then(cover => {
        if (cover) {
          track.cover = cover
          playerArtwork.innerHTML = `<img src="${cover}">`
        }
      })
    }
  }

  updateSidebarUI(track)
  saveSession() 
  
  btnPlayPause.innerHTML = '<i data-lucide="pause"></i>'
  if ((window as any).lucide) (window as any).lucide.createIcons()

  // Show system notification
  if ('Notification' in window) {
    const showNotification = () => {
      new Notification(displayName, {
        body: `${track.artist || 'Unknown Artist'} • ${track.album || 'Unknown Album'}`,
        icon: track.cover || undefined,
        silent: true
      })
    }
    if (Notification.permission === 'granted') {
      showNotification()
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') showNotification()
      })
    }
  }
}

function togglePlay(): void {
  const isVideo = !videoOverlay.classList.contains('hidden')
  const currentPlayer = isVideo ? videoPlayer : audio

  if (currentPlayer.paused) {
    if (currentPlayer.src) {
      currentPlayer.play()
      btnPlayPause.innerHTML = '<i data-lucide="pause"></i>'
    } else if (currentPlaylist.length > 0) {
      playTrack(0)
    }
  } else {
    currentPlayer.pause()
    btnPlayPause.innerHTML = '<i data-lucide="play"></i>'
  }
  if ((window as any).lucide) (window as any).lucide.createIcons()
}

function playNext(e?: Event): void {
  if (isRadioMode && e && e.type === 'click') {
    if ((window as any).showRadioToast) (window as any).showRadioToast("Broadcast Logic: Manual skipping is disabled.")
    return
  }
  
  if (isShuffle && !isRadioMode) {
    playTrack(Math.floor(Math.random() * currentPlaylist.length))
  } else {
    let nextIndex = currentTrackIndex + 1
    if (nextIndex >= currentPlaylist.length) nextIndex = 0
    playTrack(nextIndex)
  }
}

function playPrev(e?: Event): void {
  if (isRadioMode && e && e.type === 'click') {
    if ((window as any).showRadioToast) (window as any).showRadioToast("Broadcast Logic: Manual skipping is disabled.")
    return
  }
  
  let prevIndex = currentTrackIndex - 1
  if (prevIndex < 0) prevIndex = currentPlaylist.length - 1
  playTrack(prevIndex)
}

function handleTrackEnded(): void {
  if (repeatMode === 'one') {
    audio.currentTime = 0
    audio.play()
  } else {
    playNext()
  }
}

function updatePlaybackProgress(): void {
  const isVideo = !videoOverlay.classList.contains('hidden')
  const player = isVideo ? videoPlayer : audio
  const current = player.currentTime
  const duration = player.duration || 0
  
  currentTimeLabel.textContent = formatTime(current)
  seekSlider.value = current.toString()
  
  const percent = (current / duration) * 100
  seekFill.style.width = `${percent}%`

  // Continuous save for robustness (every 2 seconds)
  if (Math.floor(current) % 2 === 0) {
    saveSession()
  }
}

function saveSession(): void {
  if (currentTrackIndex < 0 || !currentPlaylist[currentTrackIndex]) return
  
  const session = {
    trackUuid: currentPlaylist[currentTrackIndex].uuid,
    playlistUuids: currentPlaylist.map(t => t.uuid),
    position: !videoOverlay.classList.contains('hidden') ? videoPlayer.currentTime : audio.currentTime,
    volume: volumeSlider.value,
    timestamp: Date.now()
  }
  localStorage.setItem('blackbird-session', JSON.stringify(session))
}

async function loadSession(): Promise<void> {
  const saved = localStorage.getItem('blackbird-session')
  if (!saved) return

  try {
    const session = JSON.parse(saved)
    if (session.volume) {
      updateVolume(parseInt(session.volume))
    }

    // Give the library a moment to load if needed, though loadLibrary is called before init finishes
    if (library.length === 0) {
      library = await (window as any).api.getLibrary()
    }

    if (session.trackUuid) {
      const trackIdx = library.findIndex(t => t.uuid === session.trackUuid)
      if (trackIdx >= 0) {
        console.log('Restoring session:', session)
        currentPlaylist = library 
        currentTrackIndex = trackIdx
        const track = library[trackIdx]
        
        const safePath = track.filePath.split(/[\\/]/).map(encodeURIComponent).join('/')
        const fileUrl = track.filePath.startsWith('http') ? track.filePath : `local://${safePath}`
        audio.src = fileUrl
        
        updateSidebarUI(track)
        
        const displayName = track.title || track.fileName || (track.filePath ? track.filePath.replace(/^.*[\\\/]/, '') : 'Unknown Title')
        playerTitle.textContent = displayName
        playerArtist.textContent = track.artist ?? 'Unknown Artist'
        playerAlbum.textContent = track.album ?? 'Unknown Album'
        playerFormat.textContent = track.format?.toUpperCase() || 'AUDIO'
        
        // CRITICAL: Must wait for metadata to set currentTime
        audio.addEventListener('loadedmetadata', () => {
          if (session.position) {
            audio.currentTime = session.position
          }
          updatePlaybackProgress()
        }, { once: true })
      }
    }
  } catch (e) {
    console.error('Failed to load session:', e)
  }
}

function updateVolume(value: number): void {
  const volume = value / 100
  audio.volume = volume
  videoPlayer.volume = volume
  volumeSlider.value = value.toString()
  volumeFill.style.width = `${value}%`
}

function toggleShuffle(): void {
  isShuffle = !isShuffle
  btnShuffle.classList.toggle('active', isShuffle)
}

function toggleRepeat(): void {
  if (repeatMode === 'all') {
    repeatMode = 'one'
    btnRepeat.classList.add('active')
    btnRepeat.innerHTML = '<i data-lucide="repeat-1"></i>'
  } else if (repeatMode === 'one') {
    repeatMode = 'none'
    btnRepeat.classList.remove('active')
    btnRepeat.innerHTML = '<i data-lucide="repeat"></i>'
  } else {
    repeatMode = 'all'
    btnRepeat.classList.add('active')
    btnRepeat.innerHTML = '<i data-lucide="repeat"></i>'
  }
  if ((window as any).lucide) (window as any).lucide.createIcons()
}

function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds === 0) return '0:00'
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)
  
  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

document.addEventListener('DOMContentLoaded', init)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init()
}

/**
 * Radio & Streaming Implementation
 */
async function renderRadioStreaming(): Promise<void> {
  contentView.innerHTML = `
    <div class="view-header" style="display:flex; justify-content:space-between; align-items:flex-end; margin-bottom:32px;">
      <div>
        <h2 class="view-title">Music Radio</h2>
        <p class="view-subtitle">Live broadcasts and curated digital streams</p>
      </div>
      <button class="btn-primary" id="btn-add-station"><i data-lucide="plus"></i> Add Radio</button>
    </div>
    
    <div id="radio-grid" class="radio-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap:24px;">
       <div style="padding: 60px; text-align: center; grid-column: 1/-1; color: var(--text-muted); background:var(--bg-card); border-radius:32px; border:1px dashed var(--border);">
         <i data-lucide="loader" class="spinner" style="margin-bottom:16px; width:32px; height:32px;"></i>
         <p>Connecting to broadcast network...</p>
       </div>
    </div>
  `
  if ((window as any).lucide) (window as any).lucide.createIcons()

  document.getElementById('btn-add-station')?.addEventListener('click', () => {
    modalContainer.classList.remove('hidden')
    radioModal.classList.remove('hidden')
  })

  // Get Stations
  let userRadios: any[] = []
  try {
    userRadios = await (window as any).api.getUserRadios()
  } catch (e) { console.warn(e) }
  
  const nmcRadio = {
    id: 'nmc-default',
    name: 'NMC Radio',
    url: 'https://nmc.pagefai.com/uploads/nmc-radio.json',
    isDefault: true
  }

  const allStations = [nmcRadio, ...userRadios]
  const grid = document.getElementById('radio-grid')!
  
  grid.innerHTML = allStations.map(station => `
    <div class="radio-card" data-id="${station.id}" style="background:var(--bg-card); border:1px solid var(--border); border-radius:24px; padding:24px; cursor:pointer; transition:all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); position:relative; overflow:hidden; min-height:180px; display:flex; flex-direction:column; justify-content:space-between;">
      <div style="position:relative; z-index:2;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:12px;">
           <div style="width:48px; height:48px; background:var(--accent-glow); border-radius:14px; display:flex; align-items:center; justify-content:center;">
             <i data-lucide="radio" style="color:var(--accent); width:24px; height:24px;"></i>
           </div>
           ${!station.isDefault ? `<button class="btn-delete-radio" data-id="${station.id}" style="background:rgba(255,255,255,0.05); border:none; color:var(--text-muted); cursor:pointer; padding:8px; border-radius:12px;"><i data-lucide="trash-2" style="width:16px;"></i></button>` : ''}
        </div>
        <h3 style="font-size:20px; font-weight:700; margin-bottom:6px; letter-spacing:-0.5px;">${station.name}</h3>
        <p style="color:var(--text-muted); font-size:12px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:0.8;">${station.url}</p>
      </div>
      
      <div style="display:flex; align-items:center; gap:8px; margin-top:16px;">
         <span style="display:flex; align-items:center; gap:4px; background:rgba(255,255,255,0.05); border:1px solid var(--border); font-size:9px; font-weight:800; padding:3px 10px; border-radius:100px; text-transform:uppercase; letter-spacing:0.5px;">
           <span style="width:6px; height:6px; border-radius:50%; background:#22c55e; box-shadow:0 0 8px #22c55e;"></span> LIVE
         </span>
         ${station.isDefault ? '<span style="background:var(--accent-glow); color:var(--accent); font-size:9px; font-weight:800; padding:3px 10px; border-radius:100px; text-transform:uppercase; border:1px solid var(--accent);">Default</span>' : ''}
      </div>
    </div>
  `).join('')

  if ((window as any).lucide) (window as any).lucide.createIcons()

  document.querySelectorAll('.radio-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.btn-delete-radio')) return
      const id = card.getAttribute('data-id')
      const station = allStations.find(s => s.id === id)
      if (station) renderRadioDetail(station)
    })
  })

  document.querySelectorAll('.btn-delete-radio').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation()
      const id = btn.getAttribute('data-id')!
      if (confirm('Delete this radio station?')) {
        await (window as any).api.deleteUserRadio(id)
        renderRadioStreaming()
      }
    })
  })
}

async function renderRadioDetail(station: any): Promise<void> {
  currentRadioBeingViewed = station
  contentView.innerHTML = `
    <div class="radio-detail-view" style="padding: 32px; height:100%; display:flex; flex-direction:column;">
      <div class="radio-hero" style="display:flex; gap:32px; align-items:center; margin-bottom:40px;">
        <div class="radio-large-cover" style="width:180px; height:180px; background:var(--glass); border:1px solid var(--border); border-radius:24px; display:flex; align-items:center; justify-content:center; box-shadow: 0 20px 40px rgba(0,0,0,0.3);">
           <i data-lucide="radio" style="width:64px; height:64px; color:var(--accent);"></i>
        </div>
        <div style="flex:1;">
          <h1 style="font-size:40px; font-weight:800; margin-bottom:8px; letter-spacing:-1px;">${station.name}</h1>
          <p style="color:var(--text-muted); margin-bottom:24px; font-size:16px;">${station.url}</p>
          <div style="display:flex; gap:12px;">
            <button class="btn-primary" id="btn-start-listening" style="padding: 12px 32px; font-weight:600; display:flex; align-items:center; gap:10px;">
              <i data-lucide="play"></i> Start Listening
            </button>
            <button class="btn-secondary" id="btn-back-to-radios">Back to Radios</button>
          </div>
        </div>
      </div>

      <div class="tracklist-container" style="flex:1; background:rgba(0,0,0,0.2); border:1px solid var(--border); border-radius:32px; overflow:hidden; display:flex; flex-direction:column;">
         <div style="padding:20px 24px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02);">
           <span style="font-weight:800; text-transform:uppercase; letter-spacing:2px; font-size:11px; color:var(--accent);">Streaming</span>
           <span id="track-status" style="font-size:12px; font-weight:600; color:var(--text-muted); display:flex; align-items:center; gap:6px;"><span style="width:8px; height:8px; background:#22c55e; border-radius:50%;"></span> Live Feed</span>
         </div>
         <div id="radio-tracks-list" style="flex:1; overflow-y:auto; padding:12px;">
           <div style="padding:60px; text-align:center; color:var(--text-muted);">
             <i data-lucide="loader" class="spinner" style="margin-bottom:16px; width:32px; height:32px;"></i>
             <p style="font-weight:500;">Connecting to digital broadcast feed...</p>
           </div>
         </div>
      </div>
    </div>
  `
  if ((window as any).lucide) (window as any).lucide.createIcons()

  const listContainer = document.getElementById('radio-tracks-list')!
  const btnListen = document.getElementById('btn-start-listening')!
  const btnBack = document.getElementById('btn-back-to-radios')!

  btnBack.addEventListener('click', () => {
    renderRadioStreaming()
  })

  const isThisPlaying = () => {
    return isRadioMode && audio.src === station.url && !audio.paused
  }

  const updateListenButton = () => {
    if (isThisPlaying()) {
      btnListen.innerHTML = '<i data-lucide="square"></i> Stop Listening'
      btnListen.classList.replace('btn-primary', 'btn-danger')
    } else {
      btnListen.innerHTML = '<i data-lucide="play"></i> Start Listening'
      btnListen.classList.replace('btn-danger', 'btn-primary')
    }
    if ((window as any).lucide) (window as any).lucide.createIcons()
  }

  btnListen.onclick = () => {
    if (isThisPlaying()) {
      audio.pause()
      isRadioMode = false
      updateListenButton()
    } else {
      btnListen.innerHTML = '<i data-lucide="loader" class="spinner"></i> Connecting...'
      isRadioMode = true
      currentPlaylist = station.tracks || [{ uuid: station.id, title: station.name, filePath: station.url, format: 'stream' }]
      playTrack(0)
      updateListenButton()
    }
  }

  // Fetch Tracks safely via Main Process (Proxy)
  try {
     console.log('Fetching radio tracks from:', station.url)
     let tracks: TrackMetadata[] = []
     
     if (station.url.endsWith('.json')) {
       // Use our new CORS-free fetcher in Main process
       const data = await (window as any).api.fetchRemoteJson(station.url)
       if (data && !data.error) {
         tracks = data.tracks || []
       } else {
         throw new Error(data?.error || 'Failed to parse JSON')
       }
     } else {
       // Single stream link fallback
       tracks = [{ uuid: station.id, title: station.name, artist: 'Live Stream', album: 'Radio', filePath: station.url, fileName: station.name, format: 'stream' }]
     }
     
     station.tracks = tracks
     
     if (tracks.length === 0) {
       listContainer.innerHTML = `<div style="padding:40px; text-align:center; color:var(--text-muted); opacity: 0.7;">No tracks available for this broadcast feed.</div>`
     } else {
       listContainer.innerHTML = tracks.map((t: any, i: number) => `
         <div class="track-item" data-index="${i}" style="display:flex; align-items:center; padding:10px 16px; border-radius:12px; cursor:default; margin-bottom:4px; transition:all 0.2s; background: rgba(255,255,255,0.02); border: 1px solid transparent;">
            <div class="track-num" style="width:30px; font-size:12px; font-weight:700; color: var(--text-muted);">${(i + 1).toString().padStart(2, '0')}</div>
            <div style="flex:1;">
               <div class="track-name" style="font-weight:600; font-size: 14px;">${t.title}</div>
               <div style="font-size:12px; color:var(--text-muted);">${t.artist || 'Unknown Artist'}</div>
            </div>
            <div style="font-size:11px; color:var(--text-muted); font-weight: 500;">${t.duration ? formatTime(t.duration) : 'LIVE'}</div>
         </div>
       `).join('')
     }
  } catch (e) {
    console.error('Radio fetch error:', e)
    listContainer.innerHTML = `
      <div style="padding:40px; text-align:center; color:var(--text-muted);">
        <i data-lucide="wifi-off" style="width:32px; height:32px; margin-bottom:12px; opacity:0.5;"></i>
        <p>Station is currently offline or unreachable.</p>
        <p style="font-size:11px; margin-top:8px;">Check your connection or the URL provider.</p>
      </div>
    `
    if ((window as any).lucide) (window as any).lucide.createIcons()
  }
}

async function handleCastScan(): Promise<void> {
  castDeviceList.innerHTML = '<div style="padding:20px; text-align:center;"><i data-lucide="loader" class="spinner"></i> Searching for devices...</div>'
  if ((window as any).lucide) (window as any).lucide.createIcons()

  try {
    const devices = await (window as any).api.getCastDevices()
    if (!devices || devices.length === 0) {
      castDeviceList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">No compatible devices found in your network.</div>'
    } else {
      castDeviceList.innerHTML = devices.map((d: any) => `
        <div class="cast-device-item" data-id="${d.id}" style="padding:16px; border-radius:12px; background:rgba(255,255,255,0.05); border:1px solid var(--border); cursor:pointer; margin-bottom:8px; display:flex; align-items:center; gap:12px;">
           <i data-lucide="${d.type === 'tv' ? 'tv' : 'speaker'}"></i>
           <div style="flex:1;">
              <div style="font-weight:600;">${d.name}</div>
              <div style="font-size:12px; color:var(--text-muted);">${d.address}</div>
           </div>
           <span class="tag" style="background:var(--accent-glow); color:var(--accent);">Connect</span>
        </div>
      `).join('')
      
      document.querySelectorAll('.cast-device-item').forEach(item => {
        (item as HTMLElement).onclick = async () => {
          const id = item.getAttribute('data-id')!
          showRadioToast(`Connecting to ${id}...`)
        }
      })
    }
  } catch (err) {
    castDeviceList.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-muted);">Failed to scan for devices.</div>'
  }
  if ((window as any).lucide) (window as any).lucide.createIcons()
}

function showRadioToast(message: string): void {
  const toast = document.createElement('div')
  toast.className = 'radio-toast'
  toast.style.cssText = `
    position: fixed;
    bottom: 100px;
    left: 50%;
    transform: translateX(-50%) translateY(20px);
    background: var(--accent);
    color: #000;
    padding: 12px 24px;
    border-radius: 100px;
    font-weight: 700;
    font-size: 13px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.5);
    z-index: 9999;
    pointer-events: none;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    opacity: 0;
  `
  toast.innerHTML = `<div style="display:flex; align-items:center; gap:10px;"><i data-lucide="info" style="width:16px;"></i> ${message}</div>`
  document.body.appendChild(toast)
  
  if ((window as any).lucide) (window as any).lucide.createIcons()

  requestAnimationFrame(() => {
    toast.style.opacity = '1'
    toast.style.transform = 'translateX(-50%) translateY(0)'
  })

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transform = 'translateX(-50%) translateY(20px)'
    setTimeout(() => toast.remove(), 300)
  }, 4000)
}

;(window as any).showRadioToast = showRadioToast
;(window as any).renderRadioStreaming = renderRadioStreaming
