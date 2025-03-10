// src/components/DashboardManager.js - Fixed version
import React, { useState, useEffect } from 'react';
import DashboardList from './DashboardList';
import DashboardEditor from './DashboardEditor';
import { getDashboards } from '../utils/dashboardUtils';
import { Alert, Container, Spinner } from 'react-bootstrap';

const DashboardManager = () => {
  const [selectedDashboardId, setSelectedDashboardId] = useState(null);
  const [dashboards, setDashboards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Load dashboards when component mounts
  useEffect(() => {
    console.log('DashboardManager: Loading dashboards');
    loadDashboards();
  }, []);
  
  // Function to load dashboards
  const loadDashboards = () => {
    setLoading(true);
    setError(null);
    
    try {
      const loadedDashboards = getDashboards();
      console.log('DashboardManager: Loaded dashboards', loadedDashboards.length);
      
      setDashboards(loadedDashboards);
      
      // Only set error if we specifically want to show a message
      // Don't show error just because there are no dashboards
      if (loadedDashboards.length === 0) {
        console.log('No dashboards found in storage');
      }
    } catch (err) {
      console.error('Error loading dashboards in DashboardManager:', err);
      setError('Failed to load dashboards. Please check your browser storage.');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle dashboard selection
  const handleSelectDashboard = (dashboardId) => {
    console.log(`DashboardManager: Selecting dashboard with ID: ${dashboardId}`);
    
    if (!dashboardId) {
      console.error('Invalid dashboard ID');
      setError('Invalid dashboard selection.');
      return;
    }
    
    // Verify the dashboard exists before selecting
    const dashboard = dashboards.find(d => d.id === dashboardId);
    
    if (dashboard) {
      setSelectedDashboardId(dashboardId);
      setError(null);
    } else {
      console.error(`Dashboard with ID ${dashboardId} not found`);
      setError(`Dashboard not found. It may have been deleted.`);
    }
  };
  
  // Handle going back to dashboard list
  const handleBackToDashboards = () => {
    console.log('DashboardManager: Returning to dashboard list');
    setSelectedDashboardId(null);
    
    // Reload dashboards when returning to the list
    // This ensures the list is up-to-date with any changes made in the editor
    loadDashboards();
  };
  
  // Handle dashboard refresh - called after operations that modify dashboards
  const handleDashboardsChanged = () => {
    console.log('DashboardManager: Dashboards changed, refreshing list');
    loadDashboards();
  };
  
  // Show loading spinner
  if (loading) {
    return (
      <Container className="text-center mt-5">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Loading dashboards...</p>
      </Container>
    );
  }
  
  // If there's an error, show it along with the dashboard list
  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          <Alert.Heading>Error</Alert.Heading>
          <p>{error}</p>
        </Alert>
        
        <DashboardList 
          dashboards={dashboards}
          onSelectDashboard={handleSelectDashboard}
          onDashboardsChanged={handleDashboardsChanged}
        />
      </Container>
    );
  }
  
  // Show either the dashboard editor or the list depending on selection
  return (
    <div>
      {selectedDashboardId ? (
        <DashboardEditor 
          dashboardId={selectedDashboardId} 
          onBack={handleBackToDashboards}
        />
      ) : (
        <DashboardList 
          dashboards={dashboards}
          onSelectDashboard={handleSelectDashboard}
          onDashboardsChanged={handleDashboardsChanged}
        />
      )}
    </div>
  );
};

export default DashboardManager;
