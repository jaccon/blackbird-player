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
}

export interface Playlist {
  id: string;
  name: string;
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

const audio = new Audio()
let videoPlayer: HTMLVideoElement
let videoOverlay: HTMLElement
let btnCloseVideo: HTMLElement

// DOM Elements
let contentView: HTMLElement
let btnAddFolder: HTMLElement
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
let inputEditArtwork: HTMLInputElement
let previewEditArtwork: HTMLElement
let currentEditArtworkBase64: string | null = null
let searchInput: HTMLInputElement
let btnImportMedia: HTMLElement
let btnImportYoutube: HTMLElement
let youtubeModal: HTMLElement
let selectPlaylistModal: HTMLElement
let btnSaveYoutube: HTMLElement
let inputYTUrl: HTMLInputElement
let inputYTTitle: HTMLInputElement
let inputYTDescription: HTMLTextAreaElement
let importPlaylistOptions: HTMLElement

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
    btnAddFolder = document.getElementById('btn-add-folder')!
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
    selectPlaylistModal = document.getElementById('select-playlist-modal')!
    btnSaveYoutube = document.getElementById('btn-save-youtube')!
    inputYTUrl = document.getElementById('yt-url') as HTMLInputElement
    inputYTTitle = document.getElementById('yt-title') as HTMLInputElement
    inputYTDescription = document.getElementById('yt-description') as HTMLTextAreaElement
    importPlaylistOptions = document.getElementById('import-playlist-options')!
    inputEditAlbum = document.getElementById('edit-album') as HTMLInputElement
    inputEditArtwork = document.getElementById('edit-artwork-input') as HTMLInputElement
    previewEditArtwork = document.getElementById('edit-artwork-preview')!

    // Inject Theme Selector into Sidebar Footer
    const footer = document.querySelector('.sidebar-footer')
    if (footer) {
      footer.innerHTML = `
        <div class="footer-controls" style="display:flex; flex-direction:column; gap:12px; width:100%; align-items:center;">
          <button class="btn-primary" id="btn-add-folder" style="width:100%;">Add Music Folder</button>
          <select id="theme-selector" style="width:100%; background:var(--glass); color:var(--text-main); border:1px solid var(--border); padding:8px; border-radius:var(--radius-md); font-family:inherit;">
            <option value="">Select Theme</option>
          </select>
        </div>
      `
      btnAddFolder = document.getElementById('btn-add-folder')!
      themeSelector = document.getElementById('theme-selector') as HTMLSelectElement
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

  themeSelector.addEventListener('change', () => {
    const theme = availableThemes.find(t => t.name === themeSelector.value)
    if (theme) {
      applyTheme(theme)
      localStorage.setItem('selected-theme', theme.name)
    }
  })
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
      <button class="btn-delete-pl" data-id="${pl.id}"><i data-lucide="trash-2"></i></button>
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
  btnAddFolder.addEventListener('click', handleAddFolder)
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
    const videos = library.filter(t => t.format?.toLowerCase().includes('mp4'))
    renderTrackList(videos, 'All Videos')
  })

  btnFavorites.addEventListener('click', async () => {
    selectedTrackUuids.clear()
    setActiveNav('btn-favorites')
    const favs = await (window as any).api.getFavorites()
    renderTrackList(favs, 'My Favorites')
  })

  btnImportMedia.addEventListener('click', handleImportMedia)
  btnImportYoutube.addEventListener('click', () => {
    modalContainer.classList.remove('hidden')
    youtubeModal.classList.remove('hidden')
  })

  btnSaveYoutube.addEventListener('click', handleSaveYoutube)

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
    inputPlaylistName.value = ''
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
      return title.includes(query) || artist.includes(query) || album.includes(query)
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

async function handleEditSidebarTrack(): Promise<void> {
  console.log('handleEditSidebarTrack called. Current sidebarTrack:', sidebarTrack)
  if (!sidebarTrack) {
    console.warn('No sidebarTrack found!')
    return
  }
  
  const track = sidebarTrack
  inputEditTitle.value = track.title || track.fileName || ''
  inputEditArtist.value = track.artist || ''
  inputEditAlbum.value = track.album || ''
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
  if (!sidebarTrack) return
  
  const track = sidebarTrack
  const newTitle = inputEditTitle.value.trim()
  const newArtist = inputEditArtist.value.trim()
  const newAlbum = inputEditAlbum.value.trim()

  try {
    const updatedMetadata: any = {
      title: newTitle || track.title,
      artist: newArtist || track.artist,
      album: newAlbum || track.album
    }

    if (currentEditArtworkBase64) {
      updatedMetadata.cover = currentEditArtworkBase64
    }
    
    await (window as any).api.updateTrack(track.uuid, updatedMetadata)
    
    // Update local object directly
    track.title = updatedMetadata.title
    track.artist = updatedMetadata.artist
    track.album = updatedMetadata.album
    if (updatedMetadata.cover) {
      track.cover = updatedMetadata.cover
    }
    
    // Refresh UI
    updateSidebarUI(track)
    renderTrackList(lastTrackListView, lastListViewTitle)
    
    // Close modal
    modalContainer.classList.add('hidden')
    editModal.classList.add('hidden')
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
    const folderPath = await (window as any).api.selectFolder()
    console.log('Selected folder:', folderPath)
    if (folderPath) {
      contentView.innerHTML = `
        <div class="welcome-screen">
          <div class="spinner"></div>
          <h2>Scanning Library...</h2>
          <p>Analyzing: ${folderPath}</p>
          <p>Please wait while we index your music.</p>
        </div>
      `
      const result = await (window as any).api.scanFolder(folderPath)
      console.log('Scan result:', result)
      await loadLibrary()
    }
  } catch (error) {
    console.error('Error in handleAddFolder:', error)
    alert('Failed to add folder. Check console for details.')
    await loadLibrary() // Restore UI state
  }
}

async function handleImportMedia(): Promise<void> {
  const filePaths = await (window as any).api.selectFiles()
  if (!filePaths || filePaths.length === 0) return
  
  showPlaylistSelector(async (playlistId) => {
    for (const file of filePaths) {
      const meta = await (window as any).api.processMeta(file)
      const uuid = self.crypto.randomUUID()
      const track = {
        uuid,
        title: meta.title || file.split(/[\\\/]/).pop(),
        artist: meta.artist || 'Unknown Artist',
        album: meta.album || 'Unknown Album',
        file_path: file,
        format: meta.format || file.split('.').pop(),
        duration: meta.duration || 0,
        is_favorite: 0
      }
      await (window as any).api.upsertTrack(track)
      await (window as any).api.addToPlaylist(playlistId, uuid)
    }
    await loadLibrary()
    alert(`Imported ${filePaths.length} files to playlist.`)
  })
}

async function handleSaveYoutube(): Promise<void> {
  const url = inputYTUrl.value.trim()
  const title = inputYTTitle.value.trim()
  const description = inputYTDescription.value.trim()
  
  if (!url) return alert('Please enter a YouTube URL')
  
  const meta = await (window as any).api.getYTMeta(url)
  if (meta.error) return alert(meta.error)
  
  showPlaylistSelector(async (playlistId) => {
    const uuid = self.crypto.randomUUID()
    const track = {
      uuid,
      title: title || 'YouTube Video',
      artist: 'YouTube',
      album: description || 'YouTube Visuals',
      file_path: url, // Store URL as file path
      format: 'youtube', 
      cover: meta.thumbnail,
      duration: 0,
      is_favorite: 0
    }
    await (window as any).api.upsertTrack(track)
    await (window as any).api.addToPlaylist(playlistId, uuid)
    
    // Clear and close
    inputYTUrl.value = ''
    inputYTTitle.value = ''
    inputYTDescription.value = ''
    modalContainer.classList.add('hidden')
    youtubeModal.classList.add('hidden')
    
    await loadLibrary()
  })
}

function showPlaylistSelector(onSelect: (id: string) => void): void {
  importPlaylistOptions.innerHTML = ''
  userPlaylists.forEach(pl => {
    const div = document.createElement('div')
    div.className = 'playlist-option-item'
    div.style.padding = '12px'
    div.style.background = 'var(--glass)'
    div.style.borderRadius = 'var(--radius-md)'
    div.style.cursor = 'pointer'
    div.style.transition = 'all 0.2s ease'
    div.innerHTML = `<span>${pl.name}</span>`
    div.onclick = () => {
      onSelect(pl.id)
      selectPlaylistModal.classList.add('hidden')
      if (youtubeModal.classList.contains('hidden')) {
        modalContainer.classList.add('hidden')
      }
    }
    importPlaylistOptions.appendChild(div)
  })
  
  modalContainer.classList.remove('hidden')
  selectPlaylistModal.classList.remove('hidden')
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

  contentView.innerHTML = `
    <div class="track-list-view">
      <div class="view-header">
        <h2 class="view-title">${title}</h2>
        <p class="view-subtitle">${tracks.length} tracks available</p>
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
              <div class="track-name-cell">
                <div class="track-name">${track.title || track.fileName || (track.filePath ? track.filePath.split(/[\\\/]/).pop() ?? 'Unknown' : 'Unknown')}</div>
                <div class="track-list-artist">${track.artist || 'Unknown'}</div>
              </div>
              <div class="track-album-cell">${track.album || 'Unknown Album'}</div>
              <div class="track-duration">${formatTime(track.duration || 0)}</div>
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

function playTrack(index: number): void {
  if (index < 0 || index >= currentPlaylist.length) return
  
  currentTrackIndex = index
  const track = currentPlaylist[index]
  const fileUrl = `file://${track.filePath}`

  if (track.format === 'youtube') {
    audio.pause()
    videoOverlay.classList.remove('hidden')
    videoPlayer.src = `https://www.youtube.com/embed/${track.filePath.split('v=')[1] || track.filePath.split('/').pop()}`
    videoPlayer.style.display = 'none'; // We'll keep the video overlay for the logic but we need an iframe for YT
    
    // Replace video player with iframe for YT
    const container = document.getElementById('video-overlay')!
    container.innerHTML = `
      <iframe id="yt-iframe" width="100%" height="100%" src="https://www.youtube.com/embed/${track.filePath.split('v=')[1] || track.filePath.split('/').pop()}?autoplay=1" frameborder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
      <button id="btn-close-video" class="btn-icon circle"><i data-lucide="x"></i></button>
    `
    // Re-bind close button
    document.getElementById('btn-close-video')!.onclick = () => {
      container.innerHTML = `
        <video id="video-player" controls></video>
        <button id="btn-close-video" class="btn-icon circle"><i data-lucide="x"></i></button>
      `
      // Re-get elements
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
    audio.src = fileUrl
    audio.play()
  }
  
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

  updateSidebarUI(track)
  saveSession() // Persist track change
  
  btnPlayPause.innerHTML = '<i data-lucide="pause"></i>'
  if ((window as any).lucide) (window as any).lucide.createIcons()

  document.querySelectorAll('.track-item').forEach(item => {
    const idx = parseInt(item.getAttribute('data-index')!)
    if (idx === index) item.classList.add('playing')
    else item.classList.remove('playing')
  })
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

function playNext(): void {
  if (isShuffle) {
    playTrack(Math.floor(Math.random() * currentPlaylist.length))
  } else {
    let nextIndex = currentTrackIndex + 1
    if (nextIndex >= currentPlaylist.length) nextIndex = 0
    playTrack(nextIndex)
  }
}

function playPrev(): void {
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
        
        const fileUrl = `file://${track.filePath}`
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
  if (isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

document.addEventListener('DOMContentLoaded', init)
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  init()
}
