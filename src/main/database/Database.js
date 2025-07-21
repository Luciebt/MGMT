import Database from 'better-sqlite3';
import path from 'path';
import { app } from 'electron';

class ProjectDatabase {
    constructor() {
        const dbPath = path.join(app.getPath('userData'), 'ableton_projects.db');
        this.db = new Database(dbPath);
        this.initializeTables();
        this.runMigrations();
    }

    initializeTables() {
        this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        projectName TEXT NOT NULL,
        projectPath TEXT NOT NULL UNIQUE,
        alsFilePath TEXT NOT NULL,
        creationDate TEXT,
        lastModified TEXT,
        fileSize INTEGER,
        version TEXT,
        notes TEXT,
        status TEXT,
        bpm REAL,
        trackCount INTEGER,
        sampleCount INTEGER,
        setLength TEXT
      )
    `);

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS tags (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL UNIQUE,
        color TEXT DEFAULT '#007acc',
        createdAt TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS project_tags (
        project_id INTEGER NOT NULL,
        tag_id INTEGER NOT NULL,
        PRIMARY KEY (project_id, tag_id),
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
        FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
      )
    `);

        this.db.exec(`
      CREATE TABLE IF NOT EXISTS extraction_cache (
        file_path TEXT PRIMARY KEY,
        file_hash TEXT NOT NULL,
        bpm REAL,
        key TEXT,
        extracted_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);
    }

    runMigrations() {
        const migrations = [
            'ALTER TABLE projects ADD COLUMN notes TEXT',
            'ALTER TABLE projects ADD COLUMN status TEXT',
            'ALTER TABLE projects ADD COLUMN bpm REAL',
            'ALTER TABLE projects ADD COLUMN trackCount INTEGER',
            'ALTER TABLE projects ADD COLUMN sampleCount INTEGER',
            'ALTER TABLE projects ADD COLUMN setLength TEXT',
            'ALTER TABLE tags ADD COLUMN color TEXT DEFAULT "#007acc"',
            'ALTER TABLE tags ADD COLUMN createdAt TEXT DEFAULT CURRENT_TIMESTAMP'
        ];

        migrations.forEach(migration => {
            try {
                this.db.exec(migration);
            } catch (e) {
                // Column already exists or other non-critical error
            }
        });
    }

    // Project operations
    insertProject(project) {
        const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO projects 
      (projectName, projectPath, alsFilePath, creationDate, lastModified, fileSize, version, notes, status, bpm, trackCount, sampleCount, setLength) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        return stmt.run(
            project.projectName,
            project.projectPath,
            project.alsFilePath,
            project.creationDate,
            project.lastModified,
            project.fileSize,
            project.version,
            project.notes,
            project.status,
            project.bpm,
            project.trackCount,
            project.sampleCount,
            project.setLength
        );
    }

    getProjects() {
        return this.db.prepare('SELECT * FROM projects ORDER BY projectName').all();
    }

    updateProjectNotes(id, notes) {
        const stmt = this.db.prepare('UPDATE projects SET notes = ? WHERE id = ?');
        return stmt.run(notes, id);
    }

    updateProjectStatus(id, status) {
        const stmt = this.db.prepare('UPDATE projects SET status = ? WHERE id = ?');
        return stmt.run(status, id);
    }

    // Tag operations
    insertTag(name, color = '#007acc') {
        try {
            // First check if tag already exists
            const existingTag = this.db.prepare('SELECT id FROM tags WHERE name = ?').get(name);
            if (existingTag) {
                console.log('Existing tag found with ID:', existingTag.id);
                return existingTag.id;
            }

            // Insert new tag
            const stmt = this.db.prepare('INSERT INTO tags (name, color) VALUES (?, ?)');
            const result = stmt.run(name, color);

            if (result.lastInsertRowid) {
                console.log('New tag inserted with ID:', result.lastInsertRowid);
                // Verify the insert was successful
                const verifyTag = this.db.prepare('SELECT id FROM tags WHERE id = ?').get(result.lastInsertRowid);
                if (!verifyTag) {
                    throw new Error(`Failed to verify insertion of tag with ID ${result.lastInsertRowid}`);
                }
                return result.lastInsertRowid;
            }

            throw new Error(`Failed to insert tag: ${name}`);
        } catch (error) {
            console.error('Error in insertTag:', error);
            throw error;
        }
    }

    getAllTags() {
        return this.db.prepare('SELECT * FROM tags ORDER BY name').all();
    }

    // Project-Tag operations
    addProjectTag(projectId, tagId) {
        try {
            console.log('Database: Adding project tag - projectId:', projectId, 'tagId:', tagId);

            // Verify that the project exists
            const project = this.db.prepare('SELECT id FROM projects WHERE id = ?').get(projectId);
            if (!project) {
                throw new Error(`Project with ID ${projectId} does not exist`);
            }

            // Verify that the tag exists
            const tag = this.db.prepare('SELECT id FROM tags WHERE id = ?').get(tagId);
            if (!tag) {
                throw new Error(`Tag with ID ${tagId} does not exist`);
            }

            const stmt = this.db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)');
            const result = stmt.run(projectId, tagId);
            console.log('Database: Project tag operation result:', result);
            return result;
        } catch (error) {
            console.error('Database: Error in addProjectTag:', error);
            throw error;
        }
    }

    removeProjectTag(projectId, tagId) {
        const stmt = this.db.prepare('DELETE FROM project_tags WHERE project_id = ? AND tag_id = ?');
        return stmt.run(projectId, tagId);
    }

    deleteTag(tagId) {
        try {
            // First, remove all project associations for this tag
            const removeAssociationsStmt = this.db.prepare('DELETE FROM project_tags WHERE tag_id = ?');
            const associationsResult = removeAssociationsStmt.run(tagId);
            console.log('Database: Removed tag associations:', associationsResult);

            // Then, delete the tag itself
            const deleteTagStmt = this.db.prepare('DELETE FROM tags WHERE id = ?');
            const deleteResult = deleteTagStmt.run(tagId);
            console.log('Database: Deleted tag:', deleteResult);

            return deleteResult;
        } catch (error) {
            console.error('Database: Error in deleteTag:', error);
            throw error;
        }
    }

    getProjectTags(projectId) {
        return this.db.prepare(`
      SELECT t.id, t.name, t.color 
      FROM tags t 
      JOIN project_tags pt ON t.id = pt.tag_id 
      WHERE pt.project_id = ?
    `).all(projectId);
    }

    // Advanced filtering
    filterProjects({ projectName, tagNames, dateRange, status }) {
        let query = 'SELECT DISTINCT p.* FROM projects p';
        const params = [];
        const conditions = [];

        if (tagNames && tagNames.length > 0) {
            query += ' JOIN project_tags pt ON p.id = pt.project_id JOIN tags t ON pt.tag_id = t.id';
            conditions.push(`t.name IN (${tagNames.map(() => '?').join(', ')})`);
            params.push(...tagNames);
        }

        if (projectName) {
            conditions.push('p.projectName LIKE ?');
            params.push(`%${projectName}%`);
        }

        if (dateRange) {
            conditions.push('p.creationDate BETWEEN ? AND ?');
            params.push(dateRange.start, dateRange.end);
        }

        if (status) {
            conditions.push('p.status = ?');
            params.push(status);
        }

        if (conditions.length > 0) {
            query += ' WHERE ' + conditions.join(' AND ');
        }

        if (tagNames && tagNames.length > 0) {
            query += ' GROUP BY p.id HAVING COUNT(DISTINCT t.id) = ?';
            params.push(tagNames.length);
        }

        return this.db.prepare(query).all(...params);
    }

    close() {
        this.db.close();
    }
}

export default ProjectDatabase;
