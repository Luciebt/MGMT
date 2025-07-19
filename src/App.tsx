import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import './styles/index.css';
import { ProjectTable } from './components/ProjectTable';
import { ProjectFilters } from './components/ProjectFilters';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useProjectManager } from './hooks/useProjectManager';
import { ProjectProfile } from './components/ProjectProfile';

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
  const { theme, toggleTheme } = useTheme();
  const {
    rootDirectory,
    projects,
    allTags,
    filters,
    sort,
    handleOpenRootDirectory,
    handleAddTag,
    handleDeleteTag,
    handleUpdateProjectTags,
    handleUpdateProjectNotes,
    handleUpdateProjectStatus,
    handleTagFilterChange,
    handleStatusFilterChange,
    handleSort,
    handleRefresh,
    sortedProjects,
    onFilterChange,
  } = useProjectManager();

  const [selectedProject, setSelectedProject] = useState<any | null>(null);

  const handleProjectClick = (project: any) => {
    setSelectedProject(project);
  };

  const handleBackToTable = () => {
    setSelectedProject(null);
  };

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

      {selectedProject ? (
        <ProjectProfile project={selectedProject} onBack={handleBackToTable} />
      ) : (
        <>
          <ProjectFilters
            filter={{ projectName: filters.searchTerm, tagNames: filters.selectedTags, statusNames: filters.selectedStatuses }}
            onFilterChange={onFilterChange}
            tags={allTags}
            selectedTags={filters.selectedTags}
            onTagSelectionChange={handleTagFilterChange}
            onAddTag={handleAddTag}
            onDeleteTag={handleDeleteTag}
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
                  onUpdateProjectTags={handleUpdateProjectTags}
                  onUpdateProjectNotes={handleUpdateProjectNotes}
                  onUpdateProjectStatus={handleUpdateProjectStatus}
                  onProjectClick={handleProjectClick}
                />
              </div>
            </ErrorBoundary>
          )}
        </>
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