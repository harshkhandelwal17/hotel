const { app, BrowserWindow, ipcMain, Menu, session } = require('electron');
const path = require('path');
const fs = require('fs');

// Path to configuration file
const configPath = path.join(__dirname, 'config.json');

// Helper to read configuration safely
function readConfig() {
  try {
    if (fs.existsSync(configPath)) {
      const data = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading config.json:', err);
  }
  return {
    serverUrl: '',
    appName: 'NXHotel PMS',
    fullscreenOnStart: false,
    silentPrintByDefault: false,
    autoReconnect: true,
    reconnectIntervalMs: 5000
  };
}

// Helper to save configuration safely
function saveConfig(updates) {
  try {
    const current = readConfig();
    const merged = { ...current, ...updates };
    fs.writeFileSync(configPath, JSON.stringify(merged, null, 2), 'utf8');
    return merged;
  } catch (err) {
    console.error('Error saving config.json:', err);
    return null;
  }
}

// Window state storage in user profile directory
const windowStateFile = path.join(app.getPath('userData'), 'window-state.json');

function readWindowState() {
  try {
    if (fs.existsSync(windowStateFile)) {
      return JSON.parse(fs.readFileSync(windowStateFile, 'utf8'));
    }
  } catch (_) {}
  return { width: 1366, height: 820, isMaximized: false };
}

function saveWindowState(win) {
  if (!win) return;
  try {
    const isMaximized = win.isMaximized();
    const bounds = win.getBounds();
    fs.writeFileSync(
      windowStateFile,
      JSON.stringify({
        x: bounds.x,
        y: bounds.y,
        width: bounds.width,
        height: bounds.height,
        isMaximized
      }),
      'utf8'
    );
  } catch (_) {}
}

// -------------------------------------------------------------
// 1. SINGLE INSTANCE LOCK
// -------------------------------------------------------------
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
  process.exit(0);
}

let mainWindow = null;

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
  }
});

// -------------------------------------------------------------
// 2. WINDOW CREATION
// -------------------------------------------------------------
function createWindow() {
  const config = readConfig();
  const savedState = readWindowState();

  mainWindow = new BrowserWindow({
    width: savedState.width || 1366,
    height: savedState.height || 820,
    x: savedState.x,
    y: savedState.y,
    minWidth: 1024,
    minHeight: 680,
    title: config.appName || 'NXHotel PMS — Reception & Command Center',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      spellcheck: false
    },
    backgroundColor: '#ffffff',
    show: false // Show only after ready-to-show to prevent white flash
  });

  if (savedState.isMaximized) {
    mainWindow.maximize();
  }

  if (config.fullscreenOnStart) {
    mainWindow.setFullScreen(true);
  }

  // Graceful show on ready
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Handle external links safely via user default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      if (!url.includes('nxhotel.nexisparkx.com') && !url.includes('localhost')) {
        const { shell } = require('electron');
        shell.openExternal(url);
        return { action: 'deny' };
      }
    }
    return { action: 'allow' };
  });

  // Determine target URL
  loadApplication(mainWindow, config);

  // Setup Application Menu (with Reload, Fullscreen, POS Mode shortcuts)
  buildApplicationMenu();
}

// -------------------------------------------------------------
// 3. APPLICATION LOADER & FAILOVER
// -------------------------------------------------------------
function loadApplication(win, config) {
  const isDev = process.argv.includes('--dev');
  const targetServer = config.serverUrl ? config.serverUrl.trim() : '';

  if (isDev) {
    console.log('[NXHotel Desktop] Running in Dev mode (http://localhost:5173)');
    win.loadURL('http://localhost:5173');
  } else if (targetServer) {
    console.log(`[NXHotel Desktop] Connecting to Cloud VPS: ${targetServer}`);
    win.loadURL(targetServer);
  } else {
    // Default: Bundled static build
    const localDist = path.join(__dirname, '../frontend/dist/index.html');
    if (fs.existsSync(localDist)) {
      console.log(`[NXHotel Desktop] Loading local bundled build: ${localDist}`);
      win.loadFile(localDist);
    } else {
      console.warn('[NXHotel Desktop] local dist not found, opening offline screen');
      win.loadFile(path.join(__dirname, 'offline.html'));
    }
  }

  // Catch connection failures (e.g. server offline or network down)
  win.webContents.on('did-fail-load', (event, errorCode, errorDescription, validatedURL) => {
    // Ignore internal aborts / subframe aborts
    if (errorCode === -3) return;
    
    console.warn(`[NXHotel Desktop] Failed to load ${validatedURL}: ${errorDescription} (${errorCode})`);
    
    // Fallback to offline recovery page
    if (!validatedURL.includes('offline.html')) {
      win.loadFile(path.join(__dirname, 'offline.html'));
    }
  });
}

// -------------------------------------------------------------
// 4. MENU & NATIVE SHORTCUTS
// -------------------------------------------------------------
function buildApplicationMenu() {
  const template = [
    {
      label: 'File',
      submenu: [
        {
          label: 'Print (Ctrl+P)',
          accelerator: 'CmdOrCtrl+P',
          click: () => {
            if (mainWindow) mainWindow.webContents.print();
          }
        },
        { type: 'separator' },
        {
          label: 'Exit NXHotel',
          accelerator: 'CmdOrCtrl+Q',
          click: () => app.quit()
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Reload (Live Update)',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reload();
          }
        },
        {
          label: 'Hard Reload (Clear Cache)',
          accelerator: 'CmdOrCtrl+Shift+R',
          click: () => {
            if (mainWindow) mainWindow.webContents.reloadIgnoringCache();
          }
        },
        { type: 'separator' },
        {
          label: 'Toggle Fullscreen (POS Mode)',
          accelerator: 'F11',
          click: () => {
            if (mainWindow) mainWindow.setFullScreen(!mainWindow.isFullScreen());
          }
        },
        {
          label: 'Actual Size',
          accelerator: 'CmdOrCtrl+0',
          click: () => {
            if (mainWindow) mainWindow.webContents.setZoomLevel(0);
          }
        },
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+Plus',
          click: () => {
            if (mainWindow) {
              const current = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(current + 0.5);
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: () => {
            if (mainWindow) {
              const current = mainWindow.webContents.getZoomLevel();
              mainWindow.webContents.setZoomLevel(current - 0.5);
            }
          }
        },
        { type: 'separator' },
        {
          label: 'Developer Tools',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// -------------------------------------------------------------
// 5. IPC HANDLERS (HARDWARE, PRINTING & CONFIG)
// -------------------------------------------------------------

// Silent / Direct Printing to Thermal or A4 Printer
ipcMain.handle('print-silent', async (event, options = {}) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return { success: false, error: 'Window not found' };

  return new Promise((resolve) => {
    win.webContents.print(
      {
        silent: options.silent !== undefined ? options.silent : true,
        printBackground: true,
        deviceName: options.deviceName || '',
        copies: options.copies || 1,
        pageSize: options.pageSize || 'A4',
        margins: { marginType: 'none' }
      },
      (success, failureReason) => {
        resolve({ success, failureReason });
      }
    );
  });
});

// List all installed hardware printers
ipcMain.handle('get-printers', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) return [];
  try {
    return await win.webContents.getPrintersAsync();
  } catch (err) {
    console.error('Failed to get printers:', err);
    return [];
  }
});

// Fullscreen toggle
ipcMain.handle('toggle-fullscreen', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const isFull = win.isFullScreen();
    win.setFullScreen(!isFull);
    return !isFull;
  }
  return false;
});

// Reload
ipcMain.handle('reload-app', (event, hard = false) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    const config = readConfig();
    loadApplication(win, config);
  }
});

// Config getters & setters
ipcMain.handle('get-config', () => {
  return readConfig();
});

ipcMain.handle('save-server-url', (event, newUrl) => {
  const updated = saveConfig({ serverUrl: newUrl });
  return updated;
});

// -------------------------------------------------------------
// 6. LIFECYCLE
// -------------------------------------------------------------
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

