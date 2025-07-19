import React from 'react';
import { ProjectDashboard } from './ProjectDashboard';

export const ProjectProfile: React.FC<{ project: any; onBack: () => void }> = ({ project, onBack }) => {
  return (
    <div className="project-profile-page" style={{ maxWidth: 900, margin: '0 auto', padding: 'var(--spacing-4)' }}>
      <button className="btn btn-outline mb-4" onClick={onBack}>&larr; Back to Projects</button>
      <h2 style={{ fontSize: '2rem', fontWeight: 600, marginBottom: 'var(--spacing-4)' }}>{project.projectName}</h2>
      <ProjectDashboard project={project} />
    </div>
  );
}; 