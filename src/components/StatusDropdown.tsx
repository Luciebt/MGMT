import React, { useState } from 'react';

const STATUS_OPTIONS = ['None', 'Demo', 'Template', 'WIP', 'Mix', 'Mastering', 'Done'] as const;

interface StatusDropdownProps {
  currentStatus?: string;
  onStatusChange: (newStatus: string) => Promise<void>;
}

export const StatusDropdown: React.FC<StatusDropdownProps> = ({
  currentStatus = 'None',
  onStatusChange
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    if (newStatus === currentStatus) return;
    
    setIsLoading(true);
    try {
      await onStatusChange(newStatus);
    } catch (error) {
      console.error('Failed to update status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="status-dropdown-container">
      <select
        value={currentStatus}
        onChange={(e) => handleStatusChange(e.target.value)}
        disabled={isLoading}
        className="status-dropdown"
      >
        {STATUS_OPTIONS.map((status) => (
          <option key={status} value={status}>
            {status}
          </option>
        ))}
      </select>
      {isLoading && <div className="status-loading">⟳</div>}
    </div>
  );
};
