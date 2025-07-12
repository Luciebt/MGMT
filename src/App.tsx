import { useState, useEffect } from 'react';
import './App.css';

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

  const handleUpdateMetadata = async () => {
    console.log('Updating metadata...');
    const result = await window.electronAPI.updateMetadata();
    if (result.success) {
      console.log('Metadata update completed');
      fetchProjectsAndTags(); // Refresh projects after update
    }
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
    <div style={{ padding: '20px' }}>
      <h1>Ableton Live Project Manager</h1>
      <button onClick={handleRefresh}>Refresh</button>
      <button onClick={handleUpdateMetadata} style={{ marginLeft: '10px' }}>Update BPM/Key Metadata</button>
      <button onClick={handleOpenRootDirectory} style={{ marginLeft: '10px' }}>
        Select Root Directory of Ableton Projects
      </button>

      {rootDirectory && (
        <div style={{ marginTop: '20px' }}>
          <h2>Selected Root Directory:</h2>
          <p>{rootDirectory}</p>
        </div>
      )}

      <div style={{ marginTop: '20px' }}>
        <h2>Manage Tags:</h2>
        <input
          type="text"
          value={newTag}
          onChange={(e) => setNewTag(e.target.value)}
          placeholder="Add new tag"
        />
        <button onClick={handleAddTag}>Add Tag</button>
        {allTags.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <h3>All Available Tags:</h3>
            <div>
              {allTags.map((tag) => (
                <label key={tag.id} style={{ marginRight: '10px' }}>
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.name)}
                    onChange={() => handleTagFilterChange(tag.name)}
                  />
                  {tag.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ marginTop: '20px' }}>
        <h2>Filter Projects:</h2>
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by project name"
        />
      </div>

      {projects.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3>Discovered Ableton Projects:</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th onClick={() => handleSort('projectName')} style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}>Project Name {sortColumn === 'projectName' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                <th onClick={() => handleSort('creationDate')} style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}>Creation Date {sortColumn === 'creationDate' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                <th onClick={() => handleSort('bpm')} style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}>BPM {sortColumn === 'bpm' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                <th onClick={() => handleSort('key')} style={{ border: '1px solid #ccc', padding: '8px', cursor: 'pointer' }}>Key {sortColumn === 'key' && (sortDirection === 'asc' ? '▲' : '▼')}</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Tags</th>
                <th style={{ border: '1px solid #ccc', padding: '8px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project, index) => (
                <tr key={index}>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{project.projectName}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {project.creationDate ? new Date(project.creationDate).toLocaleDateString() : 'N/A'}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{project.bpm}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>{project.key}</td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    {(project.tags && project.tags.length > 0) ? (
                      project.tags.map((tag: any) => tag.name).join(', ')
                    ) : (
                      '-'
                    )}
                  </td>
                  <td style={{ border: '1px solid #ccc', padding: '8px' }}>
                    <input
                      type="text"
                      placeholder="Add tag"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const inputElement = e.target as HTMLInputElement;
                          await handleAddProjectTag(project.id, inputElement.value);
                          inputElement.value = '';
                        }
                      }}
                    />
                    <button onClick={async (e) => {
                      const inputElement = (e.target as HTMLButtonElement).previousSibling as HTMLInputElement;
                      await handleAddProjectTag(project.id, inputElement.value);
                      inputElement.value = '';
                    }}>Add</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {parsedData && (
        <div style={{ marginTop: '20px' }}>
          <h3>Parsed Data from first discovered ALS file:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
            {JSON.stringify(parsedData, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default App;