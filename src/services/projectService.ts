// Project and tag service for Electron API

export async function fetchProjectsAndTags() {
  const storedProjects = await window.electronAPI.getProjects();
  const projectsWithTags = await Promise.all(
    storedProjects.map(async (project: any) => {
      const projectTags = await window.electronAPI.getProjectTags(project.id);
      return { ...project, tags: projectTags };
    })
  );
  const allAvailableTags = await window.electronAPI.getTags();
  return { projects: projectsWithTags, tags: allAvailableTags };
}

export async function addTag(tagName: string) {
  return window.electronAPI.addTag(tagName);
}

export async function deleteTag(tagId: number) {
  // @ts-ignore - temporary fix for missing type declaration
  return window.electronAPI.deleteTag(tagId);
}

export async function addProjectTag(projectId: number, tagId: number) {
  return window.electronAPI.addProjectTag(projectId, tagId);
}

export async function removeProjectTag(projectId: number, tagId: number) {
  return window.electronAPI.removeProjectTag(projectId, tagId);
}

export async function getTags() {
  return window.electronAPI.getTags();
}

export async function getProjects() {
  return window.electronAPI.getProjects();
}

export async function getProjectTags(projectId: number) {
  return window.electronAPI.getProjectTags(projectId);
}

export async function updateProjectNotes(projectId: number, notes: string) {
  return window.electronAPI.updateProjectNotes(projectId, notes);
}

export async function updateProjectStatus(projectId: number, status: string) {
  return window.electronAPI.updateProjectStatus(projectId, status);
}

export async function openRootDirectory() {
  return window.electronAPI.openRootDirectory();
} 