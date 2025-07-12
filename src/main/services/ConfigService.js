import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class ConfigService {
    constructor() {
        this.config = {
            isDevelopment: !app.isPackaged,
            databasePath: path.join(app.getPath('userData'), 'ableton_projects.db'),
            defaultRootPath: '/Users/lbt/Documents/code_projects/live_sets_test',
            logLevel: 'info',
            maxConcurrentExtractions: 5,
            extractionTimeout: 30000, // 30 seconds
            cacheEnabled: true,
            cacheTTL: 3600000, // 1 hour
        };
    }

    isDevelopment() {
        return this.config.isDevelopment;
    }

    getDatabasePath() {
        return this.config.databasePath;
    }

    getDefaultRootPath() {
        return this.config.defaultRootPath;
    }

    getLogLevel() {
        return this.config.logLevel;
    }

    getMaxConcurrentExtractions() {
        return this.config.maxConcurrentExtractions;
    }

    getExtractionTimeout() {
        return this.config.extractionTimeout;
    }

    isCacheEnabled() {
        return this.config.cacheEnabled;
    }

    getCacheTTL() {
        return this.config.cacheTTL;
    }

    // Load configuration from file if exists
    async loadConfig() {
        try {
            const configPath = path.join(app.getPath('userData'), 'config.json');
            if (await fs.promises.access(configPath).then(() => true).catch(() => false)) {
                const userConfig = JSON.parse(await fs.promises.readFile(configPath, 'utf-8'));
                this.config = { ...this.config, ...userConfig };
            }
        } catch (error) {
            console.warn('Failed to load user config:', error.message);
        }
    }

    // Save configuration to file
    async saveConfig() {
        try {
            const configPath = path.join(app.getPath('userData'), 'config.json');
            await fs.promises.writeFile(configPath, JSON.stringify(this.config, null, 2));
        } catch (error) {
            console.error('Failed to save config:', error.message);
        }
    }

    // Update configuration
    updateConfig(updates) {
        this.config = { ...this.config, ...updates };
    }
}
