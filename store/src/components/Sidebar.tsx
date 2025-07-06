import React, { useState } from 'react';

interface SidebarProps {
  onLogout: () => void;
  onStartSession: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ onLogout, onStartSession }) => {
  const [expanded, setExpanded] = useState<boolean>(localStorage.getItem('sidebar_expanded') === '1');

  const handleToggle = () => {
    setExpanded((prev) => {
      localStorage.setItem('sidebar_expanded', prev ? '0' : '1');
      return !prev;
    });
  };

  return (
    <div
      id="sidebar"
      className={`d-flex flex-column bg-dark text-light position-fixed top-0 start-0 vh-100${expanded ? ' expanded' : ''}`}
      style={{ width: expanded ? 200 : 60, zIndex: 1050, transition: 'width 0.2s' }}
    >
      <div className="flex-grow-1 d-flex flex-column align-items-center pt-3" id="sidebar-icons">
        <button className="btn btn-dark mb-3 sidebar-toggle" id="sidebar-toggle-btn" title="Expand/Collapse" onClick={handleToggle}>
          <i className="bi bi-list"></i>
        </button>
        <div className="sidebar-items w-100 d-flex flex-column align-items-center gap-3">
          <button className="btn btn-dark" title="Session" onClick={onStartSession}>
            <i className="bi bi-person-lines-fill"></i>
            <span className={`sidebar-label ms-2${expanded ? '' : ' d-none'}`}>New Session</span>
          </button>
          <button className="btn btn-dark" title="Configure Map">
            <i className="bi bi-gear"></i>
            <span className={`sidebar-label ms-2${expanded ? '' : ' d-none'}`}>Configure Map</span>
          </button>
        </div>
      </div>
      <div className="pb-3 d-flex flex-column align-items-center">
        <button className="btn btn-dark" id="logout-btn" title="Logout" onClick={onLogout}>
          <i className="bi bi-box-arrow-right"></i>
          <span className={`sidebar-label ms-2${expanded ? '' : ' d-none'}`}>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
