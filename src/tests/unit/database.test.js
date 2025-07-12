import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from '../../../src/main/database/Database.js';
import fs from 'fs';
import path from 'path';

// Mock electron app
vi.mock('electron', () => ({
    app: {
        getPath: vi.fn(() => '/tmp/test')
    }
}));

describe('Database', () => {
    let database;
    let testDbPath;

    beforeEach(() => {
        testDbPath = path.join('/tmp', `test-${Date.now()}.db`);
        database = new Database(testDbPath);
    });

    afterEach(() => {
        if (database.db) {
            database.db.close();
        }
        try {
            fs.unlinkSync(testDbPath);
        } catch (e) {
            // File might not exist
        }
    });

    describe('initialization', () => {
        it('should create database file and tables', async () => {
            await database.initialize();
            expect(fs.existsSync(testDbPath)).toBe(true);

            // Test that tables exist by querying them
            const tables = database.db.prepare(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name IN ('projects', 'tags', 'project_tags')
      `).all();

            expect(tables).toHaveLength(3);
        });
    });

    describe('project operations', () => {
        beforeEach(async () => {
            await database.initialize();
        });

        it('should add and retrieve projects', () => {
            const project = {
                projectName: 'Test Project',
                projectPath: '/path/to/project',
                alsFilePath: '/path/to/file.als',
                creationDate: '2023-01-01T00:00:00.000Z',
                bpm: 120,
                key: 'C major'
            };

            const id = database.addProject(project);
            expect(id).toBeGreaterThan(0);

            const projects = database.getProjects();
            expect(projects).toHaveLength(1);
            expect(projects[0]).toMatchObject(project);
        });

        it('should update project metadata', () => {
            const project = {
                projectName: 'Test Project',
                projectPath: '/path/to/project',
                alsFilePath: '/path/to/file.als',
                creationDate: '2023-01-01T00:00:00.000Z',
                bpm: null,
                key: null
            };

            const id = database.addProject(project);

            database.updateProject(id, { bpm: 140, key: 'A minor' });

            const updatedProject = database.getProjects().find(p => p.id === id);
            expect(updatedProject.bpm).toBe(140);
            expect(updatedProject.key).toBe('A minor');
        });
    });

    describe('tag operations', () => {
        beforeEach(async () => {
            await database.initialize();
        });

        it('should add and retrieve tags', () => {
            const tagId = database.addTag('Electronic');
            expect(tagId).toBeGreaterThan(0);

            const tags = database.getTags();
            expect(tags).toHaveLength(1);
            expect(tags[0].name).toBe('Electronic');
        });

        it('should handle duplicate tag names', () => {
            const id1 = database.addTag('Electronic');
            const id2 = database.addTag('Electronic');

            expect(id1).toBe(id2);

            const tags = database.getTags();
            expect(tags).toHaveLength(1);
        });
    });

    describe('filtering', () => {
        beforeEach(async () => {
            await database.initialize();

            // Add test data
            const projects = [
                {
                    projectName: 'House Track',
                    projectPath: '/house',
                    alsFilePath: '/house.als',
                    creationDate: '2023-01-01T00:00:00.000Z',
                    bpm: 128,
                    key: 'Am'
                },
                {
                    projectName: 'Techno Banger',
                    projectPath: '/techno',
                    alsFilePath: '/techno.als',
                    creationDate: '2023-01-02T00:00:00.000Z',
                    bpm: 140,
                    key: 'Cm'
                }
            ];

            projects.forEach(project => database.addProject(project));
        });

        it('should filter by project name', () => {
            const filtered = database.filterProjects({ projectName: 'House' });
            expect(filtered).toHaveLength(1);
            expect(filtered[0].projectName).toBe('House Track');
        });
    });
});
