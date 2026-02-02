const { ipcRenderer } = require("electron");

window.addEventListener("message", (event) => {
  const payload = event.data;
  if (!payload || payload.type !== "toast") {
    return;
  }
  ipcRenderer.sendToHost("toast", payload);
});

ipcRenderer.on("open-session", (_event, sessionId) => {
  if (sessionId) {
    window.postMessage({ type: "open-session", sessionId }, "*");
  }
});
