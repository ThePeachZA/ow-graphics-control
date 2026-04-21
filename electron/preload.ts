import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('electronAPI', {
  getPaths: () => ipcRenderer.invoke('app:getPaths'),
  
  readFile: (filePath: string) => ipcRenderer.invoke('fs:readFile', filePath),
  writeFile: (filePath: string, content: string) => ipcRenderer.invoke('fs:writeFile', filePath, content),
  exists: (filePath: string) => ipcRenderer.invoke('fs:exists', filePath),
  readDir: (dirPath: string) => ipcRenderer.invoke('fs:readDir', dirPath),
  mkdir: (dirPath: string) => ipcRenderer.invoke('fs:mkdir', dirPath),
  copyFile: (src: string, dest: string) => ipcRenderer.invoke('fs:copyFile', src, dest),
  readImageAsDataUrl: (filePath: string) => ipcRenderer.invoke('fs:readImageAsDataUrl', filePath),
  getBundledAssets: () => ipcRenderer.invoke('bundled:scanAssets'),
  importAssetFile: (srcPath: string, category: string, assetId?: string) => ipcRenderer.invoke('asset:importFile', srcPath, category, assetId),
  downloadAssetUrl: (url: string, category: string) => ipcRenderer.invoke('asset:downloadUrl', url, category),
  moveAssetToTemp: (filePath: string) => ipcRenderer.invoke('asset:moveToTemp', filePath),
  deleteTempAsset: (filename: string) => ipcRenderer.invoke('asset:deleteFromTemp', filename),
  getTempAssets: () => ipcRenderer.invoke('asset:getTempAssets'),
  clearTempAssets: () => ipcRenderer.invoke('asset:clearTemp'),
  getTempAssetCount: () => ipcRenderer.invoke('asset:getTempCount'),
  
  openFile: (options: Electron.OpenDialogOptions) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options: Electron.SaveDialogOptions) => ipcRenderer.invoke('dialog:saveFile', options),
  
  overlayStart: (port: number) => ipcRenderer.invoke('overlay:start', port),
  overlayStop: () => ipcRenderer.invoke('overlay:stop'),
  overlayStatus: () => ipcRenderer.invoke('overlay:status'),
  overlayBroadcast: (type: string, data: any) => ipcRenderer.invoke('overlay:broadcast', type, data),
  overlayOpenUrl: (path: string) => ipcRenderer.invoke('overlay:openUrl', path),
  
  onMenuImport: (callback: () => void) => ipcRenderer.on('menu:import', callback),
  onMenuExport: (callback: () => void) => ipcRenderer.on('menu:export', callback),
  onOverlayStart: (callback: () => void) => ipcRenderer.on('overlay:start', callback),
  onOverlayStop: (callback: () => void) => ipcRenderer.on('overlay:stop', callback),
  removeMenuListeners: () => {
    ipcRenderer.removeAllListeners('menu:import')
    ipcRenderer.removeAllListeners('menu:export')
    ipcRenderer.removeAllListeners('overlay:start')
    ipcRenderer.removeAllListeners('overlay:stop')
  }
})
