// src/utils/dashboardUtils.js - Fixed version
import { v4 as uuidv4 } from 'uuid';

// Map to track scheduled refreshes
const scheduledRefreshes = new Map();

// Storage key for dashboards
const DASHBOARDS_STORAGE_KEY = 'dashboards';

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

// Validate panel structure
const isValidPanel = (panel) => {
  if (!panel || typeof panel !== 'object') return false;
  if (!panel.id || typeof panel.id !== 'string') return false;
  if (!panel.title || typeof panel.title !== 'string') return false;
  if (!panel.type || typeof panel.type !== 'string') return false;
  
  // Check if position exists and has valid properties
  if (!panel.position || typeof panel.position !== 'object') {
    return false;
  }
  
  const { x, y, w, h } = panel.position;
  if (typeof x !== 'number' || typeof y !== 'number' ||
      typeof w !== 'number' || typeof h !== 'number') {
    return false;
  }
  
  return true;
};

// Validate dashboard structure
const isValidDashboard = (dashboard) => {
  if (!dashboard || typeof dashboard !== 'object') return false;
  if (!dashboard.id || typeof dashboard.id !== 'string') return false;
  if (!dashboard.name || typeof dashboard.name !== 'string') return false;
  if (!Array.isArray(dashboard.panels)) return false;
  if (!dashboard.dateCreated || typeof dashboard.dateCreated !== 'string') return false;
  if (!dashboard.dateModified || typeof dashboard.dateModified !== 'string') return false;

  // Validate each panel
  const invalidPanels = dashboard.panels.filter(panel => !isValidPanel(panel));
  if (invalidPanels.length > 0) {
    logger.warn('Dashboard contains invalid panels', invalidPanels);
  }

  return true;
};

// Fix potential issues with dashboard data
const sanitizeDashboard = (dashboard) => {
  if (!dashboard) return null;
  
  try {
    // Ensure all required fields exist
    const sanitized = {
      ...dashboard,
      id: dashboard.id || `dashboard-${uuidv4()}`,
      name: dashboard.name || 'Unnamed Dashboard',
      description: dashboard.description || '',
      dateCreated: dashboard.dateCreated || new Date().toISOString(),
      dateModified: dashboard.dateModified || new Date().toISOString(),
      refreshInterval: dashboard.refreshInterval || 0,
      panels: []
    };
    
    // Sanitize each panel
    if (Array.isArray(dashboard.panels)) {
      sanitized.panels = dashboard.panels
        .filter(panel => panel && typeof panel === 'object')
        .map((panel, index) => {
          // Ensure position is valid and contains numerical values
          const defaultPosition = { x: 0, y: index * 4, w: 12, h: 4 };
          
          let position = defaultPosition;
          if (panel.position && 
              typeof panel.position === 'object' &&
              panel.position.x !== undefined &&
              panel.position.y !== undefined &&
              panel.position.w !== undefined &&
              panel.position.h !== undefined) {
            
            // Convert position values to numbers
            position = {
              x: Number(panel.position.x || 0),
              y: Number(panel.position.y || index * 4),
              w: Number(panel.position.w || 12),
              h: Number(panel.position.h || 4)
            };
          }
            
          return {
            ...panel,
            id: panel.id || `panel-${uuidv4()}`,
            title: panel.title || 'Unnamed Panel',
            type: panel.type || 'table',
            position: position,
            query: panel.query || {},
            visualization: panel.visualization || {}
          };
        });
    }
    
    return sanitized;
  } catch (err) {
    logger.error('Error sanitizing dashboard', err);
    return null;
  }
};

// Get all dashboards from localStorage with robust error handling
export const getDashboards = () => {
  try {
    const dashboardsJson = localStorage.getItem(DASHBOARDS_STORAGE_KEY);
    
    logger.log('Retrieving dashboards from localStorage', {
      hasStoredData: !!dashboardsJson
    });

    if (!dashboardsJson) {
      logger.warn('No dashboards found in localStorage');
      return [];
    }

    try {
      const dashboards = JSON.parse(dashboardsJson);
      
      if (!Array.isArray(dashboards)) {
        logger.error('Stored dashboards data is not an array', dashboards);
        localStorage.removeItem(DASHBOARDS_STORAGE_KEY);
        return [];
      }
      
      // Validate and sanitize dashboards
      const sanitizedDashboards = dashboards
        .filter(d => d && typeof d === 'object')
        .map(sanitizeDashboard)
        .filter(Boolean);
      
      logger.log('Parsed dashboards', {
        totalCount: dashboards.length,
        validCount: sanitizedDashboards.length
      });

      // If there are invalid dashboards, update localStorage
      if (sanitizedDashboards.length !== dashboards.length) {
        logger.warn('Some dashboards were invalid and fixed or removed', {
          removedCount: dashboards.length - sanitizedDashboards.length
        });
        localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(sanitizedDashboards));
      }

      return sanitizedDashboards;
    } catch (parseError) {
      logger.error('Failed to parse dashboards JSON', {
        errorMessage: parseError.message
      });
      
      // Clear corrupted localStorage data
      localStorage.removeItem(DASHBOARDS_STORAGE_KEY);
      
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

// Save dashboards to localStorage with error handling
export const saveDashboards = (dashboards) => {
  try {
    if (!Array.isArray(dashboards)) {
      logger.error('Cannot save dashboards: dashboards is not an array', dashboards);
      return false;
    }
    
    // Sanitize dashboards before saving
    const sanitizedDashboards = dashboards
      .filter(d => d && typeof d === 'object')
      .map(sanitizeDashboard)
      .filter(Boolean);

    logger.log('Saving dashboards to localStorage', {
      totalDashboards: dashboards.length,
      validDashboards: sanitizedDashboards.length
    });

    // If invalid dashboards were found, log a warning
    if (sanitizedDashboards.length !== dashboards.length) {
      logger.warn('Some dashboards were invalid and fixed or removed', {
        removedCount: dashboards.length - sanitizedDashboards.length
      });
    }

    localStorage.setItem(DASHBOARDS_STORAGE_KEY, JSON.stringify(sanitizedDashboards));
    return true;
  } catch (error) {
    logger.error('Error saving dashboards', {
      errorMessage: error.message,
      errorStack: error.stack,
      dashboardCount: dashboards?.length
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

  try {
    const dashboards = getDashboards();
    const dashboard = dashboards.find(dashboard => dashboard.id === dashboardId);

    if (!dashboard) {
      logger.warn(`No dashboard found with ID: ${dashboardId}`);
      return null;
    }
    
    // Sanitize the dashboard to fix any issues
    const sanitizedDashboard = sanitizeDashboard(dashboard);
    
    logger.log('Dashboard found', { 
      dashboardId, 
      name: sanitizedDashboard.name,
      panelCount: sanitizedDashboard.panels.length 
    });

    return sanitizedDashboard;
  } catch (err) {
    logger.error(`Error retrieving dashboard ${dashboardId}`, err);
    return null;
  }
};

// Create a new dashboard
export const createDashboard = (name, description = '') => {
  // Validate input
  if (!name || name.trim() === '') {
    logger.error('Cannot create dashboard: Name is required');
    return null;
  }

  try {
    const now = new Date().toISOString();
    const dashboardId = `dashboard-${uuidv4()}`;
    
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
      name: dashboard.name
    });

    const saveResult = saveDashboard(dashboard);
    
    if (!saveResult) {
      logger.error('Failed to save newly created dashboard');
      return null;
    }

    return dashboard;
  } catch (err) {
    logger.error('Error creating dashboard', err);
    return null;
  }
};

// Save or update a dashboard
export const saveDashboard = (dashboard) => {
  if (!dashboard || typeof dashboard !== 'object') {
    logger.error('Cannot save dashboard: Invalid dashboard object');
    return false;
  }

  try {
    // Sanitize dashboard before saving
    const sanitizedDashboard = sanitizeDashboard(dashboard);
    
    if (!sanitizedDashboard) {
      logger.error('Cannot save dashboard: Sanitization failed');
      return false;
    }
    
    const dashboards = getDashboards();
    const index = dashboards.findIndex(d => d.id === sanitizedDashboard.id);
    
    // Update the modified date
    const updatedDashboard = {
      ...sanitizedDashboard,
      dateModified: new Date().toISOString()
    };
    
    if (index >= 0) {
      // Update existing dashboard
      dashboards[index] = updatedDashboard;
      logger.log('Updating existing dashboard', { 
        dashboardId: updatedDashboard.id,
        name: updatedDashboard.name,
        panelCount: updatedDashboard.panels.length
      });
    } else {
      // Add new dashboard
      dashboards.push(updatedDashboard);
      logger.log('Adding new dashboard', { 
        dashboardId: updatedDashboard.id,
        name: updatedDashboard.name
      });
    }
    
    const saveResult = saveDashboards(dashboards);
    
    if (!saveResult) {
      logger.error('Failed to save dashboard to localStorage');
      return false;
    }

    return true;
  } catch (error) {
    logger.error('Unexpected error in saveDashboard', {
      errorMessage: error.message,
      errorStack: error.stack,
      dashboardId: dashboard?.id
    });
    return false;
  }
};

// Create a panel and add it to a dashboard
export const createPanel = (
  dashboardId, 
  title, 
  type, 
  query, 
  visualization, 
  position = null,
  size = null
) => {
  logger.log('Attempting to create panel', {
    dashboardId,
    title,
    type
  });

  try {
    const dashboard = getDashboardById(dashboardId);
    
    if (!dashboard) {
      logger.error('Cannot create panel: Dashboard not found', { dashboardId });
      return null;
    }
    
    const panelId = `panel-${uuidv4()}`;
    
    // Use default size if not provided
    const panelSize = size || {
      width: 'full',
      height: 'medium'
    };
    
    const panel = {
      id: panelId,
      title: title || 'New Panel',
      type: type || 'table',
      query: query || {},
      visualization: visualization || {},
      size: panelSize
    };
    
    // Create a shallow copy of the dashboard to avoid reference issues
    const updatedDashboard = {
      ...dashboard,
      panels: [...dashboard.panels, panel]
    };
    
    const saveResult = saveDashboard(updatedDashboard);
    
    if (!saveResult) {
      logger.error('Failed to save panel to dashboard', { panelId, dashboardId });
      return null;
    }
    
    logger.log('Panel created successfully', { panelId, dashboardId });
    
    return panel;
  } catch (err) {
    logger.error('Error creating panel', err);
    return null;
  }
};

// Delete a dashboard
export const deleteDashboard = (dashboardId) => {
  logger.log('Attempting to delete dashboard', { dashboardId });
  
  try {
    if (!dashboardId) {
      logger.error('Cannot delete: Invalid dashboard ID');
      return false;
    }
    
    const dashboards = getDashboards();
    const filteredDashboards = dashboards.filter(d => d.id !== dashboardId);
    
    // Check if dashboard was found and removed
    if (filteredDashboards.length === dashboards.length) {
      logger.warn(`Dashboard ${dashboardId} not found for deletion`);
      return false;
    }
    
    // Clear any scheduled refresh for this dashboard
    if (scheduledRefreshes.has(dashboardId)) {
      clearInterval(scheduledRefreshes.get(dashboardId));
      scheduledRefreshes.delete(dashboardId);
    }
    
    const result = saveDashboards(filteredDashboards);
    
    if (!result) {
      logger.error('Failed to save dashboards after deletion', { dashboardId });
      return false;
    }
    
    logger.log('Dashboard deleted successfully', { dashboardId });
    return true;
  } catch (err) {
    logger.error('Error deleting dashboard', err);
    return false;
  }
};

// Delete a panel from a dashboard
export const deletePanel = (dashboardId, panelId) => {
  logger.log('Attempting to delete panel', { dashboardId, panelId });
  
  try {
    if (!dashboardId || !panelId) {
      logger.error('Cannot delete panel: Missing dashboard ID or panel ID');
      return false;
    }
    
    const dashboard = getDashboardById(dashboardId);
    
    if (!dashboard) {
      logger.error('Cannot delete panel: Dashboard not found', { dashboardId });
      return false;
    }
    
    // Check if panel exists
    const panelIndex = dashboard.panels.findIndex(panel => panel.id === panelId);
    
    if (panelIndex === -1) {
      logger.warn(`Panel ${panelId} not found in dashboard ${dashboardId}`);
      return false;
    }
    
    // Filter out the panel to delete
    dashboard.panels = dashboard.panels.filter(panel => panel.id !== panelId);
    
    // Save the updated dashboard
    const result = saveDashboard(dashboard);
    
    if (!result) {
      logger.error('Failed to save dashboard after panel deletion', { dashboardId, panelId });
      return false;
    }
    
    logger.log('Panel deleted successfully', { dashboardId, panelId });
    return true;
  } catch (err) {
    logger.error('Error deleting panel', err);
    return false;
  }
};

// Schedule automatic dashboard refresh
export const scheduleDashboardRefresh = (dashboardId, intervalMinutes) => {
  logger.log('Setting refresh schedule', { dashboardId, intervalMinutes });
  
  try {
    // Clear any existing interval
    if (scheduledRefreshes.has(dashboardId)) {
      clearInterval(scheduledRefreshes.get(dashboardId));
      scheduledRefreshes.delete(dashboardId);
      logger.log('Cleared existing refresh schedule', { dashboardId });
    }
    
    if (!intervalMinutes || intervalMinutes <= 0) {
      // If interval is 0 or negative, just clear the interval
      logger.log('No refresh schedule set (interval <= 0)', { dashboardId });
      return true;
    }
    
    // Get dashboard to update its refresh interval
    const dashboard = getDashboardById(dashboardId);
    
    if (!dashboard) {
      logger.error('Cannot set refresh schedule: Dashboard not found', { dashboardId });
      return false;
    }
    
    // Update dashboard with refresh interval
    dashboard.refreshInterval = intervalMinutes;
    saveDashboard(dashboard);
    
    // Create a new interval
    const intervalId = setInterval(() => {
      logger.log(`Auto-refreshing dashboard ${dashboardId}`);
      
      // Find all panel refresh buttons in this dashboard and click them
      const panelElements = document.querySelectorAll(`[data-panel-refresh]`);
      panelElements.forEach(element => {
        element.click();
      });
    }, intervalMinutes * 60 * 1000);
    
    // Store the interval ID
    scheduledRefreshes.set(dashboardId, intervalId);
    
    logger.log('Refresh schedule set successfully', { dashboardId, intervalMinutes });
    return true;
  } catch (err) {
    logger.error('Error setting refresh schedule', err);
    return false;
  }
};

// Export dashboard to JSON file
export const exportDashboard = (dashboardId) => {
  logger.log('Exporting dashboard', { dashboardId });
  
  try {
    if (!dashboardId) {
      logger.error('Cannot export: Invalid dashboard ID');
      return null;
    }
    
    const dashboard = getDashboardById(dashboardId);
    
    if (!dashboard) {
      logger.error('Cannot export: Dashboard not found', { dashboardId });
      return null;
    }
    
    // Create a sanitized copy for export
    const exportDashboard = sanitizeDashboard(dashboard);
    
    const dataStr = JSON.stringify(exportDashboard, null, 2);
    const dataUri = `data:application/json;charset=utf-8,${encodeURIComponent(dataStr)}`;
    
    const exportFileDefaultName = `${exportDashboard.name.replace(/\s+/g, '_')}_dashboard.json`;
    
    // Create a link element and trigger download
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
    
    logger.log('Dashboard exported successfully', { dashboardId });
    return true;
  } catch (err) {
    logger.error('Error exporting dashboard', err);
    return null;
  }
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
