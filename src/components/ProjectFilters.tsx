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
  selectedStatuses?: string[];
  onStatusSelectionChange: (statusName: string) => void;
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filter,
  onFilterChange,
  tags,
  selectedTags,
  onTagSelectionChange,
  onAddTag,
  selectedStatuses = [],
  onStatusSelectionChange
}) => {
  const [searchTerm, setSearchTerm] = useState(filter.projectName || '');
  const [newTagName, setNewTagName] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);

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
                <label 
                  key={tag.id} 
                  className={`tag-filter-item ${selectedTags.includes(tag.name) ? 'selected' : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.name)}
                    onChange={() => onTagSelectionChange(tag.name)}
                  />
                  <span className="tag-filter-label">{tag.name}</span>
                </label>
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

            <div className="tag-filter-grid">
              {STATUS_OPTIONS.map((status) => (
                <label 
                  key={status} 
                  className={`tag-filter-item ${selectedStatuses.includes(status) ? 'selected' : ''}`}
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
    </div>
  );
};
