import React, { useState, useEffect, useRef } from 'react';

interface EditableNoteProps {
  note: string | null;
  onSave: (newNote: string) => void;
}

export const EditableNote: React.FC<EditableNoteProps> = ({ note, onSave }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentNote, setCurrentNote] = useState(note || '');
  const [isSaving, setIsSaving] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setCurrentNote(note || '');
  }, [note]);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditing]);

  const handleSave = async () => {
    setIsSaving(true);
    await onSave(currentNote);
    setIsSaving(false);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setCurrentNote(note || '');
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="editable-note-container">
      {isEditing ? (
        <div className="note-editor">
          <textarea
            ref={textareaRef}
            value={currentNote}
            onChange={(e) => setCurrentNote(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={3}
            placeholder="Add notes here..."
          />
          <div className="note-actions">
            <button onClick={handleSave} className="btn btn-primary btn-sm" disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button onClick={handleCancel} className="btn btn-outline btn-sm" disabled={isSaving}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="note-display" onClick={() => setIsEditing(true)} title="Click to edit notes">
          <p className={!currentNote ? 'placeholder' : ''}>
            {currentNote || 'Click to add notes...'}
          </p>
          <span className="edit-icon">✏️</span>
        </div>
      )}
    </div>
  );
};