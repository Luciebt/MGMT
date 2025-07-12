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
        bpm REAL,
        key TEXT,
        lastModified TEXT,
        fileSize INTEGER,
        version TEXT
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
            'ALTER TABLE projects ADD COLUMN bpm REAL',
            'ALTER TABLE projects ADD COLUMN key TEXT',
            'ALTER TABLE projects ADD COLUMN creationDate TEXT',
            'ALTER TABLE projects ADD COLUMN lastModified TEXT',
            'ALTER TABLE projects ADD COLUMN fileSize INTEGER',
            'ALTER TABLE projects ADD COLUMN version TEXT',
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
      (projectName, projectPath, alsFilePath, creationDate, bpm, key, lastModified, fileSize, version) 
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
        return stmt.run(
            project.projectName,
            project.projectPath,
            project.alsFilePath,
            project.creationDate,
            project.bpm,
            project.key,
            project.lastModified,
            project.fileSize,
            project.version
        );
    }

    getAllProjects() {
        return this.db.prepare('SELECT * FROM projects ORDER BY projectName').all();
    }

    updateProjectMetadata(id, bpm, key) {
        const stmt = this.db.prepare('UPDATE projects SET bpm = ?, key = ? WHERE id = ?');
        return stmt.run(bpm, key, id);
    }

    getProjectsNeedingMetadata() {
        return this.db.prepare('SELECT * FROM projects WHERE bpm IS NULL OR key IS NULL').all();
    }

    // Tag operations
    insertTag(name, color = '#007acc') {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO tags (name, color) VALUES (?, ?)');
        const result = stmt.run(name, color);
        return result.lastInsertRowid || this.db.prepare('SELECT id FROM tags WHERE name = ?').get(name).id;
    }

    getAllTags() {
        return this.db.prepare('SELECT * FROM tags ORDER BY name').all();
    }

    // Project-Tag operations
    addProjectTag(projectId, tagId) {
        const stmt = this.db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)');
        return stmt.run(projectId, tagId);
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
    filterProjects({ projectName, tagNames, bpmRange, key, dateRange }) {
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

        if (bpmRange) {
            conditions.push('p.bpm BETWEEN ? AND ?');
            params.push(bpmRange.min, bpmRange.max);
        }

        if (key) {
            conditions.push('p.key = ?');
            params.push(key);
        }

        if (dateRange) {
            conditions.push('p.creationDate BETWEEN ? AND ?');
            params.push(dateRange.start, dateRange.end);
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
