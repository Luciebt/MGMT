import { ipcMain } from 'electron';

export class IPCHandlers {
    constructor(database, projectDiscovery) {
        this.database = database;
        this.projectDiscovery = projectDiscovery;
    }

    registerAll() {
        // Project discovery and management
        ipcMain.handle('dialog:openRootDirectory', this.handleOpenRootDirectory.bind(this));
        ipcMain.handle('db:getProjects', this.handleGetProjects.bind(this));
        ipcMain.handle('db:updateMetadata', this.handleUpdateMetadata.bind(this));

        // Tag management
        ipcMain.handle('db:addTag', this.handleAddTag.bind(this));
        ipcMain.handle('db:addProjectTag', this.handleAddProjectTag.bind(this));
        ipcMain.handle('db:getTags', this.handleGetTags.bind(this));
        ipcMain.handle('db:getProjectTags', this.handleGetProjectTags.bind(this));

        // Filtering and search
        ipcMain.handle('db:filterProjects', this.handleFilterProjects.bind(this));

        // File operations
        ipcMain.handle('file:readAls', this.handleReadAls.bind(this));

        // Configuration
        ipcMain.handle('config:get', this.handleGetConfig.bind(this));
        ipcMain.handle('config:update', this.handleUpdateConfig.bind(this));
        ipcMain.handle('config:getThemePreference', this.handleGetThemePreference.bind(this));
        ipcMain.handle('config:setThemePreference', this.handleSetThemePreference.bind(this));
    }

    async handleOpenRootDirectory() {
        try {
            const rootDirectory = this.projectDiscovery.config.getDefaultRootPath();
            console.log('Attempting to discover projects in:', rootDirectory);

            // First update existing projects with missing metadata
            await this.projectDiscovery.updateProjectsMetadata();

            const projects = await this.projectDiscovery.discoverProjects(rootDirectory);
            console.log('Discovered projects:', projects);

            // Save discovered projects to database
            for (const project of projects) {
                this.database.addProject(project);
            }

            console.log('Projects saved to database.');
            return { rootDirectory, projects };
        } catch (error) {
            console.error('Error in handleOpenRootDirectory:', error);
            throw error;
        }
    }

    async handleGetProjects() {
        try {
            const projects = this.database.getProjects();
            console.log('Fetched projects from DB:', projects);
            return projects;
        } catch (error) {
            console.error('Error in handleGetProjects:', error);
            throw error;
        }
    }

    async handleUpdateMetadata() {
        try {
            await this.projectDiscovery.updateProjectsMetadata();
            return { success: true };
        } catch (error) {
            console.error('Error in handleUpdateMetadata:', error);
            throw error;
        }
    }

    async handleAddTag(event, tagName) {
        try {
            const tagId = this.database.addTag(tagName);
            return tagId;
        } catch (error) {
            console.error('Error in handleAddTag:', error);
            throw error;
        }
    }

    async handleAddProjectTag(event, projectId, tagId) {
        try {
            this.database.addProjectTag(projectId, tagId);
        } catch (error) {
            console.error('Error in handleAddProjectTag:', error);
            throw error;
        }
    }

    async handleGetTags() {
        try {
            const tags = this.database.getTags();
            console.log('Fetched tags from DB:', tags);
            return tags;
        } catch (error) {
            console.error('Error in handleGetTags:', error);
            throw error;
        }
    }

    async handleGetProjectTags(event, projectId) {
        try {
            const projectTags = this.database.getProjectTags(projectId);
            console.log(`Fetched tags for project ${projectId}:`, projectTags);
            return projectTags;
        } catch (error) {
            console.error('Error in handleGetProjectTags:', error);
            throw error;
        }
    }

    async handleFilterProjects(event, filters) {
        try {
            const filteredProjects = this.database.filterProjects(filters);
            console.log('Filtered projects:', filteredProjects);
            return filteredProjects;
        } catch (error) {
            console.error('Error in handleFilterProjects:', error);
            throw error;
        }
    }

    async handleReadAls(event, filePath) {
        try {
            const parsedData = await this.projectDiscovery.extractor.readALSFile(filePath);
            console.log('Parsed ALS data:', parsedData);
            return parsedData;
        } catch (error) {
            console.error('Failed to read or parse ALS file:', error);
            return null;
        }
    }

    async handleGetConfig() {
        try {
            return this.projectDiscovery.config.config;
        } catch (error) {
            console.error('Error in handleGetConfig:', error);
            throw error;
        }
    }

    async handleUpdateConfig(event, updates) {
        try {
            this.projectDiscovery.config.updateConfig(updates);
            await this.projectDiscovery.config.saveConfig();
            return { success: true };
        } catch (error) {
            console.error('Error in handleUpdateConfig:', error);
            throw error;
        }
    }

    async handleGetThemePreference() {
        try {
            return this.projectDiscovery.config.getThemePreference();
        } catch (error) {
            console.error('Error in handleGetThemePreference:', error);
            throw error;
        }
    }

    async handleSetThemePreference(event, theme) {
        try {
            await this.projectDiscovery.config.setThemePreference(theme);
            return { success: true };
        } catch (error) {
            console.error('Error in handleSetThemePreference:', error);
            throw error;
        }
    }
}
