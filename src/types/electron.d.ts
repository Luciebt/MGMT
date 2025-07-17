export interface ElectronAPI {
  openRootDirectory: () => Promise<{ rootDirectory: string; projects: any[]; } | null>;
  getProjects: () => Promise<any[]>;
  addTag: (tagName: string) => Promise<number>;
  deleteTag: (tagId: number) => Promise<any>;
  addProjectTag: (projectId: number, tagId: number) => Promise<void>;
  removeProjectTag: (projectId: number, tagId: number) => Promise<void>;
  getTags: () => Promise<any[]>;
  getProjectTags: (projectId: number) => Promise<any[]>;
  filterProjects: (filters: any) => Promise<any[]>;
  readAls: (filePath: string) => Promise<any>;
  updateMetadata: () => Promise<void>;
  updateProjectNotes: (projectId: number, notes: string) => Promise<void>;
  updateProjectStatus: (projectId: number, status: string) => Promise<void>;
  getThemePreference: () => Promise<string>;
  setThemePreference: (theme: string) => Promise<void>;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
