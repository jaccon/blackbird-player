import { app, shell, BrowserWindow, ipcMain, dialog, net, Menu, MenuItemConstructorOptions } from 'electron'
import { join, basename } from 'path'
import * as fs from 'fs'
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

app.setName('BlackBird')

app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.jaccon.blackbird')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register file:// protocol replacement for security/local access if needed
  
  // App Menu with Export Settings
  const isMac = process.platform === 'darwin'
  const template: MenuItemConstructorOptions[] = [
    ...(isMac ? [{
      label: app.name,
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Settings',
          click: async () => {
             const data = dbOps.getAllRaw()
             const themes = dbOps.getThemes()
             const exportObject = { ...data, themes }
             
             const { canceled, filePath } = await dialog.showSaveDialog({
                title: 'Export Settings',
                defaultPath: 'blackbird-settings.json',
                filters: [{ name: 'JSON', extensions: ['json'] }]
             })

             if (!canceled && filePath) {
                fs.writeFileSync(filePath, JSON.stringify(exportObject, null, 2))
                dialog.showMessageBox({
                  type: 'info',
                  title: 'Export Successful',
                  message: 'Settings exported successfully to ' + filePath
                })
             }
          }
        },
        {
          label: 'Import Settings',
          click: async () => {
             const { canceled, filePaths } = await dialog.showOpenDialog({
                title: 'Import Settings',
                properties: ['openFile'],
                filters: [{ name: 'JSON', extensions: ['json'] }]
             })

             if (!canceled && filePaths.length > 0) {
                try {
                   const fileContent = fs.readFileSync(filePaths[0], 'utf-8')
                   const importObject = JSON.parse(fileContent)
                   
                   // Import Themes
                   if (importObject.themes && Array.isArray(importObject.themes)) {
                      const themeDestDir = join(app.getAppPath(), 'resources', 'themes')
                      if (!fs.existsSync(themeDestDir)) {
                         fs.mkdirSync(themeDestDir, { recursive: true })
                      }
                      for (const theme of importObject.themes) {
                         const safeFileName = `${theme.name}.json`.toLowerCase().replace(/\s+/g, '-')
                         fs.writeFileSync(join(themeDestDir, safeFileName), JSON.stringify(theme, null, 2))
                      }
                   }

                   // Import DB
                   const result = dbOps.importRaw(importObject)
                   if (result.success) {
                      await dialog.showMessageBox({
                         type: 'info',
                         title: 'Import Successful',
                         message: 'Settings imported successfully. The application will now restart to apply changes.'
                      })
                      app.relaunch()
                      app.exit(0)
                   } else {
                      throw new Error(result.error)
                   }
                } catch (e: any) {
                   dialog.showErrorBox('Import Failed', `Failed to import settings: ${e.message}`)
                }
             }
          }
        },
        isMac ? { role: 'close' as const } : { role: 'quit' as const }
      ]
    },
    { role: 'editMenu' as const },
    { role: 'viewMenu' as const },
    { role: 'windowMenu' as const }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
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

  ipcMain.handle('import-theme', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'JSON Themes', extensions: ['json'] }
      ]
    })
    
    if (canceled || filePaths.length === 0) return { success: false }

    try {
      const themePath = filePaths[0]
      const themeDestDir = join(app.getAppPath(), 'resources', 'themes')
      
      if (!fs.existsSync(themeDestDir)) {
        fs.mkdirSync(themeDestDir, { recursive: true })
      }

      const fileName = basename(themePath)
      const destPath = join(themeDestDir, fileName)

      fs.copyFileSync(themePath, destPath)
      return { success: true }
    } catch (e) {
      return { success: false, error: (e as Error).message }
    }
  })

  ipcMain.handle('get-yt-metadata', async (_, url: string) => {
    try {
      // Basic extraction of ID for thumbnail
      const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
      const id = match ? match[1] : null;
      if (!id) throw new Error('Invalid YouTube URL');

      let title = 'YouTube Video'
      let author = 'YouTube'
      try {
        const oUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`
        const data = await new Promise<any>((resolve, reject) => {
          const request = net.request(oUrl)
          request.on('response', (response) => {
            let body = ''
            response.on('data', (chunk) => { body += chunk })
            response.on('end', () => {
              if (response.statusCode === 200) {
                try {
                  resolve(JSON.parse(body))
                } catch (e) {
                  reject(e)
                }
              } else {
                reject(new Error(`Status ${response.statusCode}`))
              }
            })
          })
          request.on('error', (err) => reject(err))
          request.end()
        })
        if (data.title) title = data.title
        if (data.author_name) author = data.author_name
      } catch (e) {
        console.warn('Failed to fetch YouTube oEmbed data', e)
      }

      return {
        id,
        title,
        author,
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
