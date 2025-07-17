import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import ProjectDatabase from './src/main/database/Database.js';
import { IPCHandlers } from './src/main/ipc/IPCHandlers.js';
import ProjectDiscoveryService from './src/main/services/ProjectDiscoveryService.js';
import AbletonProjectExtractor from './src/main/services/AbletonProjectExtractor.js';
import { ConfigService } from './src/main/services/ConfigService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

app.whenReady().then(async () => {
  createWindow();

  const database = new ProjectDatabase();
  const config = new ConfigService();
  await config.loadConfig(); // Load saved configuration
  const extractor = new AbletonProjectExtractor();
  const projectDiscovery = new ProjectDiscoveryService(extractor, database, config);
  const ipcHandlers = new IPCHandlers(database, projectDiscovery);

  ipcHandlers.registerAll();

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