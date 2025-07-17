import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProjectTable } from '../../../src/components/ProjectTable';

const mockProjects = [
  {
    id: 1,
    projectName: 'Test Project 1',
    projectPath: '/path/1',
    alsFilePath: '/path/1.als',
    creationDate: '2023-01-01T00:00:00.000Z',
    bpm: 120,
    key: 'C',
    tags: [{ id: 1, name: 'Electronic' }]
  },
  {
    id: 2,
    projectName: 'Test Project 2',
    projectPath: '/path/2',
    alsFilePath: '/path/2.als',
    creationDate: '2023-01-02T00:00:00.000Z',
    bpm: 140,
    key: 'Am',
    tags: []
  }
];

describe('ProjectTable', () => {
  const defaultProps = {
    projects: mockProjects,
    onSort: vi.fn(),
    sortColumn: null,
    sortDirection: null,
    onAddProjectTag: vi.fn()
  };

  it('should render project data correctly', () => {
    render(<ProjectTable {...defaultProps} />);
    
    expect(screen.getByText('Test Project 1')).toBeInTheDocument();
    expect(screen.getByText('Test Project 2')).toBeInTheDocument();
    expect(screen.getByText('120')).toBeInTheDocument();
    expect(screen.getByText('140')).toBeInTheDocument();
    expect(screen.getByText('C')).toBeInTheDocument();
    expect(screen.getByText('Am')).toBeInTheDocument();
  });

  it('should call onSort when column headers are clicked', () => {
    const onSort = vi.fn();
    render(<ProjectTable {...defaultProps} onSort={onSort} />);
    
    fireEvent.click(screen.getByText(/Project Name/));
    expect(onSort).toHaveBeenCalledWith('projectName');
    
    fireEvent.click(screen.getByText(/BPM/));
    expect(onSort).toHaveBeenCalledWith('bpm');
  });

  it('should display sort indicators', () => {
    render(
      <ProjectTable 
        {...defaultProps} 
        sortColumn="projectName" 
        sortDirection="asc" 
      />
    );
    
    expect(screen.getByText(/Project Name ▲/)).toBeInTheDocument();
  });

  it('should handle tag addition', async () => {
    const onAddProjectTag = vi.fn().mockResolvedValue(undefined);
    render(<ProjectTable {...defaultProps} onAddProjectTag={onAddProjectTag} />);
    
    const tagInputs = screen.getAllByPlaceholderText('Add tag');
    const addButtons = screen.getAllByText('Add');
    
    fireEvent.change(tagInputs[0], { target: { value: 'New Tag' } });
    fireEvent.click(addButtons[0]);
    
    await waitFor(() => {
      expect(onAddProjectTag).toHaveBeenCalledWith(1, 'New Tag');
    });
  });

  it('should handle empty projects array', () => {
    render(<ProjectTable {...defaultProps} projects={[]} />);
    
    // Should still render headers
    expect(screen.getByText(/Project Name/)).toBeInTheDocument();
    expect(screen.getByText(/BPM/)).toBeInTheDocument();
    
    // But no project data
    expect(screen.queryByText('Test Project 1')).not.toBeInTheDocument();
  });
});
