// src/components/DashboardManager.js
import React, { useState, useEffect } from 'react';
import DashboardList from './DashboardList';
import DashboardEditor from './DashboardEditor';
import { getDashboards } from '../utils/dashboardUtils';

const DashboardManager = () => {
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [error, setError] = useState(null);
  
  // Load dashboards when component mounts
  useEffect(() => {
    try {
      console.log('DashboardManager: Attempting to load dashboards');
      const loadedDashboards = getDashboards();
      console.log('DashboardManager: Loaded dashboards', loadedDashboards);
      
      if (loadedDashboards.length === 0) {
        console.warn('No dashboards found in storage');
        setError('No dashboards available. Create your first dashboard!');
      }
      
      setDashboards(loadedDashboards);
    } catch (err) {
      console.error('Error loading dashboards in DashboardManager:', err);
      setError('Failed to load dashboards. Please check your browser storage.');
    }
  }, []);
  
  // Handle dashboard selection
  const handleSelectDashboard = (dashboardId) => {
    console.log(`DashboardManager: Selecting dashboard with ID: ${dashboardId}`);
    
    // Verify the dashboard exists before selecting
    const dashboard = dashboards.find(d => d.id === dashboardId);
    
    if (dashboard) {
      setSelectedDashboardId(dashboardId);
    } else {
      console.error(`Dashboard with ID ${dashboardId} not found`);
      setError(`Dashboard not found. Please create a new dashboard.`);
    }
  };
  
  // Handle going back to dashboard list
  const handleBackToDashboards = () => {
    console.log('DashboardManager: Returning to dashboard list');
    setSelectedDashboardId(null);
    setError(null);
  };
  
  // If no dashboards, show error or list
  if (error) {
    return (
      <div className="container mt-4">
        <div className="alert alert-warning">
          {error}
          <hr />
          <DashboardList 
            onSelectDashboard={handleSelectDashboard}
          />
        </div>
      </div>
    );
  }
  
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
