const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  neonTest: (connStr) => ipcRenderer.invoke('neon-test', connStr),
  neonSync: (payload) => ipcRenderer.invoke('neon-sync', payload),
});
