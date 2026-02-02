const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  notifyTest: (message) => ipcRenderer.invoke("notify:test", message),
  onToastMessage: (handler) => {
    if (typeof handler === "function") {
      ipcRenderer.on("toast:message", (_event, message) => {
        handler(message);
      });
    }
  },
  onToastExpanded: (handler) => {
    if (typeof handler === "function") {
      ipcRenderer.on("toast:expanded", (_event, expanded) => {
        handler(expanded);
      });
    }
  },
  toastClose: () => ipcRenderer.send("toast:close"),
  toastToggle: () => ipcRenderer.send("toast:toggle"),
});
