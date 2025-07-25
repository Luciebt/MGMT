const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    openRootDirectory: () => ipcRenderer.invoke('dialog:openRootDirectory'),
    getProjects: () => ipcRenderer.invoke('db:getProjects'),
    addTag: (tagName) => ipcRenderer.invoke('db:addTag', tagName),
    deleteTag: (tagId) => ipcRenderer.invoke('db:deleteTag', tagId),
    addProjectTag: (projectId, tagId) => ipcRenderer.invoke('db:addProjectTag', projectId, tagId),
    removeProjectTag: (projectId, tagId) => ipcRenderer.invoke('db:removeProjectTag', projectId, tagId),
    getTags: () => ipcRenderer.invoke('db:getTags'),
    getProjectTags: (projectId) => ipcRenderer.invoke('db:getProjectTags', projectId),
    filterProjects: (filters) => ipcRenderer.invoke('db:filterProjects', filters),
    readAls: (filePath) => ipcRenderer.invoke('file:readAls', filePath),
    updateMetadata: () => ipcRenderer.invoke('db:updateMetadata'),
    updateProjectNotes: (projectId, notes) => ipcRenderer.invoke('db:updateProjectNotes', projectId, notes),
    updateProjectStatus: (projectId, status) => ipcRenderer.invoke('db:updateProjectStatus', projectId, status),
    getThemePreference: () => ipcRenderer.invoke('config:getThemePreference'),
    setThemePreference: (theme) => ipcRenderer.invoke('config:setThemePreference', theme)
  }
);