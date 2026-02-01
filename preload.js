const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  notifyTest: (message) => ipcRenderer.invoke("notify:test", message),
  notifyStatus: () => ipcRenderer.invoke("notify:status"),
});
