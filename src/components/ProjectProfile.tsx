import React, { useState } from "react";
import { ProjectDashboard } from "./ProjectDashboard";

export const ProjectProfile: React.FC<{ project: any; onBack: () => void }> = ({
  project,
  onBack,
}) => {
  const [currentProject, setCurrentProject] = useState(project);

  const handleNotesSaved = async () => {
    // Re-fetch the project from the DB by id
    const allProjects = await window.electronAPI.getProjects();
    const updated = allProjects.find((p: any) => p.id === currentProject.id);
    if (updated) setCurrentProject(updated);
  };

  return (
    <div
      className="project-profile-page"
      style={{ maxWidth: 900, margin: "0 auto", padding: "var(--spacing-4)" }}
    >
      <button className="btn btn-outline mb-18" onClick={onBack}>
        &larr; Back
      </button>
      <ProjectDashboard
        project={currentProject}
        onNotesSaved={handleNotesSaved}
      />
    </div>
  );
};
