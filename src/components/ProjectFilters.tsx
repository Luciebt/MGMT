import React, { useState } from 'react';

interface ProjectFilter {
  projectName?: string;
  tagNames?: string[];
  statusNames?: string[];
}

interface Tag {
  id: number;
  name: string;
}

interface ProjectFiltersProps {
  filter: ProjectFilter;
  onFilterChange: (filter: ProjectFilter) => void;
  tags: Tag[];
  selectedTags: string[];
  onTagSelectionChange: (tagName: string) => void;
  onAddTag: (tagName: string) => Promise<void>;
  onDeleteTag: (tagId: number) => Promise<void>;
  selectedStatuses: string[];
  onStatusSelectionChange: (status: string) => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filter,
  onFilterChange,
  tags,
  selectedTags,
  onTagSelectionChange,
  onAddTag,
  onDeleteTag,
  selectedStatuses = [],
  onStatusSelectionChange
}) => {
  const [searchTerm, setSearchTerm] = useState(filter.projectName || '');
  const [newTagName, setNewTagName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState<{ isOpen: boolean; tagId: number | null; tagName: string }>({ 
    isOpen: false, 
    tagId: null, 
    tagName: '' 
  });

  const STATUS_OPTIONS = ['None', 'Demo', 'Template', 'WIP', 'Mix', 'Mastering', 'Done'];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilterChange({
      ...filter,
      projectName: value || undefined
    });
  };

  const handleAddNewTag = async () => {
    const trimmedName = newTagName.trim();
    if (trimmedName !== '' && !isAddingTag) {
      setIsAddingTag(true);
      try {
        await onAddTag(trimmedName);
        setNewTagName('');
      } catch (error) {
        console.error('Error adding tag:', error);
        // Keep the input value so user can try again
      } finally {
        setIsAddingTag(false);
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && newTagName.trim() && !isAddingTag) {
      e.preventDefault();
      handleAddNewTag();
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setTagSearchTerm('');
    selectedTags.forEach(tag => onTagSelectionChange(tag));
    selectedStatuses.forEach(status => onStatusSelectionChange(status));
    onFilterChange({});
  };

  const handleDeleteTag = (tagId: number, tagName: string) => {
    setDeleteConfirmation({ isOpen: true, tagId, tagName });
  };

  const confirmDeleteTag = async () => {
    if (deleteConfirmation.tagId) {
      try {
        await onDeleteTag(deleteConfirmation.tagId);
        setDeleteConfirmation({ isOpen: false, tagId: null, tagName: '' });
      } catch (error) {
        console.error('Error deleting tag:', error);
        // Keep dialog open to allow retry
      }
    }
  };

  const cancelDeleteTag = () => {
    setDeleteConfirmation({ isOpen: false, tagId: null, tagName: '' });
  };

  const filteredTags = tags.filter(tag => 
    tag.name.toLowerCase().includes(tagSearchTerm.toLowerCase())
  );

  const selectedTagsCount = selectedTags.length;
  const selectedStatusesCount = selectedStatuses.length;

  return (
    <div className="project-filters">
      {/* Main Filter Bar */}
      <div className="filter-main-bar">
        <div className="filter-search-group">
          <div className="search-input-wrapper">
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Search projects and tags..."
              className="filter-search-input"
            />
          </div>
        </div>

        <div className="filter-actions-group">
          {selectedTagsCount > 0 && (
            <span className="filter-badge">
              {selectedTagsCount} tag{selectedTagsCount > 1 ? 's' : ''}
            </span>
          )}
          
          {selectedStatusesCount > 0 && (
            <span className="filter-badge">
              {selectedStatusesCount} status{selectedStatusesCount > 1 ? 'es' : ''}
            </span>
          )}
          
          <button 
            className="filter-expand-btn"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-expanded={isExpanded}
          >
            <svg className={`expand-icon ${isExpanded ? 'expanded' : ''}`} viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
            Filters
          </button>

          {(searchTerm || selectedTagsCount > 0 || selectedStatusesCount > 0) && (
            <button className="filter-clear-btn" onClick={clearFilters}>
              <svg viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expanded Filter Panel */}
      {isExpanded && (
        <div className="filter-expanded-panel">
          {/* Tag Filtering Block */}
          <div className="tag-management-section">
            <div className="tag-management-header">
              <h4>Filter & Manage Tags</h4>
              <div className="tag-search-group">
                <input
                  type="text"
                  value={tagSearchTerm}
                  onChange={(e) => setTagSearchTerm(e.target.value)}
                  placeholder="Search existing tags..."
                  className="tag-search-input"
                />
                {tagSearchTerm && (
                  <button 
                    className="tag-filter-clear"
                    onClick={() => setTagSearchTerm('')}
                    title="Clear tag search"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor">
                      <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Tag Filter Grid with Create New Tag Option */}
            <div className="tag-filter-grid">
              {/* Create New Tag Item */}
              <div className="tag-create-item">
                <input
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Create new tag..."
                  className="tag-create-input"
                  disabled={isAddingTag}
                />
                <button 
                  type="button"
                  className={`btn btn-success btn-sm ${isAddingTag ? 'loading' : ''}`}
                  onClick={handleAddNewTag}
                  disabled={!newTagName.trim() || isAddingTag}
                  title={isAddingTag ? "Creating tag..." : newTagName.trim() ? "Create new tag" : "Enter a tag name first"}
                >
                  {isAddingTag ? '...' : '+'}
                </button>
              </div>

              {/* Existing Tags */}
              {filteredTags.map((tag) => (
                <div 
                  key={tag.id} 
                  className={`tag-filter-item ${selectedTags.includes(tag.name) ? 'selected' : ''}`}
                >
                  <label className="tag-filter-checkbox">
                    <input
                      type="checkbox"
                      checked={selectedTags.includes(tag.name)}
                      onChange={() => onTagSelectionChange(tag.name)}
                    />
                    <span className="tag-filter-label">{tag.name}</span>
                  </label>
                  <button
                    type="button"
                    className="tag-delete-btn"
                    onClick={() => handleDeleteTag(tag.id, tag.name)}
                    title={`Delete tag "${tag.name}"`}
                    aria-label={`Delete tag ${tag.name}`}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>

            {filteredTags.length === 0 && tagSearchTerm && (
              <div className="no-tags-message">
                No tags found matching "{tagSearchTerm}". Use the field above to create a new tag!
              </div>
            )}

            {tags.length === 0 && (
              <div className="no-tags-message">
                No tags available yet. Create your first tag using the field above!
              </div>
            )}
          </div>
          
          {/* Status Filtering Block */}
          <div className="tag-management-section">
            <div className="tag-management-header">
              <h4>Filter by Status</h4>
            </div>

            <div className="status-filter-grid">
              {STATUS_OPTIONS.map((status) => (
                <label 
                  key={status} 
                  className={`status-filter-item ${selectedStatuses.includes(status) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedStatuses.includes(status)}
                    onChange={() => onStatusSelectionChange(status)}
                  />
                  <span className="tag-filter-label">{status}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmation.isOpen && (
        <div className="modal-overlay" onClick={cancelDeleteTag}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Delete Tag</h3>
              <button 
                className="modal-close" 
                onClick={cancelDeleteTag}
                aria-label="Close dialog"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" width="20" height="20">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the tag <strong>"{deleteConfirmation.tagName}"</strong>?</p>
              <p className="text-muted">This will remove the tag from all projects that currently have it assigned. This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary" 
                onClick={cancelDeleteTag}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger" 
                onClick={confirmDeleteTag}
              >
                Delete Tag
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
