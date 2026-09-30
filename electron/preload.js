const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  selectFiles: () => ipcRenderer.invoke('dialog:select-files'),
  selectOutputDir: () => ipcRenderer.invoke('dialog:select-output-dir'),
  startConvert: (payload) => ipcRenderer.invoke('convert:start', payload),
  onConvertProgress: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on('convert:progress', listener)
    return () => ipcRenderer.removeListener('convert:progress', listener)
  },
})
