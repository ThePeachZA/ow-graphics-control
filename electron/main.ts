import { app, BrowserWindow, ipcMain, dialog, Menu, shell, protocol } from 'electron'
import { join } from 'path'
import { randomUUID } from 'crypto'
import log from 'electron-log'
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, renameSync, unlinkSync } from 'fs'
import { readFile as readFileCallback } from 'fs/promises'
import express from 'express'
import cors from 'cors'
import { createServer } from 'http'
import { WebSocketServer, WebSocket } from 'ws'

log.initialize()
log.transports.file.level = 'info'
log.transports.console.level = 'debug'
log.info('Application starting...')

process.on('uncaughtException', (error) => {
  log.error('Uncaught Exception:', error)
  app.exit(1)
})

process.on('unhandledRejection', (reason) => {
  log.error('Unhandled Rejection:', reason)
})

const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged

let mainWindow: BrowserWindow | null = null
let overlayServer: { stop: () => Promise<void>; start: () => Promise<number>; broadcast: (type: string, data: any) => void; getPort: () => number } | null = null

const userDataPath = app.getPath('userData')
const dataPath = join(userDataPath, 'data')
const assetsPath = join(userDataPath, 'assets')
const bundledAssetsPath = isDev 
  ? join(__dirname, '..', 'public', 'assets')
  : join(process.resourcesPath, 'assets')
const tempAssetsPath = join(assetsPath, '_temp')

const bundledCategories = ['maps', 'heroIcon', 'heroImage', 'gameModes', 'roles', 'sides', 'heroes', 'logos']
const bundledAssetFolders: Record<string, string> = {
  'maps': 'maps',
  'gameModes': 'game-modes',
  'roles': 'roles',
  'sides': 'sides',
  'heroIcon': 'heroes/icons',
  'heroImage': 'heroes/portraits'
}
const userUploadCategories = ['logos', 'portraits']

function getUserAssetFolder(category: string): string {
  const categoryMap: Record<string, string> = {
    'logos': 'logos',
    'portraits': 'portraits'
  };
  return join(assetsPath, categoryMap[category] || category);
}

function getBundledAssetFolder(category: string): string {
  const categoryMap: Record<string, string> = {
    'maps': 'maps',
    'heroIcon': 'heroes/icons',
    'heroImage': 'heroes/portraits',
    'gameModes': 'game-modes',
    'roles': 'roles',
    'sides': 'sides',
    'logos': 'logos'
  };
  return join(bundledAssetsPath, categoryMap[category] || category);
}

function isBundledCategory(category: string): boolean {
  return bundledCategories.includes(category);
}

if (!existsSync(dataPath)) mkdirSync(dataPath, { recursive: true })
if (!existsSync(assetsPath)) mkdirSync(assetsPath, { recursive: true })
if (!existsSync(tempAssetsPath)) mkdirSync(tempAssetsPath, { recursive: true })

const assetCategories = ['logos', 'portraits', 'maps', 'heroes/portrait', 'heroes/icons', 'heroes/portraits', 'game-modes', 'roles', 'sides']
assetCategories.forEach(cat => {
  const catPath = join(assetsPath, cat)
  if (!existsSync(catPath)) {
    mkdirSync(catPath, { recursive: true })
  }
})

function createOverlayServer(port: number) {
  const expressApp = express()
  expressApp.use(cors())
  expressApp.use(express.json())

  const overlaysPath = isDev 
    ? join(__dirname, '..', 'public', 'overlays')
    : join(process.resourcesPath, 'overlays')
  const assetsServePath = isDev 
    ? join(__dirname, '..', 'public', 'assets')
    : join(process.resourcesPath, 'assets')
  
  expressApp.use('/overlays', express.static(overlaysPath))
  
  if (existsSync(assetsServePath)) {
    expressApp.use('/assets', express.static(assetsServePath))
  }
  
  if (existsSync(assetsPath)) {
    expressApp.use('/user-assets', express.static(assetsPath))
  }

  expressApp.get('/health', (req, res) => {
    res.json({ status: 'ok', port })
  })

  const server = createServer(expressApp)
  const wss = new WebSocketServer({ server })
  let overlayState: Record<string, any> = {}

  wss.on('connection', (ws) => {
    log.info('Overlay connected')
    ws.send(JSON.stringify({ type: 'init', data: overlayState }))

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString())
        if (data.type === 'requestInit') {
          ws.send(JSON.stringify({ type: 'init', data: overlayState }))
        }
      } catch (e) {
        log.error('WebSocket message error:', e)
      }
    })

    ws.on('close', () => {
      log.info('Overlay disconnected')
    })
  })

  server.listen(port, () => {
    log.info(`Overlay server started on port ${port}`)
  })

  return {
    stop: () => new Promise<void>((resolve) => {
      wss.close()
      server.close(() => {
        log.info('Overlay server stopped')
        resolve()
      })
    }),
    start: async () => port,
    broadcast: (type: string, data: any) => {
      overlayState[type] = data
      const message = JSON.stringify({ type, data })
      wss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message)
        }
      })
    },
    getPort: () => port
  }
}

function createWindow() {
  log.info('Creating main window...')
  
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1280,
    minHeight: 720,
    backgroundColor: '#0B0B0F',
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    log.info('Main window ready')
  })

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  createMenu()
}

function createMenu() {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Import Data...',
          accelerator: 'CmdOrCtrl+I',
          click: () => mainWindow?.webContents.send('menu:import')
        },
        {
          label: 'Export Data...',
          accelerator: 'CmdOrCtrl+E',
          click: () => mainWindow?.webContents.send('menu:export')
        },
        { type: 'separator' },
        {
          label: 'Exit',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Overlay',
      submenu: [
        {
          label: 'Start Overlay Server',
          click: () => mainWindow?.webContents.send('overlay:start')
        },
        {
          label: 'Stop Overlay Server',
          click: () => mainWindow?.webContents.send('overlay:stop')
        },
        { type: 'separator' },
        {
          label: 'Open Scoreboard',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/scoreboard.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Map Select',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/map-select.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Hero Bans',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/hero-bans.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Map Pool',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/map-pool.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Team Roster (Home)',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/team-roster-home.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Team Roster (Away)',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/team-roster-away.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Casters',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/row-casters.html?port=${port}`)
            }
          }
        },
        {
          label: 'Open Map Pool',
          click: () => {
            if (overlayServer) {
              const port = overlayServer.getPort()
              require('electron').shell.openExternal(`http://localhost:${port}/overlays/map-pool.html?port=${port}`)
            }
          }
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        {
          label: 'Open Data Folder',
          click: () => shell.openPath(userDataPath)
        },
        {
          label: 'Toggle Developer Tools',
          accelerator: 'F12',
          click: () => mainWindow?.webContents.toggleDevTools()
        }
      ]
    }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

ipcMain.handle('app:getPaths', () => ({
  userData: userDataPath,
  data: dataPath,
  assets: assetsPath
}))

ipcMain.handle('fs:readFile', async (_, filePath: string) => {
  try {
    return readFileSync(filePath, 'utf-8')
  } catch (error) {
    log.error('Read file error:', error)
    return null
  }
})

ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
  try {
    writeFileSync(filePath, content, 'utf-8')
    return true
  } catch (error) {
    log.error('Write file error:', error)
    return false
  }
})

ipcMain.handle('fs:exists', async (_, filePath: string) => {
  return existsSync(filePath)
})

ipcMain.handle('fs:readDir', async (_, dirPath: string) => {
  try {
    return readdirSync(dirPath)
  } catch (error) {
    log.error('Read dir error:', error)
    return []
  }
})

ipcMain.handle('bundled:scanAssets', async () => {
  try {
    const assets: Record<string, any[]> = {
      maps: [],
      gameModes: [],
      roles: [],
      sides: [],
      heroes: [],
      logos: [],
      portraits: []
    }

    if (!existsSync(bundledAssetsPath)) {
      return assets
    }

    const manifestPath = join(bundledAssetsPath, 'manifest.json')
    let manifest: Record<string, Record<string, string>> = {}
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      } catch (e) {
        log.error('Failed to load manifest:', e)
      }
    }

        const getManifestEntry = (category: string, id: string): { name: string; tag?: string } | null => {
      return manifest[category]?.[id] || null
    }

    const getRoleAssetId = (roleName: string): string | null => {
      const roleEntry = Object.entries(manifest.roles || {}).find(([_, v]) => v.name.toLowerCase() === roleName?.toLowerCase());
      return roleEntry ? roleEntry[0] : null;
    }

    const getGameModeAssetId = (gameModeName: string): string | null => {
      const gmEntry = Object.entries(manifest.gameModes || {}).find(([_, v]) => v.name.toLowerCase() === gameModeName?.toLowerCase());
      return gmEntry ? gmEntry[0] : null;
    }

    const scannedHeroIds = new Set<string>()

    const heroIconsPath = join(bundledAssetsPath, 'heroes', 'icons')
    const heroPortraitsPath = join(bundledAssetsPath, 'heroes', 'portraits')
    
    if (existsSync(heroIconsPath)) {
      const iconFiles = readdirSync(heroIconsPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      for (const file of iconFiles) {
        const assetId = file.replace(/-icon\.(png|jpg|jpeg)$/, '')
        if (scannedHeroIds.has(assetId)) continue;
        scannedHeroIds.add(assetId);
        
        const heroEntry = getManifestEntry('heroes', assetId);
        const roleTag = heroEntry?.tag;
        const roleAssetId = roleTag ? getRoleAssetId(roleTag) : null;
        
        const hasIcon = true
        const portraitFile = existsSync(join(heroPortraitsPath, `${assetId}.png`)) ? `${assetId}.png` : 
                            existsSync(join(heroPortraitsPath, `${assetId}.jpg`)) ? `${assetId}.jpg` : null
        const hasPortrait = !!portraitFile
        
        assets.heroes.push({
          id: assetId,
          name: heroEntry?.name || assetId,
          iconPath: hasIcon ? '/heroes/icons/' + assetId + '-icon.png' : null,
          portraitPath: hasPortrait ? '/heroes/portraits/' + portraitFile : null,
          roleAssetId: roleAssetId,
          iconAssetId: null,
          portraitAssetId: null
        })
      }
    }

    if (existsSync(heroPortraitsPath)) {
      const portraitFiles = readdirSync(heroPortraitsPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
      for (const file of portraitFiles) {
        const assetId = file.replace(/\.(png|jpg|jpeg)$/, '')
        if (scannedHeroIds.has(assetId)) continue;
        scannedHeroIds.add(assetId);
        
        const heroEntry = getManifestEntry('heroes', assetId);
        const roleTag = heroEntry?.tag;
        const roleAssetId = roleTag ? getRoleAssetId(roleTag) : null;
        
        const iconFile = existsSync(join(heroIconsPath, `${assetId}-icon.png`)) ? `${assetId}-icon.png` : null
        const hasIcon = !!iconFile
        const hasPortrait = true
        
        assets.heroes.push({
          id: assetId,
          name: heroEntry?.name || assetId,
          iconPath: hasIcon ? '/heroes/icons/' + iconFile : null,
          portraitPath: '/heroes/portraits/' + file,
          roleAssetId: roleAssetId,
          iconAssetId: null,
          portraitAssetId: null
        })
      }
    }

    for (const [category, folder] of Object.entries(bundledAssetFolders)) {
      if (category === 'heroIcon' || category === 'heroImage' || category === 'heroes') {
        continue;
      }

      const folderPath = join(bundledAssetsPath, folder)
      if (existsSync(folderPath)) {
        const files = readdirSync(folderPath).filter(f => f.endsWith('.png') || f.endsWith('.jpg') || f.endsWith('.jpeg'))
        
        for (const file of files) {
          const assetId = file.replace(/\.(png|jpg|jpeg)$/, '')
          const relativePath = join(bundledAssetsPath, folder, file).replace(bundledAssetsPath, '').replace(/\\/g, '/')
          
          const targetCategory = category === 'gameModes' ? 'gameModes' : category
          if (!assets[targetCategory]) assets[targetCategory] = []
          
          const entry = getManifestEntry(targetCategory, assetId)
          let assetData: any = {
            id: assetId,
            name: entry?.name || assetId,
            path: relativePath
          }
          
          if (targetCategory === 'maps' && entry?.tag) {
            assetData.gameModeAssetId = getGameModeAssetId(entry.tag)
          }
          
          assets[targetCategory].push(assetData)
        }
      }
    }

    log.info('Scanned bundled assets:', {
      maps: assets.maps.length,
      gameModes: assets.gameModes.length,
      roles: assets.roles.length,
      sides: assets.sides.length,
      heroes: assets.heroes.length
    })

    return assets
  } catch (error) {
    log.error('Scan bundled assets error:', error)
    return { maps: [], gameModes: [], roles: [], sides: [], heroes: [], logos: [], portraits: [] }
  }
})

ipcMain.handle('bundled:updateManifest', async (_, category: string, assetId: string, name: string) => {
  try {
    const manifestPath = join(bundledAssetsPath, 'manifest.json')
    let manifest: Record<string, Record<string, string>> = {}
    
    if (existsSync(manifestPath)) {
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'))
      } catch (e) {
        log.error('Failed to load manifest for update:', e)
      }
    }

    if (!manifest[category]) {
      manifest[category] = {}
    }
    manifest[category][assetId] = name

    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2))
    log.info(`Updated manifest: ${category}/${assetId} = ${name}`)
    return true
  } catch (error) {
    log.error('Update manifest error:', error)
    return false
  }
})

ipcMain.handle('fs:mkdir', async (_, dirPath: string) => {
  try {
    mkdirSync(dirPath, { recursive: true })
    return true
  } catch (error) {
    log.error('Mkdir error:', error)
    return false
  }
})

ipcMain.handle('fs:copyFile', async (_, src: string, dest: string) => {
  try {
    copyFileSync(src, dest)
    return true
  } catch (error) {
    log.error('Copy file error:', error)
    return false
  }
})

ipcMain.handle('asset:importFile', async (_, srcPath: string, category: string, assetId?: string) => {
  try {
    const useBundled = isBundledCategory(category);
    const catFolder = useBundled 
      ? getBundledAssetFolder(category)
      : getUserAssetFolder(category);
    
    if (!existsSync(catFolder)) {
      mkdirSync(catFolder, { recursive: true })
    }
    
    const originalFilename = srcPath.split(/[\\/]/).pop() || 'image'
    const ext = originalFilename.split('.').pop() || 'png'
    
    let newFilename: string;
    if (assetId) {
      newFilename = `${assetId}.${ext}`
    } else {
      newFilename = `${randomUUID()}.${ext}`
    }
    
    const destPath = join(catFolder, newFilename)
    copyFileSync(srcPath, destPath)
    return destPath
  } catch (error) {
    log.error('Import file error:', error)
    return null
  }
})

ipcMain.handle('asset:downloadUrl', async (_, url: string, category: string) => {
  try {
    const useBundled = isBundledCategory(category);
    const catFolder = useBundled 
      ? getBundledAssetFolder(category)
      : getUserAssetFolder(category);
    
    if (!existsSync(catFolder)) {
      mkdirSync(catFolder, { recursive: true })
    }
    
    const ext = url.split('.').pop()?.split('?')[0] || 'png'
    const validExts = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    const finalExt = validExts.includes(ext.toLowerCase()) ? ext : 'png'
    const newFilename = `${randomUUID()}.${finalExt}`
    const destPath = join(catFolder, newFilename)
    
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    
    const buffer = Buffer.from(await response.arrayBuffer())
    writeFileSync(destPath, buffer)
    log.info(`Downloaded asset: ${url} -> ${destPath}`)
    return destPath
  } catch (error) {
    log.error('Download URL error:', error)
    return null
  }
})

function isBundledPath(filePath: string): boolean {
  return filePath.startsWith(bundledAssetsPath)
}

ipcMain.handle('asset:moveToTemp', async (_, filePath: string) => {
  try {
    if (!existsSync(filePath)) {
      return true
    }
    
    const filename = filePath.split(/[\\/]/).pop() || 'temp'
    const isoDate = new Date().toISOString().split('T')[0]
    const newFilename = `${isoDate}_${filename}`
    const tempPath = join(tempAssetsPath, newFilename)
    
    if (isBundledPath(filePath)) {
      copyFileSync(filePath, tempPath)
      log.info(`Copied bundled asset to temp: ${filePath} -> ${tempPath}`)
    } else {
      renameSync(filePath, tempPath)
      log.info(`Moved asset to temp: ${filePath} -> ${tempPath}`)
    }
    return true
  } catch (error) {
    log.error('Move to temp error:', error)
    return false
  }
})

ipcMain.handle('asset:deleteFromTemp', async (_, filename: string) => {
  try {
    const tempPath = join(tempAssetsPath, filename)
    if (existsSync(tempPath)) {
      unlinkSync(tempPath)
      log.info(`Deleted temp asset: ${tempPath}`)
    }
    return true
  } catch (error) {
    log.error('Delete from temp error:', error)
    return false
  }
})

ipcMain.handle('asset:getTempAssets', async () => {
  try {
    return readdirSync(tempAssetsPath)
  } catch (error) {
    log.error('Get temp assets error:', error)
    return []
  }
})

ipcMain.handle('asset:clearTemp', async () => {
  try {
    const files = readdirSync(tempAssetsPath)
    for (const file of files) {
      unlinkSync(join(tempAssetsPath, file))
    }
    log.info('Cleared temp assets')
    return { success: true, count: files.length }
  } catch (error) {
    log.error('Clear temp error:', error)
    return { success: false, count: 0 }
  }
})

ipcMain.handle('asset:getTempCount', async () => {
  try {
    const files = readdirSync(tempAssetsPath)
    return files.length
  } catch (error) {
    log.error('Get temp count error:', error)
    return 0
  }
})

ipcMain.handle('dialog:openFile', async (_, options: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, options)
  return result
})

ipcMain.handle('dialog:saveFile', async (_, options: Electron.SaveDialogOptions) => {
  const result = await dialog.showSaveDialog(mainWindow!, options)
  return result
})

ipcMain.handle('fs:readImageAsDataUrl', async (_, filePath: string) => {
  try {
    if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
      return filePath;
    }

    let actualPath = filePath;
    if (!existsSync(filePath) && existsSync(bundledAssetsPath)) {
      const filename = filePath.split(/[\\/]/).pop();
      for (const cat of bundledCategories) {
        const bundledCatPath = getBundledAssetFolder(cat);
        if (existsSync(bundledCatPath)) {
          const bundledFile = join(bundledCatPath, filename || '');
          if (existsSync(bundledFile)) {
            actualPath = bundledFile;
            break;
          }
        }
      }
    }

    if (!existsSync(actualPath)) {
      log.warn(`Image not found: ${filePath} (tried: ${actualPath})`)
      return null;
    }

    const buffer = await readFileCallback(actualPath);
    const ext = actualPath.split('.').pop()?.toLowerCase() || 'png';
    const mimeTypes: Record<string, string> = {
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml'
    };
    const mimeType = mimeTypes[ext] || 'image/png';
    const base64 = buffer.toString('base64');
    return `data:${mimeType};base64,${base64}`;
  } catch (error) {
    log.error('Read image error:', error)
    return null
  }
})

ipcMain.handle('overlay:start', async (_, port: number = 3001) => {
  try {
    if (overlayServer) {
      await overlayServer.stop()
    }
    overlayServer = createOverlayServer(port)
    await overlayServer.start()
    return { success: true, port: overlayServer.getPort() }
  } catch (error) {
    log.error('Failed to start overlay server:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('overlay:stop', async () => {
  try {
    if (overlayServer) {
      await overlayServer.stop()
      overlayServer = null
    }
    return { success: true }
  } catch (error) {
    log.error('Failed to stop overlay server:', error)
    return { success: false, error: String(error) }
  }
})

ipcMain.handle('overlay:status', () => {
  return {
    running: overlayServer !== null,
    port: overlayServer?.getPort() || null
  }
})

ipcMain.handle('overlay:broadcast', (_, type: string, data: any) => {
  if (overlayServer) {
    overlayServer.broadcast(type, data)
    return true
  }
  return false
})

ipcMain.handle('overlay:openUrl', async (_, path: string) => {
  if (overlayServer && mainWindow) {
    const port = overlayServer.getPort()
    const url = `http://localhost:${port}/overlays/${path}?port=${port}`
    await require('electron').shell.openExternal(url)
    return url
  }
  return null
})

app.whenReady().then(() => {
  protocol.handle('local-file', (request) => {
    const filePath = decodeURIComponent(request.url.replace('local-file://', ''));
    return new Response('Not found', { status: 404 });
  });
  log.info('App ready')
  createWindow()
})

app.on('window-all-closed', () => {
  if (overlayServer) {
    overlayServer.stop()
  }
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})
