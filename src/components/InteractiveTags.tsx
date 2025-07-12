import React, { useState, useRef, useEffect } from 'react';
import type { KeyboardEvent } from 'react';

interface InteractiveTagsProps {
  tags: string[];
  allTags: string[];
  onTagsChange: (newTags: string[]) => void;
  maxTags?: number;
}

export const InteractiveTags: React.FC<InteractiveTagsProps> = ({
  tags,
  allTags,
  onTagsChange,
  maxTags = 10
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter and sort suggestions
  const suggestions = allTags
    .filter(tag => 
      tag.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(tag)
    )
    .sort((a, b) => a.localeCompare(b)) // Sort alphabetically
    .slice(0, 10); // Limit to 10 suggestions

  // Handle clicking outside to exit edit mode
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        handleFinishEditing();
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  // Focus input and show suggestions when entering edit mode
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isEditing]);

  const handleContainerClick = () => {
    if (!isEditing) {
      setIsEditing(true);
    }
  };

  const handleAddTag = (tagToAdd: string) => {
    const trimmedTag = tagToAdd.trim();
    if (trimmedTag && !tags.includes(trimmedTag) && tags.length < maxTags) {
      onTagsChange([...tags, trimmedTag]);
    }
    setInputValue('');
    setHighlightedIndex(-1);
    // Keep editing to allow adding multiple tags
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleRemoveTag = (indexToRemove: number, event: React.MouseEvent) => {
    event.stopPropagation();
    const newTags = tags.filter((_, index) => index !== indexToRemove);
    onTagsChange(newTags);
  };

  const handleFinishEditing = () => {
    if (inputValue.trim()) {
      handleAddTag(inputValue);
    }
    setIsEditing(false);
    setInputValue('');
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'Enter':
        event.preventDefault();
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          handleAddTag(suggestions[highlightedIndex]);
        } else if (inputValue.trim()) {
          handleAddTag(inputValue);
        }
        break;
      
      case 'Escape':
        event.preventDefault();
        setIsEditing(false);
        setInputValue('');
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (suggestions.length > 0) {
          setHighlightedIndex(prev => (prev + 1) % suggestions.length);
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (suggestions.length > 0) {
          setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length);
        }
        break;
      
      case 'Tab':
        if (highlightedIndex >= 0 && suggestions[highlightedIndex]) {
          event.preventDefault();
          handleAddTag(suggestions[highlightedIndex]);
        } else {
          handleFinishEditing();
        }
        break;
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
    setHighlightedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleAddTag(suggestion);
  };

  return (
    <div 
      ref={containerRef}
      className={`tags-container ${isEditing ? 'editing' : ''}`}
      onClick={handleContainerClick}
      role="button"
      tabIndex={isEditing ? -1 : 0}
      aria-label="Click to edit tags"
    >
      {tags.length === 0 && !isEditing && (
        <span className="tag-empty-state">
          Click to add tags...
        </span>
      )}
      
      {tags.map((tag, index) => (
        <span key={`${tag}-${index}`} className="tag-pill">
          {tag}
          <button
            className="tag-pill-remove"
            onClick={(e) => handleRemoveTag(index, e)}
            aria-label={`Remove ${tag} tag`}
            title={`Remove ${tag}`}
          >
            ×
          </button>
        </span>
      ))}
      
      {isEditing && (
        <div className="tag-input-wrapper flex-grow">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onBlur={handleFinishEditing}
            className="tag-input-inline"
            placeholder="Add tag..."
            maxLength={30}
          />
          {suggestions.length > 0 && (
            <div className="tag-autocomplete">
              {suggestions.map((suggestion, index) => (
                <div
                  key={suggestion}
                  className={`tag-autocomplete-item ${
                    index === highlightedIndex ? 'highlighted' : ''
                  }`}
                  onMouseDown={(e) => e.preventDefault()} // Prevent blur
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InteractiveTags;
