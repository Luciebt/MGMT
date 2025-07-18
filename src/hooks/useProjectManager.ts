import { useState, useEffect, useMemo, useCallback } from 'react';
import { addTagToState, removeTagFromState } from '../utils/tagUtils';
import {
  fetchProjectsAndTags as fetchProjectsAndTagsService,
  addTag as addTagService,
  deleteTag as deleteTagService,
  addProjectTag as addProjectTagService,
  removeProjectTag as removeProjectTagService,
  getProjectTags as getProjectTagsService,
  updateProjectNotes as updateProjectNotesService,
  updateProjectStatus as updateProjectStatusService,
  openRootDirectory as openRootDirectoryService
} from '../services/projectService';

export function useProjectManager() {
  const [rootDirectory, setRootDirectory] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [filters, setFilters] = useState<{ searchTerm: string; selectedTags: string[]; selectedStatuses: string[] }>({ searchTerm: '', selectedTags: [], selectedStatuses: [] });
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'creationDate', direction: 'desc' });

  const fetchProjectsAndTags = useCallback(async () => {
    const { projects: projectsWithTags, tags: allAvailableTags } = await fetchProjectsAndTagsService();
    setProjects(projectsWithTags);
    setAllTags(allAvailableTags);
  }, []);

  useEffect(() => {
    fetchProjectsAndTags();
  }, [fetchProjectsAndTags]);

  const handleOpenRootDirectory = useCallback(async () => {
    const result = await openRootDirectoryService();
    if (result) {
      setRootDirectory(result.rootDirectory);
      fetchProjectsAndTags();
    }
  }, [fetchProjectsAndTags]);

  const handleAddTag = useCallback(async (tagName: string) => {
    if (tagName.trim() !== '') {
      const tagId = await addTagService(tagName.trim());
      const newTag = { id: tagId, name: tagName.trim() };
      setAllTags((prevTags) => addTagToState(prevTags, newTag));
    }
  }, []);

  const handleDeleteTag = useCallback(async (tagId: number) => {
    try {
      await deleteTagService(tagId);
      setAllTags((prevTags) => removeTagFromState(prevTags, tagId));
      setProjects((prevProjects) =>
        prevProjects.map((project) => ({
          ...project,
          tags: removeTagFromState(project.tags || [], tagId),
        }))
      );
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  }, []);

  const handleAddProjectTag = useCallback(async (projectId: number, tagName: string) => {
    if (tagName.trim() !== '') {
      const tagId = await addTagService(tagName.trim());
      await addProjectTagService(projectId, tagId);
      setProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id === projectId) {
            if (!project.tags.some((tag: any) => tag.id === tagId)) {
              return {
                ...project,
                tags: addTagToState(project.tags, { id: tagId, name: tagName.trim() }),
              };
            }
          }
          return project;
        })
      );
      setAllTags((prevTags) => addTagToState(prevTags, { id: tagId, name: tagName.trim() }));
    }
  }, [allTags]);

  const handleRemoveProjectTag = useCallback(async (projectId: number, tagName: string) => {
    const tag = allTags.find(t => t.name === tagName);
    if (tag) {
      await removeProjectTagService(projectId, tag.id);
      setProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tags: removeTagFromState(project.tags || [], tag.id),
            };
          }
          return project;
        })
      );
    }
  }, [allTags]);

  const handleUpdateProjectTags = useCallback(async (projectId: number, newTags: string[]) => {
    const currentTags = await getProjectTagsService(projectId);
    const currentTagNames = currentTags.map((tag: any) => tag.name);
    const tagsToAdd = newTags.filter(tag => !currentTagNames.includes(tag));
    const tagsToRemove = currentTagNames.filter((tag: string) => !newTags.includes(tag));
    for (const tagName of tagsToAdd) {
      await handleAddProjectTag(projectId, tagName);
    }
    for (const tagName of tagsToRemove) {
      await handleRemoveProjectTag(projectId, tagName);
    }
  }, [handleAddProjectTag, handleRemoveProjectTag]);

  const handleUpdateProjectNotes = useCallback(async (projectId: number, notes: string) => {
    await updateProjectNotesService(projectId, notes);
    fetchProjectsAndTags();
  }, [fetchProjectsAndTags]);

  const handleUpdateProjectStatus = useCallback(async (projectId: number, status: string) => {
    await updateProjectStatusService(projectId, status);
    fetchProjectsAndTags();
  }, [fetchProjectsAndTags]);

  const handleTagFilterChange = useCallback((tagName: string) => {
    setFilters((prev) => {
      const selectedTags = prev.selectedTags.includes(tagName)
        ? prev.selectedTags.filter((tag) => tag !== tagName)
        : [...prev.selectedTags, tagName];
      return { ...prev, selectedTags };
    });
  }, []);

  const handleStatusFilterChange = useCallback((statusName: string) => {
    setFilters((prev) => {
      const selectedStatuses = prev.selectedStatuses.includes(statusName)
        ? prev.selectedStatuses.filter((status) => status !== statusName)
        : [...prev.selectedStatuses, statusName];
      return { ...prev, selectedStatuses };
    });
  }, []);

  const handleSort = useCallback((column: string) => {
    setSort((prevSort) => {
      if (prevSort.column === column) {
        return { ...prevSort, direction: prevSort.direction === 'asc' ? 'desc' : 'asc' };
      } else {
        return { column, direction: 'asc' };
      }
    });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProjectsAndTags();
  }, [fetchProjectsAndTags]);

  const onFilterChange = useCallback((filter: { searchTerm?: string; tagNames?: string[]; statusNames?: string[] }) => {
    setFilters((prev) => ({
      searchTerm: filter.searchTerm !== undefined ? filter.searchTerm : prev.searchTerm,
      selectedTags: filter.tagNames !== undefined ? filter.tagNames : prev.selectedTags,
      selectedStatuses: filter.statusNames !== undefined ? filter.statusNames : prev.selectedStatuses,
    }));
  }, []);

  const filteredProjects = useMemo(() => {
    let filtered = [...projects];
    const hasSearchTerm = filters.searchTerm.trim() !== '';
    const hasTagFilters = filters.selectedTags.length > 0;
    const hasStatusFilters = filters.selectedStatuses.length > 0;
    if (hasSearchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter((project) => {
        const nameMatch = project.projectName?.toLowerCase().includes(searchLower);
        const tagMatch = project.tags?.some((tag: any) => tag.name?.toLowerCase().includes(searchLower));
        return nameMatch || tagMatch;
      });
    }
    if (hasTagFilters) {
      filtered = filtered.filter((project) =>
        filters.selectedTags.every((selectedTag) =>
          project.tags?.some((tag: any) => tag.name === selectedTag)
        )
      );
    }
    if (hasStatusFilters) {
      filtered = filtered.filter((project) =>
        filters.selectedStatuses.includes(project.status || 'None')
      );
    }
    return filtered;
  }, [projects, filters]);

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      if (!sort.column) return 0;
      const aValue = a[sort.column];
      const bValue = b[sort.column];
      if (aValue < bValue) return sort.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredProjects, sort]);

  return {
    rootDirectory,
    projects,
    allTags,
    filters,
    sort,
    handleOpenRootDirectory,
    handleAddTag,
    handleDeleteTag,
    handleAddProjectTag,
    handleRemoveProjectTag,
    handleUpdateProjectTags,
    handleUpdateProjectNotes,
    handleUpdateProjectStatus,
    handleTagFilterChange,
    handleStatusFilterChange,
    handleSort,
    handleRefresh,
    filteredProjects,
    sortedProjects,
    onFilterChange,
    setRootDirectory,
  };
} 