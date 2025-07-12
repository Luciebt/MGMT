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

// Create tables with IF NOT EXISTS and proper schema
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectName TEXT NOT NULL,
    projectPath TEXT NOT NULL UNIQUE,
    alsFilePath TEXT NOT NULL,
    creationDate TEXT,
    bpm REAL,
    key TEXT,
    status TEXT DEFAULT 'None'
  )
`);

// Add missing columns if they don't exist (for database migration)
try {
  db.exec(`ALTER TABLE projects ADD COLUMN bpm REAL`);
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE projects ADD COLUMN key TEXT`);
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE projects ADD COLUMN creationDate TEXT`);
} catch (e) {
  // Column already exists, ignore error
}

try {
  db.exec(`ALTER TABLE projects ADD COLUMN status TEXT DEFAULT 'None'`);
} catch (e) {
  // Column already exists, ignore error
}

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

// Helper function to safely extract BPM from parsed ALS data
function extractBPM(parsedData) {
  try {
    console.log('extractBPM: Starting BPM extraction...');
    // Try different possible paths for BPM
    const liveSet = parsedData.Ableton?.LiveSet?.[0];
    if (!liveSet) {
      console.log('extractBPM: No LiveSet found');
      return null;
    }

    console.log('extractBPM: LiveSet found, checking paths...');

    // Path 1: MasterTrack > DeviceChain > Mixer > Tempo > Manual > $.Value
    const masterTrack = liveSet.MasterTrack?.[0];
    console.log('extractBPM: MasterTrack exists:', !!masterTrack);

    if (masterTrack?.DeviceChain?.[0]?.Mixer?.[0]?.Tempo?.[0]?.Manual?.[0]?.$?.Value) {
      const bpm = parseFloat(masterTrack.DeviceChain[0].Mixer[0].Tempo[0].Manual[0].$.Value);
      console.log('extractBPM: Found BPM in MasterTrack path:', bpm);
      return bpm;
    }

    // Path 2: Check if tempo is stored elsewhere
    if (liveSet.Transport?.[0]?.Tempo?.[0]?.Manual?.[0]?.$?.Value) {
      const bpm = parseFloat(liveSet.Transport[0].Tempo[0].Manual[0].$.Value);
      console.log('extractBPM: Found BPM in Transport path:', bpm);
      return bpm;
    }

    // Path 3: Check LiveSet level tempo
    if (liveSet.Tempo?.[0]?.Manual?.[0]?.$?.Value) {
      const bpm = parseFloat(liveSet.Tempo[0].Manual[0].$.Value);
      console.log('extractBPM: Found BPM in LiveSet Tempo path:', bpm);
      return bpm;
    }

    // Debug: Let's see what paths are actually available
    console.log('extractBPM: Available top-level keys in LiveSet:', Object.keys(liveSet));

    if (masterTrack) {
      console.log('extractBPM: Available keys in MasterTrack:', Object.keys(masterTrack));
      if (masterTrack.DeviceChain?.[0]) {
        console.log('extractBPM: Available keys in DeviceChain:', Object.keys(masterTrack.DeviceChain[0]));
        if (masterTrack.DeviceChain[0].Mixer?.[0]) {
          console.log('extractBPM: Available keys in Mixer:', Object.keys(masterTrack.DeviceChain[0].Mixer[0]));
        }
      }
    }

    console.log('extractBPM: BPM not found in expected locations');
    return null;
  } catch (error) {
    console.error('extractBPM: Error extracting BPM:', error);
    return null;
  }
}

// Helper function to safely extract Key from parsed ALS data
function extractKey(parsedData) {
  try {
    const liveSet = parsedData.Ableton?.LiveSet?.[0];
    if (!liveSet) return null;

    // Try to find key in MasterTrack name
    const masterTrack = liveSet.MasterTrack?.[0];
    if (masterTrack?.Name?.[0]?.$?.Value) {
      const nameValue = masterTrack.Name[0].$.Value;
      const keyMatch = nameValue.match(/\b([A-G][b#]?m?)\b/);
      if (keyMatch) return keyMatch[0];
    }

    // Try to find key in the LiveSet name or other locations
    if (liveSet.Annotation?.[0]?.$?.Value) {
      const annotation = liveSet.Annotation[0].$.Value;
      const keyMatch = annotation.match(/\b([A-G][b#]?m?)\b/);
      if (keyMatch) return keyMatch[0];
    }

    console.log('Key not found in expected locations');
    return null;
  } catch (error) {
    console.error('Error extracting Key:', error);
    return null;
  }
}

async function discoverAbletonProjects(rootPath) {
  const projects = [];
  const dirents = await fs.promises.readdir(rootPath, { withFileTypes: true });

  for (const dirent of dirents) {
    if (dirent.isDirectory() && dirent.name.endsWith(' Project')) {
      const projectPath = path.join(rootPath, dirent.name);
      const projectName = dirent.name.replace(/ Project$/, '');
      const alsFilePath = path.join(projectPath, `${projectName}.als`);      // Verify if the .als file exists
      try {
        console.log(`Processing ${alsFilePath}...`);
        const stats = await fs.promises.stat(alsFilePath);
        const fileBuffer = await fs.promises.readFile(alsFilePath);
        const decompressedData = zlib.gunzipSync(fileBuffer).toString('utf-8');
        const parsedData = await parseStringPromise(decompressedData);

        const bpm = extractBPM(parsedData);
        const key = extractKey(parsedData);

        console.log(`Extracted BPM: ${bpm}, Key: ${key} for ${projectName}.als`);

        const project = {
          projectName,
          projectPath,
          alsFilePath,
          creationDate: stats.birthtime.toISOString(),
          bpm,
          key,
          status: 'None', // Default status
        };

        projects.push(project);
      } catch (error) {
        console.error(`Failed to read .als file ${alsFilePath}:`, error.message);
        // Still add the project without BPM/Key if file reading fails
        try {
          const stats = await fs.promises.stat(alsFilePath);
          const project = {
            projectName,
            projectPath,
            alsFilePath,
            creationDate: stats.birthtime.toISOString(),
            bpm: null,
            key: null,
            status: 'None', // Default status
          };
          projects.push(project);
        } catch (statError) {
          console.error(`Failed to stat .als file ${alsFilePath}:`, statError.message);
        }
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

  // Load from built files or development server
  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, 'dist', 'index.html'));
  }
}

// Function to update existing projects with BPM and Key data
async function updateExistingProjectsWithMetadata() {
  console.log('Updating existing projects with BPM and Key metadata...');
  const projects = db.prepare('SELECT * FROM projects WHERE bpm IS NULL OR key IS NULL').all();

  for (const project of projects) {
    try {
      console.log(`Updating metadata for ${project.projectName}...`);
      const fileBuffer = await fs.promises.readFile(project.alsFilePath);
      const decompressedData = zlib.gunzipSync(fileBuffer).toString('utf-8');
      const parsedData = await parseStringPromise(decompressedData);

      const bpm = extractBPM(parsedData);
      const key = extractKey(parsedData);

      console.log(`Updated ${project.projectName}: BPM=${bpm}, Key=${key}`);

      db.prepare('UPDATE projects SET bpm = ?, key = ? WHERE id = ?').run(bpm, key, project.id);
    } catch (error) {
      console.error(`Failed to update metadata for ${project.projectName}:`, error.message);
    }
  }
  console.log('Finished updating existing projects.');
}

app.whenReady().then(() => {
  createWindow();

  ipcMain.handle('dialog:openRootDirectory', async () => {
    const rootDirectory = '/Users/lbt/Documents/code_projects/live_sets_test';
    console.log('Attempting to discover projects in:', rootDirectory);

    // First update existing projects with missing metadata
    await updateExistingProjectsWithMetadata();

    const projects = await discoverAbletonProjects(rootDirectory);
    console.log('Discovered projects:', projects);

    // Save discovered projects to database
    const insert = db.prepare(
      'INSERT OR IGNORE INTO projects (projectName, projectPath, alsFilePath, creationDate, bpm, key, status) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    db.transaction(() => {
      for (const project of projects) {
        insert.run(
          project.projectName,
          project.projectPath,
          project.alsFilePath,
          project.creationDate,
          project.bpm,
          project.key,
          project.status
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
    return insert.run(projectId, tagId);
  });

  ipcMain.handle('db:removeProjectTag', (event, projectId, tagId) => {
    const remove = db.prepare('DELETE FROM project_tags WHERE project_id = ? AND tag_id = ?');
    return remove.run(projectId, tagId);
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

  ipcMain.handle('db:updateMetadata', async () => {
    await updateExistingProjectsWithMetadata();
    return { success: true };
  });

  ipcMain.handle('db:updateProjectStatus', (event, projectId, status) => {
    const update = db.prepare('UPDATE projects SET status = ? WHERE id = ?');
    return update.run(status, projectId);
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