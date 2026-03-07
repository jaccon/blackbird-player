import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Custom APIs for renderer
const api = {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath: string) => ipcRenderer.invoke('scan-folder', folderPath),
  getPlaylists: () => ipcRenderer.invoke('get-playlists'),
  createPlaylist: (name: string) => ipcRenderer.invoke('create-playlist', name),
  addToPlaylist: (playlistId: string, trackUuid: string) => ipcRenderer.invoke('add-to-playlist', { playlistId, trackUuid }),
  getPlaylistTracks: (playlistId: string) => ipcRenderer.invoke('get-playlist-tracks', playlistId),
  updateTrack: (uuid: string, data: any) => ipcRenderer.invoke('update-track', { uuid, data }),
  deletePlaylist: (id: string) => ipcRenderer.invoke('delete-playlist', id),
  getLibrary: () => ipcRenderer.invoke('get-library'),
  getTrackCover: (uuid: string, filePath: string) => ipcRenderer.invoke('get-track-cover', { uuid, filePath }),
  getThemes: () => ipcRenderer.invoke('get-themes'),
  deleteTracks: (uuids: string[]) => ipcRenderer.invoke('delete-tracks', uuids),
  getFavorites: () => ipcRenderer.invoke('get-favorites'),
  selectFiles: () => ipcRenderer.invoke('select-files'),
  getYTMeta: (url: string) => ipcRenderer.invoke('get-yt-metadata', url),
  processMeta: (filePath: string) => ipcRenderer.invoke('process-metadata', filePath),
  upsertTrack: (track: any) => ipcRenderer.invoke('upsert-track', track)
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
