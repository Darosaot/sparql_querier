// src/utils/dashboardUtils.js
import { v4 as uuidv4 } from 'uuid';

// Map to track scheduled refreshes
const scheduledRefreshes = new Map();

// Enhanced logging utility
const logger = {
  log: (message, ...args) => {
    console.log(`[DashboardUtils] ${message}`, ...args);
  },
  error: (message, ...args) => {
    console.error(`[DashboardUtils] ${message}`, ...args);
  },
  warn: (message, ...args) => {
    console.warn(`[DashboardUtils] ${message}`, ...args);
  }
};

// Validate dashboard structure
const isValidDashboard = (dashboard) => {
  return !!(
    dashboard && 
    typeof dashboard === 'object' &&
    dashboard.id && 
    dashboard.name && 
    Array.isArray(dashboard.panels) &&
    typeof dashboard.dateCreated === 'string' &&
    typeof dashboard.dateModified === 'string'
  );
};

// Get all dashboards from localStorage
export const getDashboards = () => {
  try {
    const dashboardsJson = localStorage.getItem('dashboards');
    
    logger.log('Retrieving dashboards from localStorage', {
      hasStoredData: !!dashboardsJson
    });

    if (!dashboardsJson) {
      logger.warn('No dashboards found in localStorage');
      return [];
    }

    try {
      const dashboards = JSON.parse(dashboardsJson);
      
      // Validate and filter dashboards
      const validDashboards = dashboards.filter(isValidDashboard);
      
      logger.log('Parsed dashboards', {
        totalCount: dashboards.length,
        validCount: validDashboards.length,
        validDashboardIds: validDashboards.map(d => d.id)
      });

      // If there are invalid dashboards, update localStorage
      if (validDashboards.length !== dashboards.length) {
        logger.warn('Some dashboards were invalid and removed', {
          removedCount: dashboards.length - validDashboards.length
        });
        localStorage.setItem('dashboards', JSON.stringify(validDashboards));
      }

      return validDashboards;
    } catch (parseError) {
      logger.error('Failed to parse dashboards JSON', {
        errorMessage: parseError.message,
        storedData: dashboardsJson
      });
      
      // Clear corrupted localStorage data
      localStorage.removeItem('dashboards');
      
      return [];
    }
  } catch (error) {
    logger.error('Unexpected error in getDashboards', {
      errorMessage: error.message,
      errorStack: error.stack
    });
    return [];
  }
};

// Save dashboards to localStorage
export const saveDashboards = (dashboards) => {
  try {
    // Validate dashboards before saving
    const validDashboards = dashboards.filter(isValidDashboard);

    logger.log('Saving dashboards to localStorage', {
      totalDashboards: dashboards.length,
      validDashboards: validDashboards.length,
      dashboardIds: validDashboards.map(d => d.id)
    });

    // If invalid dashboards were found, log a warning
    if (validDashboards.length !== dashboards.length) {
      logger.warn('Some dashboards were invalid and not saved', {
        removedCount: dashboards.length - validDashboards.length
      });
    }

    localStorage.setItem('dashboards', JSON.stringify(validDashboards));
    return true;
  } catch (error) {
    logger.error('Error saving dashboards', {
      errorMessage: error.message,
      errorStack: error.stack,
      dashboardCount: dashboards.length
    });
    return false;
  }
};

// Get a single dashboard by ID
export const getDashboardById = (dashboardId) => {
  if (!dashboardId) {
    logger.warn('Attempted to get dashboard with empty ID');
    return null;
  }

  logger.log('Attempting to get dashboard by ID', { dashboardId });

  const dashboards = getDashboards();
  const dashboard = dashboards.find(dashboard => dashboard.id === dashboardId);

  if (!dashboard) {
    logger.warn(`No dashboard found with ID: ${dashboardId}`, {
      availableDashboardIds: dashboards.map(d => d.id)
    });
  } else {
    logger.log('Dashboard found', { 
      dashboardId, 
      name: dashboard.name,
      panelCount: dashboard.panels.length 
    });
  }

  return dashboard || null;
};

// Create a new dashboard
export const createDashboard = (name, description = '') => {
  // Validate input
  if (!name || name.trim() === '') {
    logger.error('Cannot create dashboard: Name is required');
    return null;
  }

  const now = new Date().toISOString();
  const dashboardId = `dashboard-${uuidv4()}`;  // This line generates the ID
  
  const dashboard = {
    id: dashboardId,
    name: name.trim(),
    description: description.trim(),
    dateCreated: now,
    dateModified: now,
    refreshInterval: 0,
    shareMode: 'none',
    shareToken: null,
    panels: []
  };
  
  logger.log('Creating new dashboard', {
    dashboardId,
    name: dashboard.name,
    description: dashboard.description
  });

  const saveResult = saveDashboard(dashboard);
  
  if (!saveResult) {
    logger.error('Failed to save newly created dashboard');
    return null;
  }

  return dashboard;
};

// Save or update a dashboard
export const saveDashboard = (dashboard) => {
  if (!isValidDashboard(dashboard)) {
    logger.error('Cannot save dashboard: Invalid dashboard object', { 
      dashboard,
      validationResult: isValidDashboard(dashboard)
    });
    return false;
  }

  try {
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
      logger.log('Updating existing dashboard', { 
        dashboardId: dashboard.id,
        name: dashboard.name,
        panelCount: dashboard.panels.length
      });
    } else {
      // Add new dashboard
      dashboards.push(updatedDashboard);
      logger.log('Adding new dashboard', { 
        dashboardId: dashboard.id,
        name: dashboard.name,
        panelCount: dashboard.panels.length
      });
    }
    
    const saveResult = saveDashboards(dashboards);
    
    if (!saveResult) {
      logger.error('Failed to save dashboard to localStorage');
    }

    return saveResult;
  } catch (error) {
    logger.error('Unexpected error in saveDashboard', {
      errorMessage: error.message,
      errorStack: error.stack,
      dashboard
    });
    return false;
  }
};

// The rest of the existing methods remain the same, 
// but you can add similar logging to them if desired

// Example of additional logging for other methods
export const createPanel = (
  dashboardId, 
  title, 
  type, 
  query, 
  visualization, 
  position = null
) => {
  logger.log('Attempting to create panel', {
    dashboardId,
    title,
    type,
    query,
    position
  });

  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    logger.error('Cannot create panel: Dashboard not found', { dashboardId });
    return null;
  }
  
  const panelId = `panel-${uuidv4()}`;
  
  // Determine the best position for the new panel
  let maxY = 0;
  if (dashboard.panels && dashboard.panels.length > 0) {
    dashboard.panels.forEach(existingPanel => {
      const panelPosition = existingPanel.position || { y: 0, h: 4 };
      const panelBottom = panelPosition.y + panelPosition.h;
      if (panelBottom > maxY) {
        maxY = panelBottom;
      }
    });
  }
  
  // Use provided position or create a position below existing panels
  const finalPosition = position || { x: 0, y: maxY, w: 12, h: 4 };
  
  const panel = {
    id: panelId,
    title,
    type,
    position: finalPosition,
    query,
    visualization
  };
  
  dashboard.panels.push(panel);
  
  const saveResult = saveDashboard(dashboard);
  
  if (!saveResult) {
    logger.error('Failed to save panel to dashboard', { panelId, dashboardId });
    return null;
  }
  
  logger.log('Panel created successfully', { panelId, dashboardId });
  
  return panel;
};

// Keep the rest of the existing methods from the original file

// Ensure error logging is consistent throughout other methods
export const deleteDashboard = (dashboardId) => {
  logger.log('Attempting to delete dashboard', { dashboardId });
  
  const dashboards = getDashboards();
  const filteredDashboards = dashboards.filter(d => d.id !== dashboardId);
  
  // Clear any scheduled refresh for this dashboard
  if (scheduledRefreshes.has(dashboardId)) {
    clearInterval(scheduledRefreshes.get(dashboardId));
    scheduledRefreshes.delete(dashboardId);
  }
  
  const result = filteredDashboards.length < dashboards.length 
    ? saveDashboards(filteredDashboards)
    : false;
  
  if (!result) {
    logger.error('Failed to delete dashboard', { dashboardId });
  }
  
  return result;
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


// Delete a panel from a dashboard
export const deletePanel = (dashboardId, panelId) => {
  const dashboard = getDashboardById(dashboardId);
  
  if (!dashboard) {
    return false;
  }
  
  // Filter out the panel to delete
  dashboard.panels = dashboard.panels.filter(panel => panel.id !== panelId);
  
  // Save the updated dashboard
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
