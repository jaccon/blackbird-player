import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath: string, copyOnImport: boolean = false) => ipcRenderer.invoke('scan-folder', { folderPath, copyOnImport }),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  createPlaylist: (name: string) => ipcRenderer.invoke('create-playlist', name),
  addToPlaylist: (playlistId: string, trackUuid: string) => ipcRenderer.invoke('add-to-playlist', { playlistId, trackUuid }),
  removeFromPlaylist: (playlistId: string, trackUuid: string) => ipcRenderer.invoke('remove-from-playlist', { playlistId, trackUuid }),
  getPlaylistTracks: (playlistId: string) => ipcRenderer.invoke('get-playlist-tracks', playlistId),
  updateTrack: (uuid: string, data: any) => ipcRenderer.invoke('update-track', { uuid, data }),
  deletePlaylist: (id: string) => ipcRenderer.invoke('delete-playlist', id),
  getLibrary: () => ipcRenderer.invoke('get-library'),
  getTrackCover: (uuid: string, filePath: string) => ipcRenderer.invoke('get-track-cover', { uuid, filePath }),
  getThemes: () => ipcRenderer.invoke('get-themes'),
  setWindowThemeColor: (bgColor: string, symbolColor?: string) => ipcRenderer.invoke('set-window-theme-color', { bgColor, symbolColor }),
  deleteTracks: (uuids: string[]) => ipcRenderer.invoke('delete-tracks', uuids),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  getPlayHistory: () => ipcRenderer.invoke('get-play-history'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  selectM3uFile: () => ipcRenderer.invoke('select-m3u-file'),
  getYTMeta: (url: string) => ipcRenderer.invoke('get-yt-metadata', url),
  processMeta: (filePath: string) => ipcRenderer.invoke('process-metadata', filePath),
  upsertTrack: (track: any) => ipcRenderer.invoke('upsert-track', track),
  importTheme: () => ipcRenderer.invoke('import-theme'),
  recordPlay: (trackUuid: string) => ipcRenderer.invoke('record-play', trackUuid),
  getStatistics: () => ipcRenderer.invoke('get-statistics'),
  startCastScan: () => ipcRenderer.invoke('start-cast-scan'),
  startCastPlayback: (deviceId: string, trackUuid: string) => ipcRenderer.invoke('start-cast-playback', { deviceId, trackUuid }),
  saveUserRadio: (radio: any) => ipcRenderer.invoke('save-user-radio', radio),
  getUserRadios: () => ipcRenderer.invoke('get-user-radios'),
  deleteUserRadio: (id: string) => ipcRenderer.invoke('delete-user-radio', id),
  fetchRemoteJson: (url: string) => ipcRenderer.invoke('fetch-remote-json', url),
  getCastDevices: () => ipcRenderer.invoke('start-cast-scan'),
  openPath: (folderPath: string) => ipcRenderer.invoke('open-path', folderPath),
  getAppPaths: () => ipcRenderer.invoke('get-app-paths'),
  exportSettings: () => ipcRenderer.invoke('export-settings'),
  importSettings: () => ipcRenderer.invoke('import-settings'),
  getServerStatus: () => ipcRenderer.invoke('get-server-status'),
  startServer: (port?: number) => ipcRenderer.invoke('start-server', port),
  stopServer: () => ipcRenderer.invoke('stop-server'),
  openExternal: (url: string) => ipcRenderer.invoke('open-external', url),
  // Hidden Files APIs
  getHiddenTracks: (folderId?: string | null) => ipcRenderer.invoke('get-hidden-tracks', folderId),
  getHiddenFolders: () => ipcRenderer.invoke('get-hidden-folders'),
  createHiddenFolder: (name: string) => ipcRenderer.invoke('create-hidden-folder', name),
  renameHiddenFolder: (id: string, name: string) => ipcRenderer.invoke('rename-hidden-folder', { id, name }),
  deleteHiddenFolder: (id: string) => ipcRenderer.invoke('delete-hidden-folder', id),
  moveHiddenTrack: (trackUuid: string, folderId: string | null) => ipcRenderer.invoke('move-hidden-track', { trackUuid, folderId }),
  hideTracks: (uuids: string[], folderId?: string | null) => ipcRenderer.invoke('hide-tracks', { uuids, folderId }),
  unhideTracks: (uuids: string[]) => ipcRenderer.invoke('unhide-tracks', uuids),
  // Media Folders APIs (Music, Video & Photos)
  getMediaFolders: (type: 'music' | 'video' | 'photo') => ipcRenderer.invoke('get-media-folders', type),
  createMediaFolder: (name: string, type: 'music' | 'video' | 'photo', parentId?: string | null) => ipcRenderer.invoke('create-media-folder', { name, type, parentId }),
  renameMediaFolder: (id: string, name: string) => ipcRenderer.invoke('rename-media-folder', { id, name }),
  deleteMediaFolder: (id: string) => ipcRenderer.invoke('delete-media-folder', id),
  moveTrackToMediaFolder: (trackUuid: string, folderId: string | null) => ipcRenderer.invoke('move-track-to-media-folder', { trackUuid, folderId }),
  moveTracksToMediaFolder: (trackUuids: string[], folderId: string | null) => ipcRenderer.invoke('move-tracks-to-media-folder', { trackUuids, folderId }),
  getSetting: (key: string) => ipcRenderer.invoke('get-setting', key),
  setSetting: (key: string, value: string) => ipcRenderer.invoke('set-setting', { key, value }),
  importHiddenFiles: (folderId?: string | null) => ipcRenderer.invoke('import-hidden-files', folderId),
  resetAppData: (options?: { clearCovers?: boolean }) => ipcRenderer.invoke('reset-app-data', options),
  // Plugins APIs
  getPlugins: () => ipcRenderer.invoke('plugin:list'),
  installPluginFromUrl: (url: string) => ipcRenderer.invoke('plugin:install-url', url),
  installPluginFromFile: () => ipcRenderer.invoke('plugin:install-file'),
  togglePlugin: (id: string, enabled: boolean) => ipcRenderer.invoke('plugin:toggle', { id, enabled }),
  deletePlugin: (id: string) => ipcRenderer.invoke('plugin:delete', id),
  getPluginAsset: (id: string, assetType: 'main' | 'styles') =>
    ipcRenderer.invoke('plugin:get-asset', { id, assetType }),
  // YouTube & yt-dlp APIs
  checkYtDlp: () => ipcRenderer.invoke('ytdlp:check'),
  getYtVideoInfo: (url: string) => ipcRenderer.invoke('ytdlp:get-info', url),
  convertYtMedia: (options: { url: string; format: 'mp3' | 'mp4'; customTitle?: string; customArtist?: string }) =>
    ipcRenderer.invoke('ytdlp:convert', options),
  onYtDlpProgress: (callback: (progress: any) => void) => {
    const listener = (_: any, value: any) => callback(value)
    ipcRenderer.on('ytdlp:progress', listener)
    return () => {
      ipcRenderer.removeListener('ytdlp:progress', listener)
    }
  },
  // M3U APIs
  importM3uFile: (filePath: string) => ipcRenderer.invoke('import-m3u-file', filePath),
  importM3uUrl: (url: string) => ipcRenderer.invoke('import-m3u-url', url),
  getM3uChannels: () => ipcRenderer.invoke('get-m3u-channels'),
  toggleM3uFavorite: (id: string) => ipcRenderer.invoke('toggle-m3u-favorite', id),
  deleteM3uChannel: (id: string) => ipcRenderer.invoke('delete-m3u-channel', id),
  startM3uScan: () => ipcRenderer.invoke('start-m3u-scan'),
  cancelM3uScan: () => ipcRenderer.invoke('cancel-m3u-scan'),
  isM3uScanInProgress: () => ipcRenderer.invoke('is-m3u-scan-in-progress'),
  onM3uScanProgress: (callback: (progress: any) => void) => {
    const listener = (_: any, value: any) => callback(value)
    ipcRenderer.on('iptv-scan:progress', listener)
    return () => {
      ipcRenderer.removeListener('iptv-scan:progress', listener)
    }
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
