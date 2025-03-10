// src/components/DashboardManager.js
import React, { useState } from 'react';
import DashboardList from './DashboardList';
import DashboardEditor from './DashboardEditor';

const DashboardManager = () => {
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  
  // Handle dashboard selection
  const handleSelectDashboard = (dashboardId) => {
    setSelectedDashboardId(dashboardId);
  };
  
  // Handle going back to dashboard list
  const handleBackToDashboards = () => {
    setSelectedDashboardId(null);
  };
  
  return (
    <div>
      {selectedDashboardId ? (
        <DashboardEditor 
          dashboardId={selectedDashboardId} 
          onBack={handleBackToDashboards}
        />
      ) : (
        <DashboardList 
          onSelectDashboard={handleSelectDashboard}
        />
      )}
    </div>
  );
};

export default DashboardManager;
