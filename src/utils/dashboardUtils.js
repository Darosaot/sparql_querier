// src/utils/dashboardUtils.js

/**
 * Dashboard data model:
 * 
 * Dashboard: {
 *   id: string,
 *   name: string,
 *   description: string,
 *   dateCreated: string (ISO date),
 *   dateModified: string (ISO date),
 *   panels: Array<Panel>
 * }
 * 
 * Panel: {
 *   id: string,
 *   title: string,
 *   type: string (one of: 'table', 'line', 'bar', 'pie', 'stats'),
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
 *     operation?: string,
 *     groupBy?: string,
 *   }
 * }
 */

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
  
  if (filteredDashboards.length < dashboards.length) {
    // Dashboard was found and removed
    return saveDashboards(filteredDashboards);
  }
  
  return false; // Dashboard not found
};

// Create a new dashboard
export const createDashboard = (name, description = '') => {
  const now = new Date().toISOString();
  const dashboard = {
    id: `dashboard-${Date.now()}`,
    name,
    description,
    dateCreated: now,
    dateModified: now,
    panels: []
  };
  
  return saveDashboard(dashboard) ? dashboard : null;
};

// Create a new panel for a dashboard
export const createPanel = (dashboardId, title, type, query, visualization) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return null;
  }
  
  const panel = {
    id: `panel-${Date.now()}`,
    title,
    type,
    position: { x: 0, y: 0, w: 6, h: 4 }, // Default position
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
        dashboard.id = `dashboard-${Date.now()}`;
        
        // Update timestamps
        const now = new Date().toISOString();
        dashboard.dateImported = now;
        dashboard.dateModified = now;
        
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

// Share dashboard (generate a shareable URL)
export const shareDashboard = (dashboardId) => {
  // In a real application, this would involve server-side functionality
  // For this demo, we'll just generate a URL that would be used in the application
  
  const baseUrl = window.location.origin;
  const shareUrl = `${baseUrl}/dashboard/shared/${dashboardId}`;
  
  // Copy to clipboard
  navigator.clipboard.writeText(shareUrl)
    .then(() => {
      alert('Dashboard URL copied to clipboard!');
    })
    .catch(err => {
      console.error('Failed to copy URL:', err);
      alert(`Share URL: ${shareUrl}`);
    });
  
  return shareUrl;
};
