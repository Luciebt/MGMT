import fs from 'fs';
import path from 'path';

class ProjectDiscoveryService {
    constructor(extractor, database, config) {
        this.extractor = extractor;
        this.database = database;
        this.config = config;
    }

    async discoverProjects(rootPath, options = {}) {
        const {
            recursive = true,
            maxDepth = 3,
            includeBackups = false,
            updateExisting = false
        } = options;

        console.log(`Discovering Ableton projects in: ${rootPath}`);
        console.log(`Options:`, options);

        const projects = [];

        try {
            await this.scanDirectory(rootPath, projects, 0, maxDepth, includeBackups);

            console.log(`Found ${projects.length} project directories`);

            // Process projects in parallel with concurrency limit
            const results = await this.processProjectsBatch(projects, updateExisting);

            console.log(`Successfully processed ${results.filter(r => r.success).length} projects`);

            return results.filter(r => r.success).map(r => r.project);
        } catch (error) {
            console.error('Error during project discovery:', error);
            throw error;
        }
    }

    async scanDirectory(dirPath, projects, currentDepth, maxDepth, includeBackups) {
        if (currentDepth > maxDepth) return;

        try {
            const items = await fs.promises.readdir(dirPath, { withFileTypes: true });

            for (const item of items) {
                if (!item.isDirectory()) continue;

                const itemPath = path.join(dirPath, item.name);

                // Skip backup directories unless explicitly included
                if (!includeBackups && this.isBackupDirectory(item.name)) {
                    continue;
                }

                // Check if this is an Ableton project directory
                if (item.name.endsWith(' Project')) {
                    const projectName = item.name.replace(/ Project$/, '');
                    const alsFilePath = path.join(itemPath, `${projectName}.als`);

                    try {
                        await fs.promises.access(alsFilePath, fs.constants.F_OK);
                        projects.push({
                            projectName,
                            projectPath: itemPath,
                            alsFilePath
                        });
                    } catch {
                        console.warn(`Project directory found but no .als file: ${alsFilePath}`);
                    }
                } else {
                    // Recursively scan subdirectories
                    await this.scanDirectory(itemPath, projects, currentDepth + 1, maxDepth, includeBackups);
                }
            }
        } catch (error) {
            console.error(`Error scanning directory ${dirPath}:`, error);
        }
    }

    async processProjectsBatch(projects, updateExisting, batchSize = 5) {
        const results = [];

        for (let i = 0; i < projects.length; i += batchSize) {
            const batch = projects.slice(i, i + batchSize);

            const batchResults = await Promise.allSettled(
                batch.map(project => this.processProject(project, updateExisting))
            );

            results.push(...batchResults.map((result, index) => ({
                success: result.status === 'fulfilled',
                project: result.status === 'fulfilled' ? result.value : null,
                error: result.status === 'rejected' ? result.reason : null,
                originalProject: batch[index]
            })));

            // Small delay between batches to prevent overwhelming the system
            if (i + batchSize < projects.length) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return results;
    }

    async processProject(projectInfo, updateExisting) {
        try {
            // Check if project already exists in database
            const existingProject = this.database.getProjectByPath(projectInfo.alsFilePath);

            if (existingProject && !updateExisting) {
                console.log(`Project already exists: ${projectInfo.projectName}`);
                return existingProject;
            }

            // Get basic file info
            const stats = await fs.promises.stat(projectInfo.alsFilePath);

            // Extract metadata from the .als file
            const metadata = await this.extractor.extractProjectMetadata(projectInfo.alsFilePath);

            const project = {
                ...projectInfo,
                creationDate: stats.birthtime.toISOString(),
                lastModified: stats.mtime.toISOString(),
                fileSize: stats.size,
                notes: null, // Initialize notes
                status: null, // Initialize status
                bpm: metadata.bpm,
                trackCount: metadata.trackCount,
                sampleCount: metadata.sampleCount,
                setLength: metadata.setLength,
                ...metadata
            };

            // Save to database
            const result = this.database.insertProject(project);
            project.id = result.lastInsertRowid;

            console.log(`Processed project: ${project.projectName}`);
            return project;

        } catch (error) {
            console.error(`Failed to process project ${projectInfo.projectName}:`, error);
            throw error;
        }
    }



    isBackupDirectory(dirName) {
        const backupPatterns = [
            /backup/i,
            /\d{4}-\d{2}-\d{2}/,  // Date patterns
            /\.bak$/,
            /~$/
        ];

        return backupPatterns.some(pattern => pattern.test(dirName));
    }

    async getProjectStats(rootPath) {
        const projects = [];
        await this.scanDirectory(rootPath, projects, 0, 10, true);

        const stats = {
            totalProjects: projects.length,
            totalSizeBytes: 0,
            avgSizeBytes: 0,
            oldestProject: null,
            newestProject: null
        };

        for (const project of projects) {
            try {
                const stat = await fs.promises.stat(project.alsFilePath);
                stats.totalSizeBytes += stat.size;

                if (!stats.oldestProject || stat.birthtime < new Date(stats.oldestProject.creationDate)) {
                    stats.oldestProject = { ...project, creationDate: stat.birthtime.toISOString() };
                }

                if (!stats.newestProject || stat.birthtime > new Date(stats.newestProject.creationDate)) {
                    stats.newestProject = { ...project, creationDate: stat.birthtime.toISOString() };
                }
            } catch (error) {
                console.warn(`Could not stat ${project.alsFilePath}:`, error);
            }
        }

        stats.avgSizeBytes = stats.totalProjects > 0 ? stats.totalSizeBytes / stats.totalProjects : 0;

        return stats;
    }
}

export default ProjectDiscoveryService;
