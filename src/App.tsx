import { useState, useEffect, useMemo, useCallback } from 'react';
import './styles/index.css';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFilters } from './components/ProjectFilters';
import { ErrorBoundary } from './components/ErrorBoundary';

declare global {
  interface Window {
    electronAPI: {
      openRootDirectory: () => Promise<{ rootDirectory: string; projects: any[] } | null>;
      getProjects: () => Promise<any[]>;
      addTag: (tagName: string) => Promise<number>;
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
    };
  }
}

function App() {
  const [rootDirectory, setRootDirectory] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any>(null);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>('creationDate');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>('desc');
  const [theme, setTheme] = useState<string>('light');

  const fetchProjectsAndTags = async () => {
    console.log('App.tsx: fetchProjectsAndTags called');
    const storedProjects = await window.electronAPI.getProjects();
    console.log('App.tsx: Stored projects from DB:', storedProjects);

    const projectsWithTags = await Promise.all(
      storedProjects.map(async (project: any) => {
        const projectTags = await window.electronAPI.getProjectTags(project.id);
        return { ...project, tags: projectTags };
      })
    );
    console.log('App.tsx: Projects with tags:', projectsWithTags);
    
    // Get all available tags from the database (not just used ones)
    const allAvailableTags = await window.electronAPI.getTags();
    console.log('App.tsx: All available tags:', allAvailableTags);
    
    setProjects(projectsWithTags);
    setAllTags(allAvailableTags);

    if (projectsWithTags.length > 0 && projectsWithTags[0].alsFilePath) {
      const data = await window.electronAPI.readAls(projectsWithTags[0].alsFilePath);
      setParsedData(data);
    }
  };

  useEffect(() => {
    fetchProjectsAndTags();
    initializeTheme();
  }, []);

  const initializeTheme = async () => {
    try {
      const savedTheme = await window.electronAPI.getThemePreference();
      setTheme(savedTheme);
      applyTheme(savedTheme);
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
  };

  const applyTheme = (themeName: string) => {
    if (themeName === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  };

  const handleThemeToggle = async () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    try {
      await window.electronAPI.setThemePreference(newTheme);
      setTheme(newTheme);
      applyTheme(newTheme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  };

  const handleOpenRootDirectory = async () => {
    const result = await window.electronAPI.openRootDirectory();
    if (result) {
      setRootDirectory(result.rootDirectory);
      fetchProjectsAndTags(); // Re-fetch projects and tags after opening new root directory
    }
  };

  const handleAddTag = async (tagName: string) => {
    if (tagName.trim() !== '') {
      const tagId = await window.electronAPI.addTag(tagName.trim());
      // Only update allTags state
      const newTag = { id: tagId, name: tagName.trim() };
      setAllTags((prevTags) => {
        // Avoid duplicates
        if (prevTags.some((t) => t.id === tagId || t.name === tagName.trim())) return prevTags;
        return [...prevTags, newTag];
      });
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      // @ts-ignore - temporary fix for missing type declaration
      await window.electronAPI.deleteTag(tagId);
      // Remove tag from allTags and from all projects
      setAllTags((prevTags) => prevTags.filter((t) => t.id !== tagId));
      setProjects((prevProjects) =>
        prevProjects.map((project) => ({
          ...project,
          tags: project.tags?.filter((tag: any) => tag.id !== tagId) || [],
        }))
      );
    } catch (error) {
      console.error('Error deleting tag:', error);
      throw error;
    }
  };

  const handleAddProjectTag = async (projectId: number, tagName: string) => {
    if (tagName.trim() !== '') {
      const tagId = await window.electronAPI.addTag(tagName.trim()); // Ensure tag exists and get its ID
      await window.electronAPI.addProjectTag(projectId, tagId);
      // Update the tags for the specific project in state
      setProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id === projectId) {
            // Add tag if not already present
            if (!project.tags.some((tag: any) => tag.id === tagId)) {
              return {
                ...project,
                tags: [...project.tags, { id: tagId, name: tagName.trim() }],
              };
            }
          }
          return project;
        })
      );
      // Also update allTags if needed
      setAllTags((prevTags) => {
        if (prevTags.some((t) => t.id === tagId || t.name === tagName.trim())) return prevTags;
        return [...prevTags, { id: tagId, name: tagName.trim() }];
      });
    }
  };

  const handleRemoveProjectTag = async (projectId: number, tagName: string) => {
    // Find the tag ID by name
    const tag = allTags.find(t => t.name === tagName);
    if (tag) {
      await window.electronAPI.removeProjectTag(projectId, tag.id);
      // Remove tag from the specific project in state
      setProjects((prevProjects) =>
        prevProjects.map((project) => {
          if (project.id === projectId) {
            return {
              ...project,
              tags: project.tags?.filter((t: any) => t.id !== tag.id) || [],
            };
          }
          return project;
        })
      );
    }
  };

  const handleUpdateProjectTags = async (projectId: number, newTags: string[]) => {
    // Get current project tags
    const currentTags = await window.electronAPI.getProjectTags(projectId);
    const currentTagNames = currentTags.map((tag: any) => tag.name);

    // Find tags to add and remove
    const tagsToAdd = newTags.filter(tag => !currentTagNames.includes(tag));
    const tagsToRemove = currentTagNames.filter((tag: string) => !newTags.includes(tag));

    // Add new tags
    for (const tagName of tagsToAdd) {
      await handleAddProjectTag(projectId, tagName);
    }

    // Remove old tags
    for (const tagName of tagsToRemove) {
      await handleRemoveProjectTag(projectId, tagName);
    }

    // Note: fetchProjectsAndTags is called in the individual functions above
  };

  const handleUpdateProjectNotes = async (projectId: number, notes: string) => {
    await window.electronAPI.updateProjectNotes(projectId, notes);
    fetchProjectsAndTags(); // Re-fetch projects to update UI
  };

  const handleUpdateProjectStatus = async (projectId: number, status: string) => {
    await window.electronAPI.updateProjectStatus(projectId, status);
    fetchProjectsAndTags(); // Re-fetch projects to update UI
  };

  const handleFilterProjects = async () => {
    // Get all projects first
    const allProjects = await window.electronAPI.getProjects();
    const projectsWithTags = await Promise.all(
      allProjects.map(async (project: any) => {
        const projectTags = await window.electronAPI.getProjectTags(project.id);
        return { ...project, tags: projectTags };
      })
    );

    // Check if any filters are active
    const hasSearchTerm = searchTerm.trim() !== '';
    const hasTagFilters = selectedTags.length > 0;
    const hasStatusFilters = selectedStatuses.length > 0;
    const hasAnyFilters = hasSearchTerm || hasTagFilters || hasStatusFilters;

    // If no filters are active, show all projects
    if (!hasAnyFilters) {
      console.log('App.tsx: No filters active, showing all projects:', projectsWithTags);
      setProjects(projectsWithTags);
      return;
    }

    // Apply client-side filtering
    let filtered = projectsWithTags;

    // Filter by search term (case-insensitive search in project name and tags)
    if (hasSearchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((project) => {
        // Check project name
        const nameMatch = project.projectName?.toLowerCase().includes(searchLower);
        
        // Check tags
        const tagMatch = project.tags?.some((tag: any) => 
          tag.name?.toLowerCase().includes(searchLower)
        );
        
        return nameMatch || tagMatch;
      });
    }

    // Filter by selected tags
    if (hasTagFilters) {
      filtered = filtered.filter((project) =>
        selectedTags.every((selectedTag) =>
          project.tags?.some((tag: any) => tag.name === selectedTag)
        )
      );
    }

    // Filter by selected statuses
    if (hasStatusFilters) {
      filtered = filtered.filter((project) =>
        selectedStatuses.includes(project.status || 'None')
      );
    }

    console.log('App.tsx: Filtered projects with tags:', filtered);
    setProjects(filtered);
  };

  const handleTagFilterChange = useCallback((tagName: string) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tagName)
        ? prevSelectedTags.filter((tag) => tag !== tagName)
        : [...prevSelectedTags, tagName]
    );
  }, []);

  const handleStatusFilterChange = useCallback((statusName: string) => {
    setSelectedStatuses((prevSelectedStatuses) =>
      prevSelectedStatuses.includes(statusName)
        ? prevSelectedStatuses.filter((status) => status !== statusName)
        : [...prevSelectedStatuses, statusName]
    );
  }, []);

  const handleSort = useCallback((column: string) => {
    setSortColumn((prevSortColumn) => {
      if (prevSortColumn === column) {
        setSortDirection((prevSortDirection) => (prevSortDirection === 'asc' ? 'desc' : 'asc'));
        return prevSortColumn;
      } else {
        setSortDirection('asc');
        return column;
      }
    });
  }, []);

  const handleRefresh = useCallback(() => {
    fetchProjectsAndTags();
  }, []);

  const memoizedHandleAddTag = useCallback(handleAddTag, [allTags]);
  const memoizedHandleDeleteTag = useCallback(handleDeleteTag, [allTags, projects]);
  const memoizedHandleAddProjectTag = useCallback(handleAddProjectTag, [projects, allTags]);
  const memoizedHandleRemoveProjectTag = useCallback(handleRemoveProjectTag, [projects, allTags]);
  const memoizedHandleUpdateProjectTags = useCallback(handleUpdateProjectTags, [projects, allTags]);
  const memoizedHandleUpdateProjectNotes = useCallback(handleUpdateProjectNotes, [projects]);
  const memoizedHandleUpdateProjectStatus = useCallback(handleUpdateProjectStatus, [projects]);

  const onFilterChange = useCallback((filter: { projectName?: string; tagNames?: string[]; statusNames?: string[] }) => {
    const { projectName, tagNames, statusNames } = filter;
    if (projectName !== undefined) setSearchTerm(projectName || '');
    if (tagNames !== undefined) setSelectedTags(tagNames);
    if (statusNames !== undefined) setSelectedStatuses(statusNames);
  }, []);

  // Memoize sortedProjects to avoid unnecessary recalculations
  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      if (!sortColumn) return 0;
      const aValue = a[sortColumn];
      const bValue = b[sortColumn];
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [projects, sortColumn, sortDirection]);

  useEffect(() => {
    handleFilterProjects();
  }, [searchTerm, selectedTags, selectedStatuses]); // Re-filter when search term, selected tags, or selected statuses change

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">MGMT</h1>
        <div className="header-actions">
          <button 
            className="btn btn-outline" 
            onClick={handleThemeToggle}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? '🌙' : '☀️'}
          </button>
          <button className="btn btn-outline" onClick={handleRefresh}>Refresh</button>
          <button className="btn btn-secondary" onClick={handleOpenRootDirectory}>
            Select Root Directory
          </button>
        </div>
      </div>

      {rootDirectory && (
        <div className="mb-4">
          <h2>Selected Root Directory:</h2>
          <p className="text-muted">{rootDirectory}</p>
        </div>
      )}

      <ProjectFilters
        filter={{ projectName: searchTerm, tagNames: selectedTags, statusNames: selectedStatuses }}
        onFilterChange={onFilterChange}
        tags={allTags}
        selectedTags={selectedTags}
        onTagSelectionChange={handleTagFilterChange}
        onAddTag={memoizedHandleAddTag}
        onDeleteTag={memoizedHandleDeleteTag}
        selectedStatuses={selectedStatuses}
        onStatusSelectionChange={handleStatusFilterChange}
      />

      {projects.length > 0 && (
        <ErrorBoundary>
          <div className="mb-4">
            <h3>Discovered Ableton Projects:</h3>
            <ProjectTable
              projects={sortedProjects}
              allTags={allTags}
              onSort={handleSort}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onUpdateProjectTags={memoizedHandleUpdateProjectTags}
              onUpdateProjectNotes={memoizedHandleUpdateProjectNotes}
              onUpdateProjectStatus={memoizedHandleUpdateProjectStatus}
            />
          </div>
        </ErrorBoundary>
      )}

      {parsedData && (
        <div className="mb-4">
          <h3>Parsed Data from first discovered ALS file:</h3>
          <pre style={{ 
            whiteSpace: 'pre-wrap', 
            wordBreak: 'break-all',
            backgroundColor: 'var(--bg-secondary)',
            padding: 'var(--spacing-md)',
            borderRadius: 'var(--border-radius)',
            fontSize: 'var(--font-size-sm)',
            maxHeight: '400px',
            overflow: 'auto'
          }}>
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;