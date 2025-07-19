import React from 'react';
import { EditableNote } from './EditableNote';
import '../styles/dashboard.css';

const dummyPlugins = [
  { name: 'Serum', icon: '🎹' },
  { name: 'FabFilter Pro-Q 3', icon: '🎛️' },
  { name: 'Valhalla Room', icon: '🌊' },
  { name: 'OTT', icon: '🦾' },
];
const dummyTags = ['Electronic', 'Chill', '2024'];
const dummyStatus = 'WIP';
const dummyTrackCount = 14;
const dummyClipCount = 42;
const dummySampleCount = 128;
const dummySetLength = '5:32';
const dummyTempo = 124;
const dummyReferenceTracks = [
  { name: 'Reference 1', type: 'audio', icon: '🎵' },
  { name: 'Reference 2', type: 'audio', icon: '🎵' },
];
const dummyMoodboard = [
  { type: 'image', name: 'Inspo 1', icon: '🖼️' },
  { type: 'video', name: 'Inspo 2', icon: '🎬' },
  { type: 'audio', name: 'Inspo 3', icon: '🎧' },
  { type: 'link', name: 'Ableton Blog', icon: '🔗' },
];

export const ProjectDashboard: React.FC<{ project: any }> = ({ project: _project }) => {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--spacing-4)' }}>
      {/* Top Row: Status/Tags (left), Numerical Data (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 'var(--spacing-4)', alignItems: 'flex-start' }}>
        {/* Status and Tags */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-2)' }}>
          <span className="dashboard-status-badge" title="Status">{dummyStatus}</span>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-2)' }}>
            {dummyTags.map((tag) => (
              <span key={tag} className="dashboard-chip">{tag}</span>
            ))}
          </div>
        </div>
        {/* Numerical Data */}
        <div className="dashboard-numerical-cards">
          <div className="dashboard-numcard">
            <div className="dashboard-numcard-value">{dummyTrackCount}</div>
            <div className="dashboard-numcard-label">tracks</div>
          </div>
          <div className="dashboard-numcard">
            <div className="dashboard-numcard-value">{dummyClipCount}</div>
            <div className="dashboard-numcard-label">clips</div>
          </div>
          <div className="dashboard-numcard">
            <div className="dashboard-numcard-value">{dummySampleCount}</div>
            <div className="dashboard-numcard-label">samples</div>
          </div>
          <div className="dashboard-numcard">
            <div className="dashboard-numcard-value">{dummySetLength}</div>
            <div className="dashboard-numcard-label">length</div>
          </div>
          <div className="dashboard-numcard">
            <div className="dashboard-numcard-value">{dummyTempo}</div>
            <div className="dashboard-numcard-label">BPM</div>
          </div>
        </div>
      </div>
      {/* Second Row: Notes (left), Plugins (right) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)', alignItems: 'flex-start' }}>
        {/* Notes */}
        <div style={{ minWidth: 0, width: '100%' }}>
          <div className="dashboard-card" style={{ minHeight: 80, width: '100%' }}>
            <h3 className="dashboard-card-title" style={{ marginBottom: 8 }}>Notes</h3>
            <EditableNote note={"This is a dummy note for the set. You can edit this in the real app."} onSave={() => {}} />
          </div>
        </div>
        {/* Plugins Used */}
        <div style={{ minWidth: 0, width: '100%' }}>
          <section className="dashboard-card">
            <h3 className="dashboard-card-title">Plugins Used</h3>
            <ul className="dashboard-plugin-list">
              {dummyPlugins.map((plugin) => (
                <li key={plugin.name} className="dashboard-plugin-list-item">
                  {plugin.name}
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
      {/* Main Grid: Reference Tracks, Moodboard */}
      <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--spacing-4)' }}>
        {/* Reference Tracks */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Reference Tracks <span title="Drop audio files here for reference" style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 6 }}>🛈</span></h3>
          <div className="dashboard-dropzone">
            {dummyReferenceTracks.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>Drop audio files here</span>
            ) : (
              dummyReferenceTracks.map((ref) => (
                <span key={ref.name} className="dashboard-chip">
                  <span style={{ fontSize: 18 }}>{ref.icon}</span> {ref.name}
                </span>
              ))
            )}
          </div>
        </section>
        {/* Moodboard */}
        <section className="dashboard-card">
          <h3 className="dashboard-card-title">Moodboard <span title="Drop images, videos, audio, or links here for inspiration" style={{ fontSize: 16, color: 'var(--text-muted)', marginLeft: 6 }}>🛈</span></h3>
          <div className="dashboard-moodboard-grid">
            {dummyMoodboard.length === 0 ? (
              <span style={{ color: 'var(--text-muted)' }}>Drop files or links here</span>
            ) : (
              dummyMoodboard.map((item, idx) => (
                <div key={idx} className="dashboard-moodboard-item">
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <span style={{ fontWeight: 500 }}>{item.name}</span>
                  <span style={{ color: 'var(--text-muted)', fontSize: 14, marginLeft: 'auto' }}>{item.type}</span>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}; 