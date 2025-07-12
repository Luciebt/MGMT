import React, { useState } from 'react';

interface ProjectFilter {
  projectName?: string;
  tagNames?: string[];
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
}

export const ProjectFilters: React.FC<ProjectFiltersProps> = ({
  filter,
  onFilterChange,
  tags,
  selectedTags,
  onTagSelectionChange
}) => {
  const [searchTerm, setSearchTerm] = useState(filter.projectName || '');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    onFilterChange({
      ...filter,
      projectName: value || undefined
    });
  };

  const clearFilters = () => {
    setSearchTerm('');
    onFilterChange({});
  };

  return (
    <div className="project-filters">
      <div className="filter-group">
        <label htmlFor="project-search">Search Projects:</label>
        <input
          id="project-search"
          type="text"
          value={searchTerm}
          onChange={handleSearchChange}
          placeholder="Enter project name..."
          className="search-input"
        />
      </div>

      {tags.length > 0 && (
        <div className="filter-group">
          <label>Filter by Tags:</label>
          <div className="tag-checkboxes">
            {tags.map((tag) => (
              <label key={tag.id} className="tag-checkbox">
                <input
                  type="checkbox"
                  checked={selectedTags.includes(tag.name)}
                  onChange={() => onTagSelectionChange(tag.name)}
                />
                <span className="tag-name">{tag.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="filter-actions">
        <button onClick={clearFilters} className="clear-filters-btn">
          Clear Filters
        </button>
        <span className="filter-count">
          {selectedTags.length > 0 && `${selectedTags.length} tag(s) selected`}
        </span>
      </div>
    </div>
  );
};
