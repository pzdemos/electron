const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

let toastWindow = null;
let toastExpanded = true;

const toastSizes = {
  expanded: { width: 360, height: 420 },
  collapsed: { width: 360, height: 160 },
};

const createWindow = () => {
  const win = new BrowserWindow({
    width: 900,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  win.loadFile("index.html");
};

const createToastWindow = () => {
  const size = toastExpanded ? toastSizes.expanded : toastSizes.collapsed;
  toastWindow = new BrowserWindow({
    width: size.width,
    height: size.height,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  toastWindow.loadFile("toast.html");
  toastWindow.webContents.once("did-finish-load", () => {
    toastWindow.webContents.send("toast:expanded", toastExpanded);
  });
  toastWindow.on("closed", () => {
    toastWindow = null;
  });
};

const positionToast = () => {
  if (!toastWindow) {
    return;
  }
  const { workArea } = screen.getPrimaryDisplay();
  const bounds = toastWindow.getBounds();
  const x = Math.round(workArea.x + workArea.width - bounds.width - 20);
  const y = Math.round(workArea.y + workArea.height - bounds.height - 20);
  toastWindow.setPosition(x, y, false);
};

const setToastExpanded = (expanded) => {
  toastExpanded = expanded;
  if (!toastWindow) {
    return;
  }
  const size = expanded ? toastSizes.expanded : toastSizes.collapsed;
  toastWindow.setBounds({ width: size.width, height: size.height });
  positionToast();
  toastWindow.webContents.send("toast:expanded", toastExpanded);
};

const showToast = (message) => {
  const body = message && message.trim()
    ? message.trim()
    : "这是一条来自 Electron 的提示消息。";
  if (!toastWindow) {
    createToastWindow();
  }

  positionToast();
  toastWindow.webContents.send("toast:message", body);
  toastWindow.show();
};

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.shushubuyue.electron.notify-test");
  }
  createWindow();
  ipcMain.handle("notify:test", (_event, message) => {
    showToast(message);
    return { ok: true };
  });
  ipcMain.on("toast:close", () => {
    if (toastWindow) {
      toastWindow.hide();
    }
  });
  ipcMain.on("toast:toggle", () => {
    setToastExpanded(!toastExpanded);
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
