const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld(
  'electronAPI',
  {
    openRootDirectory: () => ipcRenderer.invoke('dialog:openRootDirectory'),
    getProjects: () => ipcRenderer.invoke('db:getProjects'),
    addTag: (tagName) => ipcRenderer.invoke('db:addTag', tagName),
    addProjectTag: (projectId, tagId) => ipcRenderer.invoke('db:addProjectTag', projectId, tagId),
    getTags: () => ipcRenderer.invoke('db:getTags'),
    getProjectTags: (projectId) => ipcRenderer.invoke('db:getProjectTags', projectId),
    filterProjects: (filters) => ipcRenderer.invoke('db:filterProjects', filters),
    readAls: (filePath) => ipcRenderer.invoke('file:readAls', filePath),
    updateMetadata: () => ipcRenderer.invoke('db:updateMetadata')
  }
);