import React, { useState, useEffect, useMemo, useCallback, createContext, useContext } from 'react';
import './styles/index.css';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFilters } from './components/ProjectFilters';
import { ErrorBoundary } from './components/ErrorBoundary';
import { addTagToState, removeTagFromState } from './utils/tagUtils';

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

// Theme context and provider
const ThemeContext = createContext<{
  theme: string;
  toggleTheme: () => void;
} | undefined>(undefined);

const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<string>('light');

  useEffect(() => {
    // Load theme preference from electronAPI
    (async () => {
      try {
        const savedTheme = await window.electronAPI.getThemePreference();
        setTheme(savedTheme);
      } catch (error) {
        // fallback to light
        setTheme('light');
      }
    })();
  }, []);

  useEffect(() => {
    // Apply theme to body
    if (theme === 'dark') {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
    // Save theme preference
    window.electronAPI.setThemePreference(theme);
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within a ThemeProvider');
  return context;
}

function App() {
  const [rootDirectory, setRootDirectory] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  // Group filter and sort state into objects with explicit types
  const [filters, setFilters] = useState<{ searchTerm: string; selectedTags: string[]; selectedStatuses: string[] }>({ searchTerm: '', selectedTags: [], selectedStatuses: [] });
  const [sort, setSort] = useState<{ column: string; direction: 'asc' | 'desc' }>({ column: 'creationDate', direction: 'desc' });
  const { theme, toggleTheme } = useTheme();

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
  };

  useEffect(() => {
    fetchProjectsAndTags();
  }, []);

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
      const newTag = { id: tagId, name: tagName.trim() };
      setAllTags((prevTags) => addTagToState(prevTags, newTag));
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    try {
      // @ts-ignore - temporary fix for missing type declaration
      await window.electronAPI.deleteTag(tagId);
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
  };

  const handleAddProjectTag = async (projectId: number, tagName: string) => {
    if (tagName.trim() !== '') {
      const tagId = await window.electronAPI.addTag(tagName.trim()); // Ensure tag exists and get its ID
      await window.electronAPI.addProjectTag(projectId, tagId);
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
  };

  const handleRemoveProjectTag = async (projectId: number, tagName: string) => {
    const tag = allTags.find(t => t.name === tagName);
    if (tag) {
      await window.electronAPI.removeProjectTag(projectId, tag.id);
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

  // Update handlers to use filters and sort state
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
  }, []);

  const memoizedHandleAddTag = useCallback(handleAddTag, [allTags]);
  const memoizedHandleDeleteTag = useCallback(handleDeleteTag, [allTags, projects]);
  const memoizedHandleUpdateProjectTags = useCallback(handleUpdateProjectTags, [projects, allTags]);
  const memoizedHandleUpdateProjectNotes = useCallback(handleUpdateProjectNotes, [projects]);
  const memoizedHandleUpdateProjectStatus = useCallback(handleUpdateProjectStatus, [projects]);

  const onFilterChange = useCallback((filter: { searchTerm?: string; tagNames?: string[]; statusNames?: string[] }) => {
    setFilters((prev) => ({
      searchTerm: filter.searchTerm !== undefined ? filter.searchTerm : prev.searchTerm,
      selectedTags: filter.tagNames !== undefined ? filter.tagNames : prev.selectedTags,
      selectedStatuses: filter.statusNames !== undefined ? filter.statusNames : prev.selectedStatuses,
    }));
  }, []);

  // Update filteredProjects and sortedProjects to use filters and sort
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

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">MGMT</h1>
        <div className="header-actions">
          <button 
            className="btn btn-outline" 
            onClick={toggleTheme}
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
        filter={{ projectName: filters.searchTerm, tagNames: filters.selectedTags, statusNames: filters.selectedStatuses }}
        onFilterChange={onFilterChange}
        tags={allTags}
        selectedTags={filters.selectedTags}
        onTagSelectionChange={handleTagFilterChange}
        onAddTag={memoizedHandleAddTag}
        onDeleteTag={memoizedHandleDeleteTag}
        selectedStatuses={filters.selectedStatuses}
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
              sortColumn={sort.column}
              sortDirection={sort.direction}
              onUpdateProjectTags={memoizedHandleUpdateProjectTags}
              onUpdateProjectNotes={memoizedHandleUpdateProjectNotes}
              onUpdateProjectStatus={memoizedHandleUpdateProjectStatus}
            />
          </div>
        </ErrorBoundary>
      )}
    </div>
  );
}

// Wrap App in ThemeProvider
export default function AppWithThemeProvider() {
  return (
    <ThemeProvider>
      <App />
    </ThemeProvider>
  );
}