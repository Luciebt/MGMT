import fs from 'fs';
import path from 'path';
import { app } from 'electron';

export class Logger {
    constructor() {
        this.logLevels = {
            error: 0,
            warn: 1,
            info: 2,
            debug: 3
        };
        this.currentLevel = this.logLevels.info;
        this.logDir = path.join(app.getPath('userData'), 'logs');
        this.ensureLogDirectory();
    }

    async ensureLogDirectory() {
        try {
            await fs.promises.mkdir(this.logDir, { recursive: true });
        } catch (error) {
            console.error('Failed to create log directory:', error);
        }
    }

    setLevel(level) {
        if (this.logLevels.hasOwnProperty(level)) {
            this.currentLevel = this.logLevels[level];
        }
    }

    formatMessage(level, message, ...args) {
        const timestamp = new Date().toISOString();
        const formattedArgs = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        return `[${timestamp}] [${level.toUpperCase()}] ${message} ${formattedArgs}`;
    }

    async writeToFile(level, formattedMessage) {
        try {
            const today = new Date().toISOString().split('T')[0];
            const logFile = path.join(this.logDir, `${today}.log`);
            await fs.promises.appendFile(logFile, formattedMessage + '\n');
        } catch (error) {
            console.error('Failed to write to log file:', error);
        }
    }

    async log(level, message, ...args) {
        if (this.logLevels[level] <= this.currentLevel) {
            const formattedMessage = this.formatMessage(level, message, ...args);
            console[level](formattedMessage);
            await this.writeToFile(level, formattedMessage);
        }
    }

    error(message, ...args) {
        return this.log('error', message, ...args);
    }

    warn(message, ...args) {
        return this.log('warn', message, ...args);
    }

    info(message, ...args) {
        return this.log('info', message, ...args);
    }

    debug(message, ...args) {
        return this.log('debug', message, ...args);
    }

    // Clean up old log files (keep last 7 days)
    async cleanup() {
        try {
            const files = await fs.promises.readdir(this.logDir);
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - 7);

            for (const file of files) {
                if (file.endsWith('.log')) {
                    const fileDate = new Date(file.replace('.log', ''));
                    if (fileDate < cutoffDate) {
                        await fs.promises.unlink(path.join(this.logDir, file));
                    }
                }
            }
        } catch (error) {
            console.error('Failed to cleanup log files:', error);
        }
    }
}
