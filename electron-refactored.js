import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { Database } from './src/main/database/Database.js';
import { ProjectDiscoveryService } from './src/main/services/ProjectDiscoveryService.js';
import { IPCHandlers } from './src/main/ipc/IPCHandlers.js';
import { ConfigService } from './src/main/services/ConfigService.js';
import { Logger } from './src/main/utils/Logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class ElectronApp {
    constructor() {
        this.mainWindow = null;
        this.logger = new Logger();
        this.config = new ConfigService();
        this.database = new Database(this.config.getDatabasePath());
        this.projectDiscovery = new ProjectDiscoveryService(this.database);
        this.ipcHandlers = new IPCHandlers(this.database, this.projectDiscovery);
    }

    async initialize() {
        await app.whenReady();
        await this.database.initialize();
        this.createWindow();
        this.setupIPC();
        this.setupEventHandlers();
    }

    createWindow() {
        this.mainWindow = new BrowserWindow({
            width: 1200,
            height: 800,
            webPreferences: {
                preload: path.join(__dirname, 'preload.js'),
                nodeIntegration: false, // Security improvement
                contextIsolation: true,
                enableRemoteModule: false,
                sandbox: false // Needed for preload script
            },
        });

        if (this.config.isDevelopment()) {
            this.mainWindow.loadURL('http://localhost:5173');
            this.mainWindow.webContents.openDevTools();
        } else {
            this.mainWindow.loadFile(path.join(__dirname, 'dist/index.html'));
        }
    }

    setupIPC() {
        this.ipcHandlers.registerAll();
    }

    setupEventHandlers() {
        app.on('window-all-closed', () => {
            if (process.platform !== 'darwin') {
                app.quit();
            }
        });

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                this.createWindow();
            }
        });

        process.on('uncaughtException', (error) => {
            this.logger.error('Uncaught Exception:', error);
        });

        process.on('unhandledRejection', (reason, promise) => {
            this.logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
        });
    }
}

// Initialize the application
const electronApp = new ElectronApp();
electronApp.initialize().catch((error) => {
    console.error('Failed to initialize Electron app:', error);
    process.exit(1);
});
