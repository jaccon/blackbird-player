import { app, shell, BrowserWindow, ipcMain, dialog, net, Menu, MenuItemConstructorOptions, protocol } from 'electron'
import { join, basename } from 'path'
import { pathToFileURL } from 'url'
import * as fs from 'fs'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'

// Handle uncaught exceptions to prevent app crash on network timeouts
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in Main Process:', error)
})

import icon from '../../resources/icon.png?asset'
import { getMetadata, scanDirectory } from './metadata'
import { dbOps } from './database'
import { parseM3uFile, parseM3uUrl } from './m3u'

import { startServer, stopServer, getServerStatus } from './server'
import { v4 as uuidv4 } from 'uuid'
import ChromecastAPI from 'chromecast-api'
import localIpUrl from 'local-ip-url'
import * as http from 'http'
import { PluginService } from './plugins'
import { YtDlpService } from './ytdlp'

protocol.registerSchemesAsPrivileged([
  { scheme: 'local', privileges: { secure: true, supportFetchAPI: true, bypassCSP: true, stream: true } }
])

// YouTube Fix: Disable site isolation and allow autoplay
app.commandLine.appendSwitch('disable-site-isolation-trials')
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required')

const castClient = new ChromecastAPI()

// Prevent Chromecast network scanning timeouts (ETIMEDOUT) from crashing/disrupting the main process
process.on('uncaughtException', (err) => {
  if (err.message && err.message.includes('ETIMEDOUT')) {
    console.warn('[Network/Chromecast] Ignoring timeout error:', err.message)
  } else {
    console.error('Uncaught Exception in Main Process:', err)
  }
})

process.on('unhandledRejection', (reason) => {
  console.error('Unhandled Rejection in Main Process:', reason)
})
let castMediaServer: http.Server | null = null
let castMediaPort = 0

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

  // Set Referer for YouTube Embeds in production
  mainWindow.webContents.session.webRequest.onBeforeSendHeaders(
    { urls: ['https://www.youtube.com/*', 'https://*.youtube.com/*', 'https://*.ytimg.com/*', 'https://*.youtube-nocookie.com/*'] },
    (details, callback) => {
      const url = new URL(details.url)
      const origin = url.hostname.includes('youtube-nocookie.com') ? 'https://www.youtube-nocookie.com' : 'https://www.youtube.com'
      
      details.requestHeaders['Referer'] = origin
      details.requestHeaders['Origin'] = origin
      details.requestHeaders['User-Agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      callback({ cancel: false, requestHeaders: details.requestHeaders })
    }
  )

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

// Create default music folder for easy backup
const defaultMusicDir = join(app.getPath('home'), 'BlackBird');
if (!fs.existsSync(defaultMusicDir)) {
  fs.mkdirSync(defaultMusicDir, { recursive: true });
}

app.whenReady().then(async () => {
  // Initialize plugins system
  await PluginService.init()
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.jaccon.blackbird')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Register file:// protocol replacement for security/local access
  protocol.handle('local', (request) => {
    try {
      // Strip 'local://' or 'local:///' completely, leaving just the path or drive letter
      const rawPath = request.url.replace(/^local:\/\/+/, '')
      const decodedUrl = decodeURIComponent(rawPath)
      const withoutParams = decodedUrl.split('?')[0].split('#')[0]
      // Add the leading slash back for macOS/Linux if it doesn't have one and isn't a Windows drive
      const finalPath = withoutParams.startsWith('/') || withoutParams.match(/^[a-zA-Z]:[\\/]/) ? withoutParams : '/' + withoutParams
      const fileUrl = pathToFileURL(finalPath).toString()
      return net.fetch(fileUrl)
    } catch (error) {
      console.error('Failed to parse local URL', error)
      return new Response('Not Found', { status: 404 })
    }
  })
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
                      const themeDestDir = join(app.getPath('home'), 'BlackBird', 'themes')
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

  ipcMain.handle('select-m3u-file', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [
        { name: 'M3U Playlists', extensions: ['m3u', 'm3u8'] }
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
      const themeDestDir = join(app.getPath('home'), 'BlackBird', 'themes')
      
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
      properties: ['openFile', 'openDirectory', 'multiSelections']
    })
    if (canceled) {
      return null
    } else {
      return filePaths
    }
  })

  ipcMain.handle('scan-folder', async (_, args: any) => {
    try {
      const folderPath = typeof args === 'string' ? args : args?.folderPath
      if (!folderPath) return { success: false, error: 'No folder path provided' }

      const files = await scanDirectory(folderPath)
      console.log(`Found ${files.length} files to process in ${folderPath}`)
      
      const chunkSize = 50
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        const tracksToUpsert: any[] = []
        
        await Promise.all(chunk.map(async (file) => {
          try {
            let dbTrack = dbOps.getTrackByPath(file)
            
            if (!dbTrack) {
              const metadata = await getMetadata(file, false)
              const uuid = uuidv4()
              dbTrack = {
                uuid,
                title: metadata.title || '',
                artist: metadata.artist || '',
                album: metadata.album || '',
                file_path: file,
                format: metadata.format || 'unknown',
                mimetype: metadata.mimetype || 'audio/mpeg',
                kind: metadata.kind || metadata.format?.toUpperCase() || 'AUDIO',
                cover: metadata.cover || null,
                duration: metadata.duration || 0,
                is_favorite: 0,
                is_hidden: 0,
                hidden_folder_id: null,
                description: metadata.description || '',
                lyrics: metadata.lyrics || ''
              }
              tracksToUpsert.push(dbTrack)
            } else if (!dbTrack.cover || dbTrack.cover === 'null') {
              const metadata = await getMetadata(file, false)
              if (metadata.cover) {
                dbTrack.cover = metadata.cover
                tracksToUpsert.push(dbTrack)
              }
            }
          } catch (e) {
            console.error(`Failed to process ${file}`, e)
          }
        }))

        if (tracksToUpsert.length > 0) {
          dbOps.upsertTracksBatch(tracksToUpsert)
        }
      }
      
      console.log('Scan completed successfully')
      return { success: true, count: files.length }
    } catch (error: any) {
      console.error('Scan failed:', error)
      return { success: false, error: error.message }
    }
  })

  // Playlist IPCs
  ipcMain.handle('get-playlists', () => dbOps.getAllPlaylists())
  ipcMain.handle('create-playlist', (_, name: string) => dbOps.createPlaylist(name))
  ipcMain.handle('add-to-playlist', (_, { playlistId, trackUuid }) => dbOps.addTrackToPlaylist(playlistId, trackUuid))
  ipcMain.handle('remove-from-playlist', (_, { playlistId, trackUuid }) => dbOps.removeTrackFromPlaylist(playlistId, trackUuid))
  ipcMain.handle('get-playlist-tracks', (_, playlistId: string) => dbOps.getPlaylistTracks(playlistId))
  ipcMain.handle('delete-playlist', (_, id: string) => dbOps.deletePlaylist(id))

  // App & System IPCs
  ipcMain.handle('get-library', () => dbOps.getAllTracks())
  ipcMain.handle('get-favorites', () => dbOps.getFavoriteTracks())
  ipcMain.handle('get-statistics', () => dbOps.getStatistics())
  ipcMain.handle('get-play-history', () => dbOps.getPlayHistory())
  ipcMain.handle('record-play', (_, trackUuid: string) => dbOps.recordPlay(trackUuid))
  ipcMain.handle('toggle-favorite', (_, trackUuid: string) => dbOps.toggleFavorite(trackUuid))
  ipcMain.handle('update-track', (_, args: any) => {
    const targetUuid = args?.uuid || args?.trackUuid
    const updateData = args?.data !== undefined ? args.data : args
    return dbOps.updateTrack(targetUuid, updateData)
  })
  ipcMain.handle('delete-tracks', (_, trackUuids: string[]) => dbOps.deleteTracks(trackUuids))
  ipcMain.handle('get-hidden-tracks', (_, folderId?: string | null) => dbOps.getHiddenTracks(folderId))
  ipcMain.handle('get-hidden-folders', () => dbOps.getHiddenFolders())
  ipcMain.handle('create-hidden-folder', (_, name: string) => dbOps.createHiddenFolder(name))
  ipcMain.handle('rename-hidden-folder', (_, args: any) => {
    const folderId = args?.id || args?.folderId
    const name = args?.name
    return dbOps.renameHiddenFolder(folderId, name)
  })
  ipcMain.handle('delete-hidden-folder', (_, folderId: string) => dbOps.deleteHiddenFolder(folderId))
  ipcMain.handle('move-hidden-track', (_, args: any) => {
    const trackUuid = args?.trackUuid || args?.uuid
    const folderId = args?.folderId
    return dbOps.moveHiddenTrackToFolder(trackUuid, folderId)
  })
  ipcMain.handle('hide-tracks', (_, args: any) => {
    if (Array.isArray(args)) {
      return dbOps.hideTracks(args, null)
    }
    return dbOps.hideTracks(args?.uuids || [], args?.folderId || null)
  })
  ipcMain.handle('unhide-tracks', (_, uuids: string[]) => dbOps.unhideTracks(uuids))
  ipcMain.handle('get-track-cover', async (_, { uuid, filePath }) => {
    try {
      const metadata = await getMetadata(filePath, false)
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

  // M3U IPC Handlers
  ipcMain.handle('import-m3u-file', async (_, filePath: string) => {
    const channels = await parseM3uFile(filePath);
    dbOps.importM3UChannels(channels);
    return channels.length;
  });
  ipcMain.handle('import-m3u-url', async (_, url: string) => {
    const channels = await parseM3uUrl(url);
    dbOps.importM3UChannels(channels);
    return channels.length;
  });
  ipcMain.handle('get-m3u-channels', () => dbOps.getM3UChannels());
  ipcMain.handle('toggle-m3u-favorite', (_, id: string) => dbOps.toggleM3UFavorite(id));
  ipcMain.handle('delete-m3u-channel', (_, id: string) => dbOps.deleteM3UChannel(id));

  ipcMain.handle('save-user-radio', (_, radio: any) => dbOps.saveUserRadio(radio))
  ipcMain.handle('get-user-radios', () => dbOps.getUserRadios())
  ipcMain.handle('delete-user-radio', (_, id: string) => dbOps.deleteUserRadio(id))
  ipcMain.handle('open-path', async (_, folderPath: string) => {
    return await shell.openPath(folderPath)
  })
  ipcMain.handle('process-metadata', async (_, filePath: string) => {
    if (filePath.startsWith('http')) return {}
    return await getMetadata(filePath, false)
  })
  ipcMain.handle('upsert-track', (_, track: any) => dbOps.upsertTrack(track))
  ipcMain.handle('get-setting', (_, key: string) => dbOps.getSetting(key))
  ipcMain.handle('set-setting', (_, { key, value }: { key: string, value: string }) => dbOps.setSetting(key, value))

  ipcMain.handle('import-hidden-files', async (_, folderId?: string | null) => {
    const { canceled, filePaths } = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Media & Photos', extensions: ['mp3', 'wav', 'ogg', 'mp4', 'webm', 'jpg', 'jpeg', 'png', 'gif'] }
      ]
    })
    if (canceled || !filePaths || filePaths.length === 0) return { success: false, count: 0 }
    
    const tracksToUpsert: any[] = []
    let count = 0
    for (const file of filePaths) {
      try {
        let dbTrack = dbOps.getTrackByPath(file)
        if (!dbTrack) {
          const metadata = await getMetadata(file, false)
          const uuid = uuidv4()
          dbTrack = {
            uuid,
            title: metadata.title || '',
            artist: metadata.artist || '',
            album: metadata.album || '',
            file_path: file,
            format: metadata.format || 'unknown',
            mimetype: metadata.mimetype || 'audio/mpeg',
            kind: metadata.kind || metadata.format?.toUpperCase() || 'AUDIO',
            cover: metadata.cover || null,
            duration: metadata.duration || 0,
            is_favorite: 0,
            is_hidden: 1,
            hidden_folder_id: folderId || null,
            description: metadata.description || '',
            lyrics: metadata.lyrics || ''
          }
          tracksToUpsert.push(dbTrack)
          count++
        } else {
          dbOps.updateTrack(dbTrack.uuid, { is_hidden: 1, hidden_folder_id: folderId || null })
          count++
        }
      } catch (e) {
        console.error('Failed to import hidden file', file, e)
      }
    }

    if (tracksToUpsert.length > 0) {
      dbOps.upsertTracksBatch(tracksToUpsert)
    }

    return { success: true, count }
  })
  ipcMain.handle('get-app-paths', async () => {
    const baseConfigDir = join(app.getPath('home'), 'BlackBird');
    return {
      userData: baseConfigDir,
      music: baseConfigDir,
      db: join(baseConfigDir, 'blackbird.db'),
      covers: join(baseConfigDir, 'covers'),
      themes: join(baseConfigDir, 'themes')
    }
  })

  ipcMain.handle('get-server-status', () => getServerStatus())
  ipcMain.handle('start-server', (_, port?: number) => startServer(port))
  ipcMain.handle('stop-server', () => stopServer())
  ipcMain.handle('reset-app-data', (_, options?: { clearCovers?: boolean }) => dbOps.resetAllData(options))
  
  ipcMain.handle('export-settings', async () => {
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
      return { success: true, filePath }
    }
    return { success: false }
  })

  ipcMain.handle('import-settings', async () => {
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
          const themeDestDir = join(app.getPath('home'), 'BlackBird', 'themes')
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
          return { success: true }
        } else {
          return { success: false, error: result.error }
        }
      } catch (e: any) {
        return { success: false, error: e.message }
      }
    }
    return { success: false }
  })
  
  ipcMain.handle('fetch-remote-json', async (_, url: string) => {
    try {
      const response = await fetch(url)
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
      return await response.json()
    } catch (e: any) {
      console.error('fetch-remote-json error:', e)
      return { error: e.message }
    }
  })

  ipcMain.handle('start-cast-scan', async () => {
    return new Promise((resolve) => {
      console.log('Scanning for Cast devices...')
      castClient.update()
      setTimeout(() => {
        const devices = castClient.devices.map(d => ({
          id: d.host,
          name: d.friendlyName,
          type: (d as any).type || 'Device'
        }))
        console.log(`Found ${devices.length} devices`)
        resolve(devices)
      }, 3000)
    })
  })

  ipcMain.handle('start-cast-playback', async (_, { deviceId, trackUuid }) => {
    try {
      const track = dbOps.getAllTracks().find(t => t.uuid === trackUuid)
      if (!track) throw new Error('Track not found')

      const device = castClient.devices.find(d => d.host === deviceId)
      if (!device) throw new Error('Device not found')

      const ip = localIpUrl()
      
      // Start media server if not running
      if (!castMediaServer) {
        castMediaServer = http.createServer((req, res) => {
          const filePath = decodeURIComponent(req.url || '').substring(1)
          if (fs.existsSync(filePath)) {
            const stat = fs.statSync(filePath)
            res.writeHead(200, {
              'Content-Type': 'audio/mpeg',
              'Content-Length': stat.size,
              'Access-Control-Allow-Origin': '*'
            })
            fs.createReadStream(filePath).pipe(res)
          } else {
            res.writeHead(404)
            res.end()
          }
        })
        
        await new Promise<void>((resolve) => {
          castMediaServer!.listen(0, () => {
            const addr = castMediaServer!.address() as any
            castMediaPort = addr.port
            console.log(`Cast media server running at http://${ip}:${castMediaPort}`)
            resolve()
          })
        })
      }

      const mediaUrl = `http://${ip}:${castMediaPort}/${encodeURIComponent(track.filePath)}`
      console.log(`Casting media: ${mediaUrl} to ${device.friendlyName}`)
      
      return new Promise((resolve, reject) => {
        device.play(mediaUrl, (err) => {
          if (err) reject(err)
          else resolve({ success: true })
        })
      })
    } catch (e: any) {
      console.error('Cast playback failed:', e)
      return { success: false, error: e.message }
    }
  })

  // Plugin Management IPC Handlers
  ipcMain.handle('plugin:list', () => PluginService.syncInstalledPlugins())
  ipcMain.handle('plugin:install-url', (_, url: string) => PluginService.installFromUrl(url))
  ipcMain.handle('plugin:install-file', () => PluginService.installFromFile())
  ipcMain.handle('plugin:toggle', (_, { id, enabled }: { id: string; enabled: boolean }) =>
    PluginService.togglePlugin(id, enabled)
  )
  ipcMain.handle('plugin:delete', (_, id: string) => PluginService.deletePlugin(id))
  ipcMain.handle('plugin:get-asset', (_, { id, assetType }: { id: string; assetType: 'main' | 'styles' }) =>
    PluginService.getPluginAsset(id, assetType)
  )

  // YouTube / yt-dlp IPC Handlers
  ipcMain.handle('ytdlp:check', () => YtDlpService.checkAvailability())
  ipcMain.handle('ytdlp:get-info', (_, url: string) => YtDlpService.getVideoInfo(url))
  ipcMain.handle(
    'ytdlp:convert',
    (event, options: { url: string; format: 'mp3' | 'mp4'; customTitle?: string; customArtist?: string }) => {
      const win = BrowserWindow.fromWebContents(event.sender)
      return YtDlpService.convertAndDownload(options, win)
    }
  )

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
