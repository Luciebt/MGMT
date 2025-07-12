import { useState, useEffect } from 'react';
import './App.css';
import './styles/modern.css';
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
      updateProjectStatus: (projectId: number, status: string) => Promise<void>;
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

  const handleAddTag = async (tagName: string) => {
    if (tagName.trim() !== '') {
      await window.electronAPI.addTag(tagName.trim());
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

  const handleRemoveProjectTag = async (projectId: number, tagName: string) => {
    // Find the tag ID by name
    const tag = allTags.find(t => t.name === tagName);
    if (tag) {
      await window.electronAPI.removeProjectTag(projectId, tag.id);
      fetchProjectsAndTags(); // Re-fetch projects and tags to update UI
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

    // Apply client-side filtering
    let filtered = projectsWithTags;

    // Filter by search term (case-insensitive search in project name and tags)
    if (searchTerm.trim()) {
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
    if (selectedTags.length > 0) {
      filtered = filtered.filter((project) =>
        selectedTags.every((selectedTag) =>
          project.tags?.some((tag: any) => tag.name === selectedTag)
        )
      );
    }

    // Filter by selected statuses
    if (selectedStatuses.length > 0) {
      filtered = filtered.filter((project) =>
        selectedStatuses.includes(project.status || 'None')
      );
    }

    console.log('App.tsx: Filtered projects with tags:', filtered);
    setProjects(filtered);
  };

  const handleTagFilterChange = (tagName: string) => {
    setSelectedTags((prevSelectedTags) =>
      prevSelectedTags.includes(tagName)
        ? prevSelectedTags.filter((tag) => tag !== tagName)
        : [...prevSelectedTags, tagName]
    );
  };

  const handleStatusFilterChange = (statusName: string) => {
    setSelectedStatuses((prevSelectedStatuses) =>
      prevSelectedStatuses.includes(statusName)
        ? prevSelectedStatuses.filter((status) => status !== statusName)
        : [...prevSelectedStatuses, statusName]
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
  }, [searchTerm, selectedTags, selectedStatuses]); // Re-filter when search term, selected tags, or selected statuses change

  return (
    <div className="app-container">
      <div className="app-header">
        <h1 className="app-title">MGMT</h1>
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

      <ProjectFilters
        filter={{ projectName: searchTerm, tagNames: selectedTags, statusNames: selectedStatuses }}
        onFilterChange={({ projectName, tagNames, statusNames }) => {
          if (projectName !== undefined) setSearchTerm(projectName || '');
          if (tagNames !== undefined) setSelectedTags(tagNames);
          if (statusNames !== undefined) setSelectedStatuses(statusNames);
        }}
        tags={allTags}
        selectedTags={selectedTags}
        onTagSelectionChange={handleTagFilterChange}
        onAddTag={handleAddTag}
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
              onUpdateProjectTags={handleUpdateProjectTags}
              onUpdateProjectStatus={handleUpdateProjectStatus}
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