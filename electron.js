import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import { parseStringPromise } from 'xml2js';
import Database from 'better-sqlite3';
import zlib from 'zlib';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database
const dbPath = path.join(app.getPath('userData'), 'ableton_projects.db');
const db = new Database(dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectName TEXT NOT NULL,
    projectPath TEXT NOT NULL UNIQUE,
    alsFilePath TEXT NOT NULL,
    creationDate TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS project_tags (
    project_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    PRIMARY KEY (project_id, tag_id),
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
  )
`);

async function discoverAbletonProjects(rootPath) {
  const projects = [];
  const dirents = await fs.promises.readdir(rootPath, { withFileTypes: true });

  for (const dirent of dirents) {
    if (dirent.isDirectory() && dirent.name.endsWith(' Project')) {
      const projectPath = path.join(rootPath, dirent.name);
      const projectName = dirent.name.replace(/ Project$/, '');
      const alsFilePath = path.join(projectPath, `${projectName}.als`);

      // Verify if the .als file exists
      try {
        const stats = await fs.promises.stat(alsFilePath);
        const project = {
          projectName,
          projectPath,
          alsFilePath,
          creationDate: stats.birthtime.toISOString(),
        };
        projects.push(project);
      } catch (error) {
        console.warn(`Skipping ${dirent.name}: No corresponding .als file found or other access issue.`, error.message);
      }
    }
  }
  return projects;
}

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true,
      contextIsolation: true,
    },
  });

  win.loadURL('http://localhost:5173');
  win.webContents.openDevTools();
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('dialog:openRootDirectory', async () => {
    const rootDirectory = '/Users/lbt/Documents/code_projects/live_sets_test';
    console.log('Attempting to discover projects in:', rootDirectory);
    const projects = await discoverAbletonProjects(rootDirectory);
    console.log('Discovered projects:', projects);

    // Save discovered projects to database
    const insert = db.prepare(
      'INSERT OR IGNORE INTO projects (projectName, projectPath, alsFilePath, creationDate) VALUES (?, ?, ?, ?)'
    );
    db.transaction(() => {
      for (const project of projects) {
        insert.run(
          project.projectName,
          project.projectPath,
          project.alsFilePath,
          project.creationDate
        );
      }
    })();
    console.log('Projects saved to database.');
    return { rootDirectory, projects };
  });

  ipcMain.handle('db:getProjects', async () => {
    const projects = db.prepare('SELECT * FROM projects').all();
    for (const project of projects) {
      if (!project.creationDate) {
        try {
          const stats = await fs.promises.stat(project.alsFilePath);
          project.creationDate = stats.birthtime.toISOString();
          db.prepare('UPDATE projects SET creationDate = ? WHERE id = ?').run(project.creationDate, project.id);
        } catch (error) {
          console.warn(`Failed to get creation date for ${project.alsFilePath}:`, error.message);
        }
      }
    }
    console.log('Fetched projects from DB:', projects);
    return projects;
  });

  ipcMain.handle('db:addTag', (event, tagName) => {
    const insert = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    insert.run(tagName);
    return db.prepare('SELECT id FROM tags WHERE name = ?').get(tagName).id;
  });

  ipcMain.handle('db:addProjectTag', (event, projectId, tagId) => {
    const insert = db.prepare('INSERT OR IGNORE INTO project_tags (project_id, tag_id) VALUES (?, ?)');
    insert.run(projectId, tagId);
  });

  ipcMain.handle('db:getTags', () => {
    const tags = db.prepare('SELECT * FROM tags').all();
    console.log('Fetched tags from DB:', tags);
    return tags;
  });

  ipcMain.handle('db:getProjectTags', (event, projectId) => {
    const projectTags = db.prepare(
      'SELECT t.id, t.name FROM tags t JOIN project_tags pt ON t.id = pt.tag_id WHERE pt.project_id = ?'
    ).all(projectId);
    console.log(`Fetched tags for project ${projectId}:`, projectTags);
    return projectTags;
  });

  ipcMain.handle('db:filterProjects', (event, { projectName, tagNames }) => {
    let query = 'SELECT p.* FROM projects p';
    const params = [];

    if (tagNames && tagNames.length > 0) {
      query += ' JOIN project_tags pt ON p.id = pt.project_id JOIN tags t ON pt.tag_id = t.id';
    }

    const conditions = [];

    if (projectName) {
      conditions.push('p.projectName LIKE ?');
      params.push(`%${projectName}%`);
    }

    if (tagNames && tagNames.length > 0) {
      conditions.push(`t.name IN (${tagNames.map(() => '?').join(', ')})`);
      params.push(...tagNames);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    if (tagNames && tagNames.length > 0) {
      query += ' GROUP BY p.id HAVING COUNT(DISTINCT t.id) = ?';
      params.push(tagNames.length);
    }

    const filteredProjects = db.prepare(query).all(...params);
    console.log('Filtered projects:', filteredProjects);
    return filteredProjects;
  });

  ipcMain.handle('file:readAls', async (event, filePath) => {
    try {
      const fileBuffer = await fs.promises.readFile(filePath);
      const decompressedData = zlib.gunzipSync(fileBuffer).toString('utf-8');
      const parsedData = await parseStringPromise(decompressedData);
      console.log('Parsed ALS data:', parsedData);
      return parsedData;
    } catch (error) {
      console.error('Failed to read or parse ALS file:', error);
      return null;
    }
  });

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