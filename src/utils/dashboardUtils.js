// src/utils/dashboardUtils.js
import { v4 as uuidv4 } from 'uuid';

/**
 * Enhanced Dashboard data model:
 * 
 * Dashboard: {
 *   id: string,
 *   name: string,
 *   description: string,
 *   dateCreated: string (ISO date),
 *   dateModified: string (ISO date),
 *   refreshInterval: number (minutes, 0 = disabled),
 *   shareMode: string (none|view|edit),
 *   shareToken: string (for public access),
 *   panels: Array<Panel>
 * }
 * 
 * Panel: {
 *   id: string,
 *   title: string,
 *   type: string (one of: 'table', 'line', 'bar', 'pie', 'scatter', 'bubble', 'network', 'stats'),
 *   position: { x: number, y: number, w: number, h: number },
 *   query: {
 *     endpoint: string,
 *     sparql: string,
 *   },
 *   visualization: {
 *     columns: string[],
 *     xAxis?: string,
 *     yAxis?: string,
 *     color?: string,
 *     sizeMetric?: string,
 *     colorMetric?: string,
 *     operation?: string,
 *     groupBy?: string,
 *   }
 * }
 */

// Map to track scheduled refreshes
const scheduledRefreshes = new Map();

// Get all dashboards from localStorage
export const getDashboards = () => {
  try {
    const dashboardsJson = localStorage.getItem('dashboards');
    return dashboardsJson ? JSON.parse(dashboardsJson) : [];
  } catch (error) {
    console.error('Error loading dashboards:', error);
    return [];
  }
};

// Save dashboards to localStorage
export const saveDashboards = (dashboards) => {
  try {
    localStorage.setItem('dashboards', JSON.stringify(dashboards));
    return true;
  } catch (error) {
    console.error('Error saving dashboards:', error);
    return false;
  }
};

// Get a single dashboard by ID
export const getDashboardById = (dashboardId) => {
  const dashboards = getDashboards();
  return dashboards.find(dashboard => dashboard.id === dashboardId) || null;
};

// Get a dashboard by share token
export const getDashboardByShareToken = (shareToken) => {
  const dashboards = getDashboards();
  return dashboards.find(dashboard => dashboard.shareToken === shareToken) || null;
};

// Save or update a dashboard
export const saveDashboard = (dashboard) => {
  const dashboards = getDashboards();
  const index = dashboards.findIndex(d => d.id === dashboard.id);
  
  // Update the modified date
  const updatedDashboard = {
    ...dashboard,
    dateModified: new Date().toISOString()
  };
  
  if (index >= 0) {
    // Update existing dashboard
    dashboards[index] = updatedDashboard;
  } else {
    // Add new dashboard
    dashboards.push(updatedDashboard);
  }
  
  return saveDashboards(dashboards);
};

// Delete a dashboard by ID
export const deleteDashboard = (dashboardId) => {
  const dashboards = getDashboards();
  const filteredDashboards = dashboards.filter(d => d.id !== dashboardId);
  
  // Clear any scheduled refresh for this dashboard
  if (scheduledRefreshes.has(dashboardId)) {
    clearInterval(scheduledRefreshes.get(dashboardId));
    scheduledRefreshes.delete(dashboardId);
  }
  
  if (filteredDashboards.length < dashboards.length) {
    // Dashboard was found and removed
    return saveDashboards(filteredDashboards);
  }
  
  return false; // Dashboard not found
};

// Create a new dashboard
export const createDashboard = (name, description = '') => {
  const now = new Date().toISOString();
  const dashboardId = `dashboard-${uuidv4()}`;
  
  const dashboard = {
    id: dashboardId,
    name,
    description,
    dateCreated: now,
    dateModified: now,
    refreshInterval: 0,
    shareMode: 'none',
    shareToken: null,
    panels: []
  };
  
  return saveDashboard(dashboard) ? dashboard : null;
};

// Create a new panel for a dashboard
export const createPanel = (
  dashboardId, 
  title, 
  type, 
  query, 
  visualization, 
  position = { x: 0, y: 0, w: 6, h: 4 }
) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return null;
  }
  
  const panelId = `panel-${uuidv4()}`;
  
  const panel = {
    id: panelId,
    title,
    type,
    position,
    query,
    visualization
  };
  
  dashboard.panels.push(panel);
  saveDashboard(dashboard);
  
  return panel;
};

// Update panel position
export const updatePanelPosition = (dashboardId, panelId, position) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return false;
  }
  
  const panelIndex = dashboard.panels.findIndex(p => p.id === panelId);
  
  if (panelIndex === -1) {
    return false;
  }
  
  dashboard.panels[panelIndex].position = {...position};
  return saveDashboard(dashboard);
};

// Delete a panel
export const deletePanel = (dashboardId, panelId) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return false;
  }
  
  dashboard.panels = dashboard.panels.filter(p => p.id !== panelId);
  return saveDashboard(dashboard);
};

// Update panel configuration
export const updatePanel = (dashboardId, panelId, updates) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return false;
  }
  
  const panelIndex = dashboard.panels.findIndex(p => p.id === panelId);
  
  if (panelIndex === -1) {
    return false;
  }
  
  dashboard.panels[panelIndex] = {
    ...dashboard.panels[panelIndex],
    ...updates
  };
  
  return saveDashboard(dashboard);
};

// Schedule automatic dashboard refresh
export const scheduleDashboardRefresh = (dashboardId, intervalMinutes) => {
  // Clear any existing interval
  if (scheduledRefreshes.has(dashboardId)) {
    clearInterval(scheduledRefreshes.get(dashboardId));
  }
  
  if (intervalMinutes <= 0) {
    // If interval is 0 or negative, just clear the interval
    scheduledRefreshes.delete(dashboardId);
    return true;
  }
  
  // Create a new interval
  const intervalId = setInterval(() => {
    console.log(`Auto-refreshing dashboard ${dashboardId}`);
    
    // Find all panel refresh buttons in this dashboard and click them
    const panelElements = document.querySelectorAll(`[data-panel-refresh]`);
    panelElements.forEach(element => {
      element.click();
    });
  }, intervalMinutes * 60 * 1000);
  
  // Store the interval ID
  scheduledRefreshes.set(dashboardId, intervalId);
  
  return true;
};

// Export dashboard to JSON file
export const exportDashboard = (dashboardId) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return null;
  }
  
  const dataStr = JSON.stringify(dashboard, null, 2);
  const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
  
  const exportFileDefaultName = `${dashboard.name.replace(/\s+/g, '_')}_dashboard.json`;
  
  const linkElement = document.createElement('a');
  linkElement.setAttribute('href', dataUri);
  linkElement.setAttribute('download', exportFileDefaultName);
  linkElement.click();
  
  return true;
};

// Import dashboard from JSON file
export const importDashboard = async (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      try {
        const dashboard = JSON.parse(event.target.result);
        
        // Validate minimal dashboard structure
        if (!dashboard.name || !Array.isArray(dashboard.panels)) {
          reject(new Error('Invalid dashboard file format'));
          return;
        }
        
        // Generate a new ID to avoid conflicts
        dashboard.id = `dashboard-${uuidv4()}`;
        
        // Generate new IDs for panels too
        dashboard.panels = dashboard.panels.map(panel => ({
          ...panel,
          id: `panel-${uuidv4()}`
        }));
        
        // Update timestamps
        const now = new Date().toISOString();
        dashboard.dateImported = now;
        dashboard.dateModified = now;
        
        // Reset sharing settings
        dashboard.shareMode = 'none';
        dashboard.shareToken = null;
        
        if (saveDashboard(dashboard)) {
          resolve(dashboard);
        } else {
          reject(new Error('Failed to save imported dashboard'));
        }
      } catch (error) {
        reject(new Error(`Failed to parse dashboard file: ${error.message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Error reading the dashboard file'));
    };
    
    reader.readAsText(file);
  });
};

// Share dashboard (generate a shareable URL and token)
export const shareDashboard = (dashboardId, mode = 'view') => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return null;
  }
  
  // Generate a share token if one doesn't exist or if mode changed
  if (!dashboard.shareToken || dashboard.shareMode !== mode) {
    dashboard.shareToken = `${uuidv4()}-${Date.now()}`;
    dashboard.shareMode = mode;
    saveDashboard(dashboard);
  }
  
  // Generate the share URL
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/shared/${dashboard.shareToken}`;
  
  return shareUrl;
};

// Duplicate dashboard
export const duplicateDashboard = (dashboardId) => {
  const originalDashboard = getDashboardById(dashboardId);
  
  if (!originalDashboard) {
    return null;
  }
  
  const now = new Date().toISOString();
  const newDashboardId = `dashboard-${uuidv4()}`;
  
  // Create a copy with new IDs
  const newDashboard = {
    ...originalDashboard,
    id: newDashboardId,
    name: `${originalDashboard.name} (Copy)`,
    dateCreated: now,
    dateModified: now,
    shareMode: 'none',
    shareToken: null,
    panels: originalDashboard.panels.map(panel => ({
      ...panel,
      id: `panel-${uuidv4()}`
    }))
  };
  
  return saveDashboard(newDashboard) ? newDashboard : null;
};

// Get all public dashboards
export const getPublicDashboards = () => {
  const dashboards = getDashboards();
  return dashboards.filter(dashboard => 
    dashboard.shareMode === 'view' || dashboard.shareMode === 'edit'
  );
};
