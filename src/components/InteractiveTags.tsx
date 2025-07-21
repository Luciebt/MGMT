import React, { useState } from 'react';

interface InteractiveTagsProps {
  tags: string[];
  allTags: string[];
  onTagsChange: (newTags: string[]) => void;
  maxTags?: number;
  variant?: 'pill' | 'filter';
}

export const InteractiveTags: React.FC<InteractiveTagsProps> = ({
  tags,
  allTags,
  onTagsChange,
  maxTags = 10,
  variant = 'filter',
}) => {
  const [input, setInput] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const suggestions = allTags
    .filter(tag => tag.toLowerCase().includes(input.toLowerCase()) && !tags.includes(tag))
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 10);

  const handleAddTag = async (tag: string) => {
    const trimmed = tag.trim();
    if (!trimmed || tags.includes(trimmed) || tags.length >= maxTags) return;
    setIsAdding(true);
    onTagsChange([...tags, trimmed]);
    setInput('');
    setHighlighted(-1);
    setIsAdding(false);
  };

  const handleRemoveTag = (idx: number) => {
    onTagsChange(tags.filter((_, i) => i !== idx));
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (highlighted >= 0 && suggestions[highlighted]) {
        handleAddTag(suggestions[highlighted]);
      } else if (input.trim()) {
        handleAddTag(input);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (suggestions.length > 0) setHighlighted(h => (h + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (suggestions.length > 0) setHighlighted(h => (h - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Escape') {
      setHighlighted(-1);
    }
  };

  return (
    <div className={variant === 'pill' ? 'tags-container' : 'tag-filter-grid'} style={variant === 'pill' ? { display: 'flex', flexWrap: 'wrap', gap: 8, minHeight: 32 } : { display: 'flex', flexWrap: 'wrap', gap: 8 }}>
      {tags.map((tag, idx) => (
        variant === 'pill' ? (
          <span key={tag} className="tag-pill" style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
            {tag}
          </span>
        ) : (
          <div key={tag} className="tag-filter-item tag-filter-item-has-bin" style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
            <span className="tag-filter-label">{tag}</span>
            <button
              type="button"
              className="tag-delete-btn"
              style={{ opacity: 0, transition: 'opacity 0.15s', position: 'relative' }}
              onClick={e => { e.stopPropagation(); handleRemoveTag(idx); }}
              title={`Remove tag ${tag}`}
              aria-label={`Remove tag ${tag}`}
              tabIndex={-1}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" width="14" height="14">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 006 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 10.23 1.482l.149-.022.841 10.518A2.75 2.75 0 007.596 19h4.807a2.75 2.75 0 002.742-2.53l.841-10.52.149.023a.75.75 0 00.23-1.482A41.03 41.03 0 0014 4.193V3.75A2.75 2.75 0 0011.25 1h-2.5zM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4zM8.58 7.72a.75.75 0 00-1.5.06l.3 7.5a.75.75 0 101.5-.06l-.3-7.5zm4.34.06a.75.75 0 10-1.5-.06l-.3 7.5a.75.75 0 101.5.06l.3-7.5z" clipRule="evenodd" />
              </svg>
            </button>
            <style>{`.tag-filter-item-has-bin:hover .tag-delete-btn { opacity: 1 !important; }`}</style>
          </div>
        )
      ))}
      {variant !== 'pill' && (
        <div className="tag-create-item" style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 180, position: 'relative' }}>
          <input
            type="text"
            value={input}
            onChange={e => { setInput(e.target.value); setHighlighted(-1); setShowSuggestions(true); }}
            onKeyDown={handleInputKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onMouseDown={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            placeholder="Add or create tag..."
            className="tag-create-input"
            disabled={isAdding || tags.length >= maxTags}
            style={{ flex: 1 }}
          />
          <button
            type="button"
            className="btn btn-success btn-sm"
            onClick={() => handleAddTag(input)}
            disabled={!input.trim() || isAdding || tags.length >= maxTags}
            title={isAdding ? 'Adding...' : input.trim() ? 'Add tag' : 'Enter a tag name first'}
          >
            +
          </button>
          {showSuggestions && suggestions.length > 0 && (
            <div className="tag-autocomplete" style={{ position: 'absolute', top: '100%', left: 0, zIndex: 10, background: '#fff', border: '1px solid #eee', borderRadius: 6, boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)', minWidth: 120, marginTop: 2, maxHeight: 180, overflowY: 'auto' }}>
              {suggestions.map((s, i) => (
                <div
                  key={s}
                  className={`tag-autocomplete-item${i === highlighted ? ' highlighted' : ''}`}
                  style={{ padding: '6px 12px', cursor: 'pointer', background: i === highlighted ? 'var(--bg-secondary, #f0f0f7)' : 'transparent', color: 'var(--primary-color)', fontWeight: i === highlighted ? 600 : 400 }}
                  onMouseDown={e => { e.preventDefault(); handleAddTag(s); }}
                  onMouseEnter={() => setHighlighted(i)}
                >
                  {s}
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
