const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('modManager', {
  getStatus: () => ipcRenderer.invoke('modmanager:getStatus'),
  runFirstTimeSetup: () => ipcRenderer.invoke('modmanager:runFirstTimeSetup'),
  installRequirements: () => ipcRenderer.invoke('modmanager:installRequirements'),
  openExternal: (url) => ipcRenderer.invoke('modmanager:openExternal', url),
  writeText: (text) => ipcRenderer.invoke('modmanager:writeText', text),
  checkForUpdates: () => ipcRenderer.invoke('modmanager:checkForUpdates'),
  performUpdate: () => ipcRenderer.invoke('modmanager:performUpdate'),
  fetchMods: (category, search) => ipcRenderer.invoke('modmanager:fetchMods', category, search),
  installMod: (mod) => ipcRenderer.invoke('modmanager:installMod', mod),
  uninstallMod: (modName) => ipcRenderer.invoke('modmanager:uninstallMod', modName),
  getInstalledMods: () => ipcRenderer.invoke('modmanager:getInstalledMods'),
  scanGameFolder: (gamePath) => ipcRenderer.invoke('modmanager:scanGameFolder', gamePath),
});
