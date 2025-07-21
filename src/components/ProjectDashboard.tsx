import React, { useState } from "react";
import { EditableNote } from "./EditableNote";
import "../styles/dashboard.css";

const dummyStatus = "WIP";
const dummyMoodboard = [
  { type: "image", name: "Inspo 1", icon: "🖼️" },
  { type: "video", name: "Inspo 2", icon: "🎬" },
  { type: "audio", name: "Inspo 3", icon: "🎧" },
  { type: "link", name: "Ableton Blog", icon: "🔗" },
];

export const ProjectDashboard: React.FC<{
  project: any;
  onNotesSaved?: () => void;
}> = ({ project: _project, onNotesSaved }) => {
  // Tag management state
  const [tagInput, setTagInput] = useState("");
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [allTags, setAllTags] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    // Fetch all tags for autocomplete
    window.electronAPI.getTags().then((tags: any[]) => {
      setAllTags(tags.map((t) => t.name));
    });
  }, [refreshKey]);

  const handleAddTag = async (tagName: string) => {
    if (!tagName.trim() || isAddingTag) return;
    setIsAddingTag(true);
    try {
      // Add tag to global tags if new
      const tagId = await window.electronAPI.addTag(tagName.trim());
      // Add tag to project
      await window.electronAPI.addProjectTag(_project.id, tagId);
      setTagInput("");
      setRefreshKey((k) => k + 1);
    } finally {
      setIsAddingTag(false);
    }
  };

  const handleRemoveTag = async (tagName: string) => {
    // Find tag id
    const tags = await window.electronAPI.getTags();
    const tag = tags.find((t: any) => t.name === tagName);
    if (!tag) return;
    await window.electronAPI.removeProjectTag(_project.id, tag.id);
    setRefreshKey((k) => k + 1);
  };

  // Save notes to DB
  const handleSaveNote = async (newNote: string) => {
    if (!_project?.id) return;
    await window.electronAPI.updateProjectNotes(_project.id, newNote);
    if (onNotesSaved) onNotesSaved();
  };

  // Current project tags (string[])
  const projectTags = Array.isArray(_project?.tags)
    ? _project.tags.map((t: any) => (typeof t === "string" ? t : t.name))
    : [];
  // Tag suggestions (exclude already added)
  const tagSuggestions = allTags.filter(
    (t) =>
      t.toLowerCase().includes(tagInput.toLowerCase()) &&
      !projectTags.includes(t)
  );

  // Handle keyboard navigation for suggestions
  const handleTagInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      setHighlightedIndex((prev) =>
        Math.min(prev + 1, tagSuggestions.length - 1)
      );
    } else if (e.key === "ArrowUp") {
      setHighlightedIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      if (highlightedIndex >= 0 && tagSuggestions[highlightedIndex]) {
        handleAddTag(tagSuggestions[highlightedIndex]);
      } else if (tagInput.trim()) {
        handleAddTag(tagInput.trim());
      }
    } else if (e.key === "Escape") {
      setHighlightedIndex(-1);
    }
  };

  React.useEffect(() => {
    setHighlightedIndex(tagSuggestions.length > 0 ? 0 : -1);
  }, [tagInput, tagSuggestions.length]);

  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto auto auto",
        gap: "var(--spacing-2)",
        gridTemplateAreas: `
          'header header'
          'tags tags'
          'notes stats'
          'moodboard moodboard'
        `,
      }}
    >
      {/* Project Title, Status, Tags (above grid) */}
      <div style={{ gridArea: "header", marginBottom: 0 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            flexDirection: "column",
            gap: "var(--spacing-2)",
            flexWrap: "wrap",
          }}
        >
          <h2 style={{ fontSize: "3rem", fontWeight: 700, margin: 0 }}>
            {_project?.projectName || "Project Name"}
          </h2>
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--spacing-2)",
              flexWrap: "wrap",
            }}
          >
            <span className="dashboard-status-badge" title="Status">
              {_project?.status || dummyStatus}
            </span>
          </div>
        </div>
      </div>
      {/* Tag Management Section */}
      <div style={{ gridArea: "tags", marginBottom: 0, position: 'relative' }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flexWrap: "wrap",
            position: 'relative',
          }}
        >
          {projectTags.map((tag: string) => (
            <span
              key={tag}
              className="dashboard-chip"
              style={{ display: "flex", alignItems: "center" }}
            >
              {tag}
              <button
                style={{
                  background: "none",
                  border: "none",
                  marginLeft: 4,
                  cursor: "pointer",
                  color: "var(--primary-color)",
                  fontSize: 16,
                  lineHeight: 1,
                  padding: 0,
                }}
                title={`Remove tag ${tag}`}
                onClick={() => handleRemoveTag(tag)}
                aria-label={`Remove tag ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
          <div style={{ position: 'relative', display: 'inline-block' }}>
            <input
              ref={inputRef}
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setHighlightedIndex(0);
              }}
              onKeyDown={handleTagInputKeyDown}
              placeholder="Add tag..."
              style={{
                minWidth: 120,
                fontSize: 15,
                padding: '4px 10px',
                borderRadius: 6,
                border: '1px solid var(--border-color)',
                outline: 'none',
                marginRight: 4,
                background: 'var(--bg-primary)',
              }}
              disabled={isAddingTag}
              autoComplete="off"
              onBlur={() => setTimeout(() => setHighlightedIndex(-1), 100)}
              onFocus={() => tagInput && setHighlightedIndex(0)}
            />
            {/* Suggestions Dropdown */}
            {tagInput && tagSuggestions.length > 0 && (
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  zIndex: 10,
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: 6,
                  boxShadow: '0 2px 8px 0 rgba(0,0,0,0.08)',
                  minWidth: 120,
                  marginTop: 2,
                  maxHeight: 180,
                  overflowY: 'auto',
                }}
              >
                {tagSuggestions.map((t, idx) => (
                  <div
                    key={t}
                    style={{
                      padding: '6px 12px',
                      cursor: 'pointer',
                      background:
                        idx === highlightedIndex
                          ? 'var(--bg-secondary, #f0f0f7)'
                          : 'transparent',
                      color: 'var(--primary-color)',
                      fontWeight: idx === highlightedIndex ? 600 : 400,
                    }}
                    onMouseDown={() => handleAddTag(t)}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                  >
                    {t}
                  </div>
                ))}
              </div>
            )}
          </div>
          {tagInput.trim() && !projectTags.includes(tagInput.trim()) && (
            <button
              className="btn btn-success btn-sm"
              style={{ marginLeft: 2 }}
              onClick={() => handleAddTag(tagInput.trim())}
              disabled={isAddingTag}
            >
              +
            </button>
          )}
        </div>
      </div>
      {/* Notes Section (top left) */}
      <div style={{ gridArea: "notes" }}>
        <div
          className="dashboard-card dashboard-card-modular"
          style={{ minHeight: 120 }}
        >
          <h3 className="dashboard-card-title">Notes</h3>
          <EditableNote
            note={
              _project?.notes ||
              "This is a dummy note for the set. You can edit this in the real app."
            }
            onSave={handleSaveNote}
          />
        </div>
      </div>
      {/* Numerical Data Block (top right) */}
      <div style={{ gridArea: "stats" }}>
        {(_project?.trackCount !== undefined &&
          _project?.trackCount !== null) ||
        (_project?.bpm !== undefined && _project?.bpm !== null) ||
        (_project?.sampleCount !== undefined &&
          _project?.sampleCount !== null) ||
        (_project?.setLength !== undefined && _project?.setLength !== null) ? (
          <div className="dashboard-card dashboard-card-modular">
            <h3 className="dashboard-card-title">Project Stats</h3>
            <div className="dashboard-numerical-cards">
              {_project?.trackCount !== undefined &&
                _project?.trackCount !== null && (
                  <div className="dashboard-numcard">
                    <div className="dashboard-numcard-value">
                      {_project.trackCount}
                    </div>
                    <div className="dashboard-numcard-label">tracks</div>
                  </div>
                )}
              {_project?.bpm !== undefined && _project?.bpm !== null && (
                <div className="dashboard-numcard">
                  <div className="dashboard-numcard-value">{_project.bpm}</div>
                  <div className="dashboard-numcard-label">BPM</div>
                </div>
              )}
              {_project?.sampleCount !== undefined &&
                _project?.sampleCount !== null && (
                  <div className="dashboard-numcard">
                    <div className="dashboard-numcard-value">
                      {_project.sampleCount}
                    </div>
                    <div className="dashboard-numcard-label">samples</div>
                  </div>
                )}
              {_project?.setLength !== undefined &&
                _project?.setLength !== null && (
                  <div className="dashboard-numcard">
                    <div className="dashboard-numcard-value">
                      {_project.setLength}
                    </div>
                    <div className="dashboard-numcard-label">length</div>
                  </div>
                )}
            </div>
          </div>
        ) : null}
      </div>
      {/* Moodboard (full width below) */}
      <div style={{ gridArea: "moodboard" }}>
        <section
          className="dashboard-card"
          style={{ marginTop: "var(--spacing-2)" }}
        >
          <h3 className="dashboard-card-title">
            Moodboard{" "}
            <span
              title="Drop images, videos, audio, or links here for inspiration"
              style={{
                fontSize: 16,
                color: "var(--text-muted)",
                marginLeft: 6,
              }}
            >
              🛈
            </span>
          </h3>
          <div className="dashboard-moodboard-grid">
            {dummyMoodboard.length === 0 ? (
              <span style={{ color: "var(--text-muted)" }}>
                Drop files or links here
              </span>
            ) : (
              dummyMoodboard.map((item, idx) => (
                <div key={idx} className="dashboard-moodboard-item">
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span
                    style={{
                      color: "var(--text-muted)",
                      fontSize: 14,
                      marginLeft: "auto",
                    }}
                  >
                    {item.type}
                  </span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
