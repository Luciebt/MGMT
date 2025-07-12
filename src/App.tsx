import { useState, useEffect } from 'react';
import './App.css';
import './styles/modern.css';
import { ProjectTable } from './components/ProjectTable';
import { ErrorBoundary } from './components/ErrorBoundary';

declare global {
  interface Window {
    electronAPI: {
      openRootDirectory: () => Promise<{ rootDirectory: string; projects: any[] } | null>;
      getProjects: () => Promise<any[]>;
      addTag: (tagName: string) => Promise<number>;
      addProjectTag: (projectId: number, tagId: number) => Promise<void>;
      getTags: () => Promise<any[]>;
      getProjectTags: (projectId: number) => Promise<any[]>;
      filterProjects: (filters: { projectName?: string; tagNames?: string[] }) => Promise<any[]>;
      readAls: (filePath: string) => Promise<any | null>;
      updateMetadata: () => Promise<{ success: boolean }>;
    };
  }
}

function App() {
  const [rootDirectory, setRootDirectory] = useState<string | null>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [parsedData, setParsedData] = useState<any>(null);
  const [newTag, setNewTag] = useState<string>('');
  const [allTags, setAllTags] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const fetchProjectsAndTags = async () => {
    console.log('App.tsx: fetchProjectsAndTags called');
    const storedProjects = await window.electronAPI.getProjects();
    console.log('App.tsx: Stored projects from DB:', storedProjects);
    const tags = await window.electronAPI.getTags();

    const projectsWithTags = await Promise.all(
      storedProjects.map(async (project: any) => {
        const projectTags = await window.electronAPI.getProjectTags(project.id);
        return { ...project, tags: projectTags };
      })
    );
    console.log('App.tsx: Projects with tags:', projectsWithTags);
    setProjects(projectsWithTags);
    setAllTags(tags);

    if (projectsWithTags.length > 0 && projectsWithTags[0].alsFilePath) {
      const data = await window.electronAPI.readAls(projectsWithTags[0].alsFilePath);
      setParsedData(data);
    }
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

  const handleAddTag = async () => {
    if (newTag.trim() !== '') {
      await window.electronAPI.addTag(newTag.trim());
      setNewTag('');
      fetchProjectsAndTags(); // Re-fetch all tags
    }
  };

  const handleAddProjectTag = async (projectId: number, tagName: string) => {
    if (tagName.trim() !== '') {
      const tagId = await window.electronAPI.addTag(tagName.trim()); // Ensure tag exists and get its ID
      await window.electronAPI.addProjectTag(projectId, tagId);
      fetchProjectsAndTags(); // Re-fetch projects and tags to update UI
    }
  };

  const handleFilterProjects = async () => {
    const filtered = await window.electronAPI.filterProjects({
      projectName: searchTerm,
      tagNames: selectedTags.length > 0 ? selectedTags : undefined,
    });

    const filteredProjectsWithTags = await Promise.all(
      filtered.map(async (project: any) => {
        const projectTags = await window.electronAPI.getProjectTags(project.id);
        return { ...project, tags: projectTags };
      })
    );
    console.log('App.tsx: Filtered projects with tags:', filteredProjectsWithTags);
    setProjects(filteredProjectsWithTags);
  };

  const handleTagFilterChange = (tagName: string) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tagName)
        ? prevSelectedTags.filter((tag) => tag !== tagName)
        : [...prevSelectedTags, tagName]
    );
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleRefresh = () => {
    fetchProjectsAndTags();
  };

  const sortedProjects = [...projects].sort((a, b) => {
    if (!sortColumn) return 0;

    const aValue = a[sortColumn];
    const bValue = b[sortColumn];

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  useEffect(() => {
    handleFilterProjects();
  }, [searchTerm, selectedTags]); // Re-filter when search term or selected tags change

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">Ableton Live Project Manager</h1>
        <div className="header-actions">
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

      <div className="mb-4">
        <h2>Manage Tags:</h2>
        <div className="d-flex align-items-center gap-2 mb-3">
          <input
            type="text"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            placeholder="Add new tag"
            className="form-input"
            style={{ maxWidth: '300px' }}
          />
          <button className="btn btn-success" onClick={handleAddTag}>Add Tag</button>
        </div>
        {allTags.length > 0 && (
          <div className="mb-3">
            <h3>All Available Tags:</h3>
            <div className="tag-checkboxes">
              {allTags.map((tag) => (
                <label key={tag.id} className="tag-checkbox">
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.name)}
                    onChange={() => handleTagFilterChange(tag.name)}
                  />
                  <span className="tag-name">{tag.name}</span>
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mb-4">
        <h2>Filter Projects:</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by project name"
          className="form-input search-input"
        />
      </div>

      {projects.length > 0 && (
        <ErrorBoundary>
          <div className="mb-4">
            <h3>Discovered Ableton Projects:</h3>
            <ProjectTable
              projects={sortedProjects}
              onSort={handleSort}
              sortColumn={sortColumn}
              sortDirection={sortDirection}
              onAddProjectTag={handleAddProjectTag}
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