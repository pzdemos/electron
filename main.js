const { app, BrowserWindow, ipcMain, screen } = require("electron");
const path = require("path");

let mainWindow = null;
let toastWindow = null;
let toastExpanded = true;
const toastItems = [];
const unreadSessionIds = new Set();

const toastSizes = {
  expanded: { width: 360, height: 420 },
  collapsed: { width: 360, height: 160 },
};

const createWindow = () => {
  mainWindow = new BrowserWindow({
    width: 1200,
    minWidth: 1200,
    height: 750,
    minHeight: 750,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      webviewTag: true,
    },
  });

  mainWindow.loadFile("index.html");
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
    toastWindow.webContents.send("toast:list", {
      items: toastItems,
      unreadCount: getUnreadCount(),
    });
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

const normalizeToastPayload = (payload) => {
  if (payload && typeof payload === "object") {
    const title = (payload.title || "").trim() || "新消息";
    const body = (payload.body || payload.message || "").trim();
    return { title, body, sessionId: payload.sessionId || payload.session_id || "" };
  }
  const text = typeof payload === "string" ? payload.trim() : "";
  return { title: "新消息", body: text, sessionId: "" };
};

const pushToastItem = (payload) => {
  const { title, body, sessionId } = normalizeToastPayload(payload);
  const text = body || "收到一条新消息";
  const timestamp = new Date().toLocaleTimeString("zh-CN", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sessionId) {
    unreadSessionIds.add(sessionId);
  }
  if (sessionId) {
    const existingIndex = toastItems.findIndex((item) => item.sessionId === sessionId);
    if (existingIndex >= 0) {
      const existing = toastItems[existingIndex];
      const updated = {
        ...existing,
        title,
        body: text,
        time: timestamp,
      };
      toastItems.splice(existingIndex, 1);
      toastItems.unshift(updated);
    } else {
      toastItems.unshift({
        id: Date.now(),
        title,
        body: text,
        sessionId,
        time: timestamp,
      });
    }
  } else {
    toastItems.unshift({
      id: Date.now(),
      title,
      body: text,
      sessionId,
      time: timestamp,
    });
  }
  if (toastItems.length > 50) {
    toastItems.splice(50);
  }
};

const getUnreadCount = () => {
  const noSessionCount = toastItems.filter((item) => !item.sessionId).length;
  return unreadSessionIds.size + noSessionCount;
};

const showToast = (payload) => {
  pushToastItem(payload);
  if (!toastWindow) {
    createToastWindow();
  }

  positionToast();
  toastWindow.webContents.send("toast:list", {
    items: toastItems,
    unreadCount: getUnreadCount(),
  });
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
  ipcMain.on("toast:open-session", (_event, sessionId) => {
    if (sessionId) {
      unreadSessionIds.delete(sessionId);
    }
    if (toastWindow) {
      toastWindow.webContents.send("toast:list", {
        items: toastItems,
        unreadCount: getUnreadCount(),
      });
    }
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
      mainWindow.webContents.send("webview:open-session", sessionId);
    }
    if (sessionId) {
      setTimeout(() => {
        const index = toastItems.findIndex((item) => item.sessionId === sessionId);
        if (index >= 0) {
          toastItems.splice(index, 1);
          if (toastWindow) {
            toastWindow.webContents.send("toast:list", {
              items: toastItems,
              unreadCount: getUnreadCount(),
            });
          }
        }
      }, 1500);
    }
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
