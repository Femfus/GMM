const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modManager', {
  getStatus: () => ipcRenderer.invoke('modmanager:getStatus'),
  runFirstTimeSetup: () => ipcRenderer.invoke('modmanager:runFirstTimeSetup'),
  installRequirements: () => ipcRenderer.invoke('modmanager:installRequirements'),
  openExternal: (url) => ipcRenderer.invoke('modmanager:openExternal', url),
});
