const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  isDesktop: true,
  platform: process.platform,
  version: process.versions.electron,
  
  // Hardware & Printing
  printSilent: (options) => ipcRenderer.invoke('print-silent', options),
  getPrinters: () => ipcRenderer.invoke('get-printers'),
  
  // Window management
  toggleFullScreen: () => ipcRenderer.invoke('toggle-fullscreen'),
  reloadApp: (hard = false) => ipcRenderer.invoke('reload-app', hard),
  
  // Configuration
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveServerUrl: (url) => ipcRenderer.invoke('save-server-url', url)
});

