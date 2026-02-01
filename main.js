const { app, BrowserWindow, Notification, ipcMain, systemPreferences } = require("electron");
const path = require("path");

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

const showTestNotification = (message) => {
  const body = message && message.trim()
    ? message.trim()
    : "这是一条来自 Electron 的基础通知。";
  const notification = new Notification({
    title: "系统通知测试",
    body,
  });

  notification.show();
};

app.whenReady().then(() => {
  if (process.platform === "win32") {
    app.setAppUserModelId("com.shushubuyue.electron.notify-test");
  }
  createWindow();
  showTestNotification();
  ipcMain.handle("notify:test", (_event, message) => {
    if (!Notification.isSupported()) {
      return { ok: false, reason: "当前系统不支持通知功能。" };
    }
    showTestNotification(message);
    return { ok: true };
  });
  ipcMain.handle("notify:status", () => {
    if (!Notification.isSupported()) {
      return {
        supported: false,
        authorizationStatus: "unsupported",
      };
    }
    if (process.platform === "darwin") {
      const settings = systemPreferences.getNotificationSettings();
      return {
        supported: true,
        authorizationStatus: settings.authorizationStatus,
      };
    }
    return {
      supported: true,
      authorizationStatus: "unknown",
    };
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
