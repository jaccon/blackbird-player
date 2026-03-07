import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getMetadata, scanDirectory } from './metadata'
import { dbOps } from './database'
import { v4 as uuidv4 } from 'uuid'

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      webSecurity: false // Necessary to load local media files
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register file:// protocol replacement for security/local access if needed
  // Already have webSecurity: false but good to have dedicated handlers
  
  // IPC handlers
  ipcMain.handle('select-files', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media', extensions: ['mp3', 'wav', 'ogg', 'mp4', 'webm'] }
      ]
    })
    return canceled ? null : filePaths
  })

  ipcMain.handle('get-yt-metadata', async (_, url: string) => {
    try {
      // Basic extraction of ID for thumbnail
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      const id = match ? match[1] : null;
      if (!id) throw new Error('Invalid YouTube URL');

      return {
        id,
        thumbnail: `https://img.youtube.com/vi/${id}/maxresdefault.jpg`,
        url
      }
    } catch (e) {
      return { error: (e as Error).message }
    }
  })
  ipcMain.handle('select-folder', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openDirectory']
    })
    if (canceled) {
      return null
    } else {
      return filePaths[0]
    }
  })

  ipcMain.handle('scan-folder', async (_, folderPath: string) => {
    try {
      console.log(`Starting scan of folder: ${folderPath}`)
      const files = await scanDirectory(folderPath)
      console.log(`Found ${files.length} files to process`)
      
      const chunkSize = 50
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        console.log(`Processing chunk ${i / chunkSize + 1} of ${Math.ceil(files.length / chunkSize)}`)
        
        await Promise.all(chunk.map(async (file) => {
          try {
            let dbTrack = dbOps.getTrackByPath(file)
            
            if (!dbTrack) {
              const metadata = await getMetadata(file, true)
              const uuid = uuidv4()
              dbTrack = {
                uuid,
                title: metadata.title || '',
                artist: metadata.artist || '',
                album: metadata.album || '',
                file_path: file,
                format: metadata.format,
                cover: undefined,
                duration: metadata.duration,
                is_favorite: 0
              }
              dbOps.upsertTrack(dbTrack)
            }
          } catch (e) {
            console.error(`Failed to process ${file}`, e)
          }
        }))
      }
      
      console.log('Scan completed successfully')
      return { success: true }
    } catch (error: any) {
      console.error('Scan failed:', error)
      return { success: false, error: error.message }
    }
  })

  // Playlist IPCs
  ipcMain.handle('get-playlists', () => dbOps.getAllPlaylists())
  ipcMain.handle('create-playlist', (_, name: string) => dbOps.createPlaylist(name))
  ipcMain.handle('add-to-playlist', (_, { playlistId, trackUuid }) => dbOps.addTrackToPlaylist(playlistId, trackUuid))
  ipcMain.handle('get-playlist-tracks', (_, playlistId: string) => dbOps.getPlaylistTracks(playlistId))
  ipcMain.handle('update-track', (_, { uuid, data }) => dbOps.updateTrack(uuid, data))
  ipcMain.handle('delete-playlist', (_, id: string) => dbOps.deletePlaylist(id))
  ipcMain.handle('get-library', () => dbOps.getAllTracks())
  ipcMain.handle('get-track-cover', async (_, { uuid, filePath }) => {
    try {
      const metadata = await getMetadata(filePath, false) // false = fetch cover
      if (metadata.cover) {
        dbOps.updateTrack(uuid, { cover: metadata.cover })
        return metadata.cover
      }
    } catch (e) {
      console.error('Failed to get cover on demand', e)
    }
    return null
  })
  ipcMain.handle('get-themes', () => dbOps.getThemes())
  ipcMain.handle('delete-tracks', (_, uuids: string[]) => dbOps.deleteTracks(uuids))
  ipcMain.handle('get-favorites', () => dbOps.getFavoriteTracks())
  ipcMain.handle('process-metadata', async (_, filePath: string) => {
    return await getMetadata(filePath, true)
  })
  ipcMain.handle('upsert-track', (_, track: any) => dbOps.upsertTrack(track))

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
