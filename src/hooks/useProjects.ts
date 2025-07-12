import { useState, useEffect, useCallback } from 'react';

// Inline types for now to avoid module resolution issues
interface AbletonProject {
  id: number;
  projectName: string;
  projectPath: string;
  alsFilePath: string;
  creationDate: string;
  bpm: number | null;
  key: string | null;
}

interface ProjectFilter {
  projectName?: string;
  tagNames?: string[];
}

interface UseProjectsReturn {
  projects: AbletonProject[];
  loading: boolean;
  error: string | null;
  refresh: () => void;
  filter: ProjectFilter;
  setFilter: (filter: ProjectFilter) => void;
  updateAllMetadata: () => Promise<void>;
}

export const useProjects = (): UseProjectsReturn => {
  const [projects, setProjects] = useState<AbletonProject[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProjectFilter>({});

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let result;
      if (filter && Object.keys(filter).length > 0) {
        result = await window.electronAPI.filterProjects(filter);
      } else {
        result = await window.electronAPI.getProjects();
      }
      
      setProjects(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch projects');
      console.error('Error fetching projects:', err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const refresh = useCallback(() => fetchProjects(), [fetchProjects]);

  const updateAllMetadata = useCallback(async () => {
    try {
      setLoading(true);
      await window.electronAPI.updateMetadata();
      await fetchProjects(); // Refresh projects after update
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update metadata');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [fetchProjects]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return {
    projects,
    loading,
    error,
    refresh,
    filter,
    setFilter,
    updateAllMetadata
  };
};
