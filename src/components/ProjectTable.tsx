import React from 'react';

interface Project {
  id: number;
  projectName: string;
  projectPath: string;
  alsFilePath: string;
  creationDate: string;
  bpm: number | null;
  key: string | null;
  tags?: Array<{ id: number; name: string }>;
}

interface ProjectTableProps {
  projects: Project[];
  onSort: (column: string) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onAddProjectTag: (projectId: number, tagName: string) => Promise<void>;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  onSort,
  sortColumn,
  sortDirection,
  onAddProjectTag
}) => {
  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleAddTag = async (projectId: number, inputElement: HTMLInputElement) => {
    const tagName = inputElement.value.trim();
    if (tagName) {
      await onAddProjectTag(projectId, tagName);
      inputElement.value = '';
    }
  };

  return (
    <div className="project-table-container">
      <table className="project-table">
        <thead>
          <tr>
            <th onClick={() => onSort('projectName')} className="sortable">
              Project Name{renderSortIcon('projectName')}
            </th>
            <th onClick={() => onSort('creationDate')} className="sortable">
              Creation Date{renderSortIcon('creationDate')}
            </th>
            <th onClick={() => onSort('bpm')} className="sortable">
              BPM{renderSortIcon('bpm')}
            </th>
            <th onClick={() => onSort('key')} className="sortable">
              Key{renderSortIcon('key')}
            </th>
            <th>Tags</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td className="project-name" title={project.projectPath}>
                {project.projectName}
              </td>
              <td className="creation-date-cell">
                {project.creationDate ? (
                  <span title={new Date(project.creationDate).toLocaleString()}>
                    {new Date(project.creationDate).toLocaleDateString()} {new Date(project.creationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : 'N/A'}
              </td>
              <td className="bpm-cell">
                {project.bpm ? Math.round(project.bpm) : '-'}
              </td>
              <td className="key-cell">
                {project.key || '-'}
              </td>
              <td className="tags-cell">
                {project.tags && project.tags.length > 0 
                  ? project.tags.map(tag => tag.name).join(', ')
                  : '-'
                }
              </td>
              <td className="actions-cell">
                <div className="tag-input-group">
                  <input
                    type="text"
                    placeholder="Add tag"
                    className="tag-input"
                    maxLength={50}
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        await handleAddTag(project.id, e.target as HTMLInputElement);
                      }
                    }}
                  />
                  <button
                    className="add-tag-btn"
                    type="button"
                    aria-label={`Add tag to ${project.projectName}`}
                    onClick={async (e) => {
                      e.preventDefault();
                      const input = (e.target as HTMLButtonElement)
                        .previousSibling as HTMLInputElement;
                      await handleAddTag(project.id, input);
                    }}
                  >
                    Add
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
