import React from 'react';
import { InteractiveTags } from './InteractiveTags';

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
  allTags: Array<{ id: number; name: string }>;
  onSort: (column: string) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onUpdateProjectTags: (projectId: number, newTags: string[]) => Promise<void>;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  allTags,
  onSort,
  sortColumn,
  sortDirection,
  onUpdateProjectTags
}) => {
  const renderSortIcon = (column: string) => {
    if (sortColumn === column) {
      return sortDirection === 'asc' ? ' ▲' : ' ▼';
    }
    return '';
  };

  const handleTagsChange = async (projectId: number, newTags: string[]) => {
    await onUpdateProjectTags(projectId, newTags);
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
                <InteractiveTags
                  tags={project.tags ? project.tags.map(tag => tag.name) : []}
                  allTags={allTags.map(tag => tag.name)}
                  onTagsChange={(newTags) => handleTagsChange(project.id, newTags)}
                  maxTags={10}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
