import React, { useState, useRef } from 'react';
import { InteractiveTags } from './InteractiveTags';
import { StatusDropdown } from './StatusDropdown';
import { EditableNote } from './EditableNote';

interface Project {
  id: number;
  projectName: string;
  projectPath: string;
  alsFilePath: string;
  creationDate: string;
  status?: string;
  tags?: Array<{ id: number; name: string }>;
  notes?: string;
}

interface ProjectTableProps {
  projects: Project[];
  allTags: Array<{ id: number; name: string }>;
  onSort: (column: string) => void;
  sortColumn: string | null;
  sortDirection: 'asc' | 'desc' | null;
  onUpdateProjectTags: (projectId: number, newTags: string[]) => Promise<void>;
  onUpdateProjectStatus: (projectId: number, status: string) => Promise<void>;
  onUpdateProjectNotes: (projectId: number, notes: string) => Promise<void>;
}

export const ProjectTable: React.FC<ProjectTableProps> = ({
  projects,
  allTags,
  onSort,
  sortColumn,
  sortDirection,
  onUpdateProjectTags,
  onUpdateProjectStatus,
  onUpdateProjectNotes
}) => {
  const columns = [
    { key: 'projectName', label: 'Project Name' },
    { key: 'creationDate', label: 'Creation Date' },
    { key: 'status', label: 'Status' },
    { key: 'tags', label: 'Tags' },
    { key: 'notes', label: 'Notes' },
  ];

  // Default widths in px
  const defaultWidths: { [key: string]: number } = {
    projectName: 200,
    creationDate: 140,
    status: 120,
    tags: 200,
    notes: 300,
  };
  const minWidths: { [key: string]: number } = {
    projectName: 120,
    creationDate: 100,
    status: 80,
    tags: 120,
    notes: 150,
  };
  const [columnWidths, setColumnWidths] = useState<{ [key: string]: number }>(defaultWidths);
  const resizingCol = useRef<string | null>(null);
  const startX = useRef<number>(0);
  const startWidth = useRef<number>(0);

  const handleMouseDown = (e: React.MouseEvent, colKey: string) => {
    resizingCol.current = colKey;
    startX.current = e.clientX;
    startWidth.current = columnWidths[colKey];
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!resizingCol.current) return;
    const delta = e.clientX - startX.current;
    setColumnWidths((widths) => {
      const newWidth = Math.max(minWidths[resizingCol.current!], startWidth.current + delta);
      return { ...widths, [resizingCol.current!]: newWidth };
    });
  };

  const handleMouseUp = () => {
    resizingCol.current = null;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  };

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
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={{ width: columnWidths[col.key] }} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col, idx) => (
              <th
                key={col.key}
                className={col.key === 'projectName' || col.key === 'creationDate' || col.key === 'status' ? 'sortable' : ''}
                onClick={col.key === 'projectName' || col.key === 'creationDate' || col.key === 'status' ? () => onSort(col.key) : undefined}
                style={{ width: columnWidths[col.key], minWidth: minWidths[col.key], position: 'relative' }}
              >
                {col.label}
                {(col.key === 'projectName' || col.key === 'creationDate' || col.key === 'status') && renderSortIcon(col.key)}
                {/* Resizer handle, not for last column */}
                {idx < columns.length - 1 && (
                  <span
                    style={{
                      position: 'absolute',
                      right: 0,
                      top: 0,
                      height: '100%',
                      width: '8px',
                      cursor: 'col-resize',
                      zIndex: 2,
                      userSelect: 'none',
                    }}
                    onMouseDown={(e) => handleMouseDown(e, col.key)}
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <tr key={project.id}>
              <td className="project-name" style={{ width: columnWidths.projectName, minWidth: minWidths.projectName }}>{project.projectName}</td>
              <td className="creation-date-cell" style={{ width: columnWidths.creationDate, minWidth: minWidths.creationDate }}>
                {project.creationDate ? (
                  <span title={new Date(project.creationDate).toLocaleString()}>
                    {new Date(project.creationDate).toLocaleDateString()} {new Date(project.creationDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                ) : 'N/A'}
              </td>
              <td className="status-cell" style={{ width: columnWidths.status, minWidth: minWidths.status }}>
                <StatusDropdown
                  currentStatus={project.status || 'None'}
                  onStatusChange={(newStatus) => onUpdateProjectStatus(project.id, newStatus)}
                />
              </td>
              <td className="tags-cell" style={{ width: columnWidths.tags, minWidth: minWidths.tags }}>
                <InteractiveTags
                  tags={project.tags ? project.tags.map(tag => tag.name) : []}
                  allTags={allTags.map(tag => tag.name)}
                  onTagsChange={(newTags) => handleTagsChange(project.id, newTags)}
                  maxTags={10}
                />
              </td>
              <td className="notes-cell" style={{ width: columnWidths.notes, minWidth: minWidths.notes }}>
                <EditableNote
                  note={project.notes || ''}
                  onSave={(newNote) => onUpdateProjectNotes(project.id, newNote)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
