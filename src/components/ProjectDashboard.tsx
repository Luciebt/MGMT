import React, { useState, useEffect } from "react";
import { EditableNote } from "./EditableNote";
import "../styles/dashboard.css";
import { InteractiveTags } from "./InteractiveTags";

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
  const [allTags, setAllTags] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  // Add local state for projectTags to allow immediate UI update
  const [projectTags, setProjectTags] = useState<string[]>(
    Array.isArray(_project?.tags)
      ? _project.tags.map((t: any) => (typeof t === "string" ? t : t.name))
      : []
  );

  useEffect(() => {
    window.electronAPI.getTags().then((tags: any[]) => {
      setAllTags(tags.map((t) => t.name));
    });
  }, [refreshKey]);

  // Sync projectTags state with prop changes (e.g. after DB refresh)
  useEffect(() => {
    setProjectTags(
      Array.isArray(_project?.tags)
        ? _project.tags.map((t: any) => (typeof t === "string" ? t : t.name))
        : []
    );
  }, [_project]);

  const handleTagsChange = async (newTags: string[]) => {
    // Immediate UI update
    setProjectTags(newTags);
    // Add any new tags to the DB, then update project tags
    const tagsFromDb = await window.electronAPI.getTags();
    const dbTagNames = tagsFromDb.map((t: any) => t.name);
    // Add missing tags
    for (const tag of newTags) {
      if (!dbTagNames.includes(tag)) {
        await window.electronAPI.addTag(tag);
      }
    }
    // Remove all tags from project, then add the new set
    const prevProjectTags = Array.isArray(_project?.tags)
      ? _project.tags.map((t: any) => (typeof t === "string" ? t : t.name))
      : [];
    // Remove tags not in newTags
    for (const tag of prevProjectTags) {
      if (!newTags.includes(tag)) {
        const tagObj = tagsFromDb.find((t: any) => t.name === tag);
        if (tagObj) await window.electronAPI.removeProjectTag(_project.id, tagObj.id);
      }
    }
    // Add tags in newTags not in prevProjectTags
    for (const tag of newTags) {
      if (!prevProjectTags.includes(tag)) {
        const tagObj = (await window.electronAPI.getTags()).find((t: any) => t.name === tag);
        if (tagObj) await window.electronAPI.addProjectTag(_project.id, tagObj.id);
      }
    }
    setRefreshKey((k) => k + 1);
  };

  const handleSaveNote = async (newNote: string) => {
    if (!_project?.id) return;
    await window.electronAPI.updateProjectNotes(_project.id, newNote);
    if (onNotesSaved) onNotesSaved();
  };

  return (
    <main
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
      <header style={{ gridArea: "header", marginBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, flexWrap: 'wrap', padding: 'var(--spacing-2)', margin: 'var(--spacing-2)' }}>
          <h2 style={{ fontSize: "3rem", fontWeight: 700, margin: 0, minWidth: 0, padding: 'var(--spacing-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'flex', alignItems: 'flex-end', gap: 16 }}>
            <span style={{ lineHeight: 1 }}>{_project?.projectName || "Project Name"}</span>
            <span className="dashboard-status-badge" title="Status" style={{ marginLeft: 12, flexShrink: 0, alignSelf: 'flex-end', verticalAlign: 'bottom', marginBottom: '5px' }}>
              {_project?.status || dummyStatus}
            </span>
          </h2>
        </div>
      </header>
      <section style={{ gridArea: "tags", marginBottom: 0, position: 'relative' }} aria-label="Project Tags">
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", position: 'relative' }}>
          <InteractiveTags
            tags={projectTags}
            allTags={allTags}
            onTagsChange={handleTagsChange}
            maxTags={10}
          />
        </div>
      </section>
      <section style={{ gridArea: "notes" }} aria-label="Project Notes">
        <div className="dashboard-card dashboard-card-modular" style={{ minHeight: 120 }}>
          <h3 className="dashboard-card-title">Notes</h3>
          <EditableNote
            note={_project?.notes || "This is a dummy note for the set. You can edit this in the real app."}
            onSave={handleSaveNote}
          />
        </div>
      </section>
      <section style={{ gridArea: "stats" }} aria-label="Project Stats">
        {(_project?.trackCount !== undefined && _project?.trackCount !== null) ||
        (_project?.bpm !== undefined && _project?.bpm !== null) ||
        (_project?.sampleCount !== undefined && _project?.sampleCount !== null) ||
        (_project?.setLength !== undefined && _project?.setLength !== null) ? (
          <div className="dashboard-card dashboard-card-modular">
            <h3 className="dashboard-card-title">Project Stats</h3>
            <div className="dashboard-numerical-cards">
              {_project?.trackCount !== undefined && _project?.trackCount !== null && (
                <div className="dashboard-numcard">
                  <div className="dashboard-numcard-value">{_project.trackCount}</div>
                  <div className="dashboard-numcard-label">tracks</div>
                </div>
              )}
              {_project?.bpm !== undefined && _project?.bpm !== null && (
                <div className="dashboard-numcard">
                  <div className="dashboard-numcard-value">{_project.bpm}</div>
                  <div className="dashboard-numcard-label">BPM</div>
                </div>
              )}
              {_project?.sampleCount !== undefined && _project?.sampleCount !== null && (
                <div className="dashboard-numcard">
                  <div className="dashboard-numcard-value">{_project.sampleCount}</div>
                  <div className="dashboard-numcard-label">samples</div>
                </div>
              )}
              {_project?.setLength !== undefined && _project?.setLength !== null && (
                <div className="dashboard-numcard">
                  <div className="dashboard-numcard-value">{_project.setLength}</div>
                  <div className="dashboard-numcard-label">length</div>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </section>
      <section style={{ gridArea: "moodboard" }} aria-label="Project Moodboard">
        <div className="dashboard-card" style={{ marginTop: "var(--spacing-2)" }}>
          <h3 className="dashboard-card-title">
            Moodboard{' '}
            <span
              title="Drop images, videos, audio, or links here for inspiration"
              style={{ fontSize: 16, color: "var(--text-muted)", marginLeft: 6 }}
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
        </div>
      </section>
    </main>
  );
};
