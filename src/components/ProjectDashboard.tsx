import React from "react";
import { EditableNote } from "./EditableNote";
import "../styles/dashboard.css";

const dummyTags = ["Electronic", "Chill", "2024"];
const dummyStatus = "WIP";
const dummyTrackCount = 14;
const dummySampleCount = 128;
const dummySetLength = "5:32";
const dummyTempo = 124;
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
  // Save notes to DB
  const handleSaveNote = async (newNote: string) => {
    if (!_project?.id) return;
    await window.electronAPI.updateProjectNotes(_project.id, newNote);
    if (onNotesSaved) onNotesSaved();
  };
  return (
    <div
      style={{
        maxWidth: 900,
        margin: "0 auto",
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gridTemplateRows: "auto auto",
        gap: "var(--spacing-2)",
        gridTemplateAreas: `
          'header header'
          'notes stats'
          'moodboard moodboard'
        `,
      }}
    >
      {/* Project Title, Status, Tags (above grid) */}
      <div style={{ gridArea: "header", marginBottom: 18 }}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            flexDirection: "column",
            gap: "var(--spacing-2)",
            flexWrap: "wrap",
            margin: 8,
          }}
        >
          <h2
            style={{
              fontSize: "3rem",
              fontWeight: 700,
            }}
          >
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
            {(Array.isArray(_project?.tags) ? _project.tags : dummyTags).map(
              (tag: any) => (
                <span
                  key={typeof tag === "string" ? tag : tag.id || tag.name}
                  className="dashboard-chip"
                >
                  {typeof tag === "string" ? tag : tag.name}
                </span>
              ),
            )}
          </div>
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
        <div className="dashboard-card dashboard-card-modular">
          <h3 className="dashboard-card-title">Project Stats</h3>
          <div className="dashboard-numerical-cards">
            <div className="dashboard-numcard">
              <div className="dashboard-numcard-value">
                {_project?.trackCount ?? dummyTrackCount}
              </div>
              <div className="dashboard-numcard-label">tracks</div>
            </div>
            <div className="dashboard-numcard">
              <div className="dashboard-numcard-value">
                {_project?.bpm ?? dummyTempo}
              </div>
              <div className="dashboard-numcard-label">BPM</div>
            </div>
            <div className="dashboard-numcard">
              <div className="dashboard-numcard-value">
                {_project?.sampleCount ?? dummySampleCount}
              </div>
              <div className="dashboard-numcard-label">samples</div>
            </div>
            <div className="dashboard-numcard">
              <div className="dashboard-numcard-value">
                {_project?.setLength ?? dummySetLength}
              </div>
              <div className="dashboard-numcard-label">length</div>
            </div>
          </div>
        </div>
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
