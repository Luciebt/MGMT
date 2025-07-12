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
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [editingTagIndex, setEditingTagIndex] = useState(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Get filtered suggestions based on input
  const suggestions = allTags.filter(tag => 
    tag.toLowerCase().includes(inputValue.toLowerCase()) &&
    !tags.includes(tag) &&
    inputValue.length > 0
  ).slice(0, 5);

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

  // Focus input when entering edit mode
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
    setShowAutocomplete(false);
    setHighlightedIndex(-1);
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
    setShowAutocomplete(false);
    setEditingTagIndex(-1);
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
        setInputValue('');
        setIsEditing(false);
        setShowAutocomplete(false);
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        if (suggestions.length > 0) {
          setHighlightedIndex(prev => 
            prev < suggestions.length - 1 ? prev + 1 : 0
          );
          setShowAutocomplete(true);
        }
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        if (suggestions.length > 0) {
          setHighlightedIndex(prev => 
            prev > 0 ? prev - 1 : suggestions.length - 1
          );
          setShowAutocomplete(true);
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
    const value = event.target.value;
    setInputValue(value);
    setShowAutocomplete(value.length > 0 && suggestions.length > 0);
    setHighlightedIndex(-1);
  };

  const handleSuggestionClick = (suggestion: string) => {
    handleAddTag(suggestion);
  };

  const handleTagClick = (index: number, event: React.MouseEvent) => {
    event.stopPropagation();
    setEditingTagIndex(index);
    setIsEditing(true);
  };

  return (
    <div 
      ref={containerRef}
      className={`tags-container ${isEditing ? 'editing' : ''}`}
      onClick={handleContainerClick}
      role="button"
      tabIndex={0}
      aria-label="Click to edit tags"
    >
      {tags.length === 0 && !isEditing && (
        <span className="tag-empty-state">
          Click to add tags...
        </span>
      )}
      
      {tags.map((tag, index) => (
        <span
          key={`${tag}-${index}`}
          className={`tag-pill ${editingTagIndex === index ? 'editing' : ''}`}
          onClick={(e) => handleTagClick(index, e)}
        >
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
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            // Small delay to allow autocomplete clicks
            setTimeout(() => {
              if (!containerRef.current?.contains(document.activeElement)) {
                handleFinishEditing();
              }
            }, 150);
          }}
          className="tag-input-inline"
          placeholder="Add tag..."
          maxLength={30}
        />
      )}
      
      {!isEditing && tags.length < maxTags && (
        <button
          className="tag-add-button"
          onClick={handleContainerClick}
          aria-label="Add new tag"
          title="Add tag"
        >
          +
        </button>
      )}
      
      {showAutocomplete && suggestions.length > 0 && (
        <div className="tag-autocomplete">
          {suggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`tag-autocomplete-item ${
                index === highlightedIndex ? 'highlighted' : ''
              }`}
              onClick={() => handleSuggestionClick(suggestion)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default InteractiveTags;
