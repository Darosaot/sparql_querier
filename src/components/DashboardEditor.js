// src/components/DashboardEditor.js - Simplified version
import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Card, Button, Row, Col, Form, Alert, Modal, OverlayTrigger, Tooltip, Dropdown } from 'react-bootstrap';
import { 
  getDashboardById, 
  saveDashboard, 
  createPanel, 
  deletePanel, 
  shareDashboard,
  scheduleDashboardRefresh 
} from '../utils/dashboardUtils';
import { executeQuery } from '../api/sparqlService';
import DashboardPanel from './DashboardPanel';
import './DashboardEditor.css';

const DashboardEditor = ({ dashboardId, onBack }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddPanelModal, setShowAddPanelModal] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareMode, setShareMode] = useState('view');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  
  // Panel creation state
  const [newPanelTitle, setNewPanelTitle] = useState('');
  const [newPanelType, setNewPanelType] = useState('table');
  const [newPanelWidth, setNewPanelWidth] = useState('full'); // 'full', 'half', 'third'
  const [newPanelHeight, setNewPanelHeight] = useState('medium'); // 'small', 'medium', 'large'
  const [newPanelEndpoint, setNewPanelEndpoint] = useState('');
  const [newPanelQuery, setNewPanelQuery] = useState('');
  const [panelQueryError, setPanelQueryError] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1f77b4');
  
  // Load dashboard when component mounts or dashboardId changes
  useEffect(() => {
    console.log("Loading dashboard with ID:", dashboardId);
    loadDashboard();
  }, [dashboardId]);
  
  // Main function to load dashboard data
  const loadDashboard = () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log("Loading dashboard data from storage");
      const dashboardData = getDashboardById(dashboardId);
      
      if (dashboardData) {
        console.log("Dashboard loaded:", dashboardData.id, dashboardData.name, "with", dashboardData.panels.length, "panels");
        
        // Update state with the loaded dashboard
        setDashboard(dashboardData);
        setDashboardName(dashboardData.name);
        setDashboardDescription(dashboardData.description || '');
        setRefreshInterval(dashboardData.refreshInterval || 0);
        
        console.log("Dashboard state updated with panels:", dashboardData.panels.length);
      } else {
        console.error("Dashboard not found with ID:", dashboardId);
        setError('Dashboard not found. It may have been deleted.');
      }
    } catch (err) {
      console.error("Error loading dashboard:", err);
      setError(`Failed to load dashboard: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Handle saving dashboard changes
  const handleSaveDashboard = () => {
    if (!dashboardName.trim()) {
      setError('Dashboard name is required');
      return;
    }
    
    try {
      console.log('Saving dashboard updates for:', dashboard.id);
      const updatedDashboard = {
        ...dashboard,
        name: dashboardName,
        description: dashboardDescription,
        refreshInterval: refreshInterval
      };
      
      if (saveDashboard(updatedDashboard)) {
        console.log('Dashboard saved successfully');
        setDashboard(updatedDashboard);
        setEditMode(false);
        setError(null);
      } else {
        console.error('Dashboard save operation returned false');
        setError('Failed to save dashboard');
      }
    } catch (err) {
      console.error("Error saving dashboard:", err);
      setError(`Failed to save dashboard: ${err.message}`);
    }
  };
  
  // Handle deleting a panel
  const handleDeletePanel = (panelId) => {
    if (window.confirm('Are you sure you want to delete this panel?')) {
      try {
        console.log('Deleting panel:', panelId);
        
        // Delete from storage
        if (deletePanel(dashboardId, panelId)) {
          console.log('Panel deleted successfully from storage');
          // Reload dashboard to ensure state is in sync
          loadDashboard();
        } else {
          console.error('Failed to delete panel from storage');
          setError('Failed to delete panel.');
        }
      } catch (err) {
        console.error("Error deleting panel:", err);
        setError(`Failed to delete panel: ${err.message}`);
      }
    }
  };
  
  // Handle sharing the dashboard
  const handleShareDashboard = () => {
    try {
      console.log('Sharing dashboard with mode:', shareMode);
      const url = shareDashboard(dashboardId, shareMode);
      setShareUrl(url);
      setShowShareModal(true);
    } catch (err) {
      console.error("Error sharing dashboard:", err);
      setError(`Failed to share dashboard: ${err.message}`);
    }
  };
  
  // Handle setting a refresh schedule
  const handleSetRefreshSchedule = () => {
    try {
      console.log('Setting refresh interval to:', refreshInterval, 'minutes');
      const updatedDashboard = {
        ...dashboard,
        refreshInterval: refreshInterval
      };
      
      if (saveDashboard(updatedDashboard)) {
        console.log('Refresh schedule saved successfully');
        setDashboard(updatedDashboard);
        setShowRefreshModal(false);
        
        // Activate the refresh schedule if an interval is set
        if (refreshInterval > 0) {
          scheduleDashboardRefresh(dashboardId, refreshInterval);
        }
      } else {
        console.error('Failed to save refresh schedule');
        setError('Failed to set refresh schedule');
      }
    } catch (err) {
      console.error("Error setting refresh schedule:", err);
      setError(`Failed to set refresh schedule: ${err.message}`);
    }
  };
  
  // Test panel query
  const handleTestQuery = async () => {
    if (!newPanelEndpoint || !newPanelQuery) {
      setPanelQueryError('Please provide both endpoint and query');
      return;
    }
    
    console.log('Testing query against endpoint:', newPanelEndpoint);
    setQueryLoading(true);
    setPanelQueryError(null);
    
    try {
      const result = await executeQuery(newPanelEndpoint, newPanelQuery);
      
      if (result.success) {
        console.log('Query test successful, got', result.data.length, 'results');
        setQueryResults(result);
        // Set default X and Y axes if available
        if (result.columns.length > 0) {
          setXAxis(result.columns[0]);
          setYAxis(result.columns.length > 1 ? result.columns[1] : result.columns[0]);
        }
      } else {
        console.error('Query test failed:', result.error);
        setPanelQueryError(`Query failed: ${result.error}`);
        setQueryResults(null);
      }
    } catch (err) {
      console.error('Query test error:', err);
      setPanelQueryError(`Error executing query: ${err.message}`);
      setQueryResults(null);
    } finally {
      setQueryLoading(false);
    }
  };
  
  // Convert size selection to CSS classes
  const getPanelSizeClasses = (width, height) => {
    let widthClass = 'col-12'; // default full width
    let heightClass = 'panel-height-medium'; // default medium height
    
    // Set width class
    switch (width) {
      case 'half':
        widthClass = 'col-md-6';
        break;
      case 'third':
        widthClass = 'col-md-4';
        break;
      default:
        widthClass = 'col-12';
    }
    
    // Set height class
    switch (height) {
      case 'small':
        heightClass = 'panel-height-small';
        break;
      case 'large':
        heightClass = 'panel-height-large';
        break;
      default:
        heightClass = 'panel-height-medium';
    }
    
    return { widthClass, heightClass };
  };
  
  // Add new panel to dashboard
  const handleAddPanel = () => {
    if (!newPanelTitle.trim()) {
      setPanelQueryError('Panel title is required');
      return;
    }
    
    if (!newPanelEndpoint || !newPanelQuery) {
      setPanelQueryError('Please provide both endpoint and query');
      return;
    }
    
    if (!queryResults) {
      setPanelQueryError('Please test the query first');
      return;
    }
    
    try {
      console.log('Creating new panel:', newPanelTitle, 'of type:', newPanelType);
      
      const query = {
        endpoint: newPanelEndpoint,
        sparql: newPanelQuery
      };
      
      const visualization = {
        columns: queryResults.columns,
        xAxis: xAxis,
        yAxis: yAxis,
        color: selectedColor
      };
      
      // Store size information in the panel metadata
      const size = {
        width: newPanelWidth,
        height: newPanelHeight
      };
      
      const panel = createPanel(
        dashboardId,
        newPanelTitle,
        newPanelType,
        query,
        visualization,
        null, // No position needed for our simplified layout
        size   // Add size information
      );
      
      if (panel) {
        console.log('Panel created successfully:', panel.id);
        
        // Close modal and reset form
        setShowAddPanelModal(false);
        resetPanelForm();
        
        // Load the updated dashboard to see the new panel
        loadDashboard();
      } else {
        console.error('Panel creation failed');
        setPanelQueryError('Failed to create panel');
      }
    } catch (err) {
      console.error("Error adding panel:", err);
      setPanelQueryError(`Failed to add panel: ${err.message}`);
    }
  };
  
  // Reset panel creation form
  const resetPanelForm = () => {
    setNewPanelTitle('');
    setNewPanelType('table');
    setNewPanelWidth('full');
    setNewPanelHeight('medium');
    setNewPanelEndpoint('');
    setNewPanelQuery('');
    setPanelQueryError(null);
    setQueryResults(null);
    setXAxis('');
    setYAxis('');
    setSelectedColor('#1f77b4');
  };
  
  // Handle refreshing all panels
  const handleRefreshAllPanels = () => {
    console.log('Refreshing all panels');
    // Trigger refresh for all panels
    if (dashboard && dashboard.panels) {
      const panelElements = document.querySelectorAll('[data-panel-refresh]');
      console.log('Found', panelElements.length, 'refresh buttons');
      panelElements.forEach(element => {
        // Trigger a click event on each refresh button
        element.click();
      });
    }
  };
  
  // Show loading state
  if (loading) {
    return (
      <div className="text-center p-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading dashboard...</span>
        </div>
        <p className="mt-3">Loading dashboard...</p>
      </div>
    );
  }
  
  // Show error if dashboard not found
  if (error && !dashboard) {
    return (
      <Alert variant="danger">
        <Alert.Heading>Error</Alert.Heading>
        <p>{error}</p>
        <div className="mt-3">
          <Button variant="primary" onClick={onBack}>
            Back to Dashboard List
          </Button>
        </div>
      </Alert>
    );
  }
  
  // If no dashboard, show no data message
  if (!dashboard) {
    return (
      <Alert variant="warning">
        <Alert.Heading>No Dashboard Found</Alert.Heading>
        <p>The requested dashboard could not be found.</p>
        <div className="mt-3">
          <Button variant="primary" onClick={onBack}>
            Back to Dashboard List
          </Button>
        </div>
      </Alert>
    );
  }
  
  return (
    <div>
      <div className="dashboard-header mb-3">
        <div className="d-flex justify-content-between align-items-center flex-wrap">
          <div className="d-flex align-items-center mb-2 mb-md-0">
            <Button variant="outline-secondary" onClick={onBack} className="me-2">
              ← Back
            </Button>
            {editMode ? (
              <>
                <Button variant="success" onClick={handleSaveDashboard} className="me-2">
                  Save Changes
                </Button>
                <Button variant="outline-secondary" onClick={() => {
                  setEditMode(false);
                  setDashboardName(dashboard.name);
                  setDashboardDescription(dashboard.description || '');
                }}>
                  Cancel
                </Button>
              </>
            ) : (
              <Button variant="outline-primary" onClick={() => setEditMode(true)}>
                Edit Dashboard
              </Button>
            )}
          </div>
          <div className="dashboard-actions">
            <OverlayTrigger
              placement="top"
              overlay={<Tooltip>Refresh all panels</Tooltip>}
            >
              <Button 
                variant="outline-info" 
                className="me-2"
                onClick={handleRefreshAllPanels}
              >
                <i className="bi bi-arrow-clockwise"></i>
              </Button>
            </OverlayTrigger>
            
            <Dropdown className="d-inline me-2">
              <Dropdown.Toggle variant="outline-success" id="dropdown-share">
                Share
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => {
                  setShareMode('view');
                  handleShareDashboard();
                }}>
                  Share View Only
                </Dropdown.Item>
                <Dropdown.Item onClick={() => {
                  setShareMode('edit');
                  handleShareDashboard();
                }}>
                  Share with Edit Access
                </Dropdown.Item>
                <Dropdown.Item onClick={() => {
                  setShareMode('embed');
                  handleShareDashboard();
                }}>
                  Get Embed Code
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Dropdown className="d-inline me-2">
              <Dropdown.Toggle variant="outline-secondary" id="dropdown-options">
                Options
              </Dropdown.Toggle>
              <Dropdown.Menu>
                <Dropdown.Item onClick={() => setShowRefreshModal(true)}>
                  Schedule Refresh
                </Dropdown.Item>
                <Dropdown.Item onClick={handleRefreshAllPanels}>
                  Refresh All Panels
                </Dropdown.Item>
                <Dropdown.Divider />
                <Dropdown.Item onClick={() => window.print()}>
                  Print Dashboard
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown>
            
            <Button variant="primary" onClick={() => setShowAddPanelModal(true)}>
              Add Panel
            </Button>
          </div>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
      
      <Card className="mb-4 dashboard-title-card">
        <Card.Body>
          {editMode ? (
            <Form>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Dashboard Name</Form.Label>
                    <Form.Control
                      type="text"
                      value={dashboardName}
                      onChange={(e) => setDashboardName(e.target.value)}
                    />
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={1}
                      value={dashboardDescription}
                      onChange={(e) => setDashboardDescription(e.target.value)}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Form>
          ) : (
            <>
              <h2>{dashboard.name}</h2>
              {dashboard.description && <p className="text-muted">{dashboard.description}</p>}
              <div className="small text-muted">
                Created: {new Date(dashboard.dateCreated).toLocaleString()}
                {' | '}
                Last modified: {new Date(dashboard.dateModified).toLocaleString()}
                {dashboard.refreshInterval > 0 && (
                  <>
                    {' | '}
                    Auto-refresh: {dashboard.refreshInterval} minutes
                  </>
                )}
              </div>
            </>
          )}
        </Card.Body>
      </Card>
      
      {(!dashboard.panels || dashboard.panels.length === 0) ? (
        <div className="text-center p-5 bg-light rounded">
          <h4>No panels yet</h4>
          <p className="text-muted">
            This dashboard is empty. Click "Add Panel" to create your first visualization.
          </p>
          <Button variant="primary" onClick={() => setShowAddPanelModal(true)}>
            Add Your First Panel
          </Button>
        </div>
      ) : (
        <Row className="dashboard-panels">
          {dashboard.panels.map(panel => {
            // Get the size classes from panel metadata
            const sizeClasses = panel.size 
              ? getPanelSizeClasses(panel.size.width, panel.size.height)
              : getPanelSizeClasses('full', 'medium');
            
            return (
              <Col 
                key={panel.id} 
                className={`${sizeClasses.widthClass} mb-4`}
              >
                <div className={`panel-container ${sizeClasses.heightClass}`}>
                  <DashboardPanel
                    panel={panel}
                    onDelete={() => handleDeletePanel(panel.id)}
                    isEditMode={editMode}
                  />
                </div>
              </Col>
            );
          })}
        </Row>
      )}
      
      {/* Add Panel Modal */}
      <Modal 
        show={showAddPanelModal} 
        onHide={() => setShowAddPanelModal(false)}
        size="lg"
        className="panel-modal"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Dashboard Panel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {panelQueryError && (
            <Alert variant="danger" dismissible onClose={() => setPanelQueryError(null)}>
              {panelQueryError}
            </Alert>
          )}
          
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Panel Title</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter panel title"
                value={newPanelTitle}
                onChange={(e) => setNewPanelTitle(e.target.value)}
              />
            </Form.Group>
            
            <Form.Group className="mb-3">
              <Form.Label>Visualization Type</Form.Label>
              <Form.Select
                value={newPanelType}
                onChange={(e) => setNewPanelType(e.target.value)}
              >
                <option value="table">Table</option>
                <option value="line">Line Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="pie">Pie Chart</option>
                <option value="scatter">Scatter Plot</option>
                <option value="stats">Statistics</option>
              </Form.Select>
            </Form.Group>
            
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Panel Width</Form.Label>
                  <Form.Select
                    value={newPanelWidth}
                    onChange={(e) => setNewPanelWidth(e.target.value)}
                  >
                    <option value="full">Full Width</option>
                    <option value="half">Half Width</option>
                    <option value="third">One-Third Width</option>
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Panel Height</Form.Label>
                  <Form.Select
                    value={newPanelHeight}
                    onChange={(e) => setNewPanelHeight(e.target.value)}
                  >
                    <option value="small">Small</option>
                    <option value="medium">Medium</option>
                    <option value="large">Large</option>
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>
            
            <Row>
              <Col>
                <Form.Group className="mb-3">
                  <Form.Label>SPARQL Endpoint</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter SPARQL endpoint"
                    value={newPanelEndpoint}
                    onChange={(e) => setNewPanelEndpoint(e.target.value)}
                  />
                </Form.Group>
              </Col>
            </Row>
            
            <Form.Group className="mb-3">
              <Form.Label>SPARQL Query</Form.Label>
              <Form.Control
                as="textarea"
                rows={5}
                placeholder="Enter your SPARQL query"
                value={newPanelQuery}
                onChange={(e) => setNewPanelQuery(e.target.value)}
              />
            </Form.Group>
            
            <div className="d-grid mb-3">
              <Button 
                variant="outline-primary" 
                onClick={handleTestQuery}
                disabled={queryLoading}
              >
                {queryLoading ? (
                  <>
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    Testing Query...
                  </>
                ) : 'Test Query'}
              </Button>
            </div>
            
            {queryResults && (
              <>
                <Alert variant="success">
                  Query executed successfully! Retrieved {queryResults.data.length} results.
                </Alert>
                
                {['line', 'bar', 'pie', 'scatter'].includes(newPanelType) && (
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>X-Axis</Form.Label>
                        <Form.Select
                          value={xAxis}
                          onChange={(e) => setXAxis(e.target.value)}
                        >
                          {queryResults.columns.map(column => (
                            <option key={column} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Y-Axis</Form.Label>
                        <Form.Select
                          value={yAxis}
                          onChange={(e) => setYAxis(e.target.value)}
                        >
                          {queryResults.columns.map(column => (
                            <option key={column} value={column}>{column}</option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Chart Color</Form.Label>
                        <Form.Control
                          type="color"
                          value={selectedColor}
                          onChange={(e) => setSelectedColor(e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                )}
              </>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddPanelModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddPanel}
            disabled={!queryResults}
          >
            Add Panel
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Share Modal */}
      <Modal
        show={showShareModal}
        onHide={() => setShowShareModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Share Dashboard</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>
            {shareMode === 'view' && 'Anyone with this link can view the dashboard:'}
            {shareMode === 'edit' && 'Anyone with this link can view and edit the dashboard:'} 
            {shareMode === 'embed' && 'Use this code to embed the dashboard in your website:&quot;'} 
          </p> 
          
          {shareMode === 'embed' ? (  
            <Form.Control
              as="textarea"
              rows={3}
              value={`<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`}
              readOnly 
              onClick={(e) => e.target.select()}
            /> 
          ) : (
            <Form.Control
              type="text" 
              value={shareUrl}
              readOnly
              onClick={(e) => e.target.select()}
            />
          )}
          
          <div className="d-grid mt-3">
            <Button 
              variant="primary" 
              onClick={() => {
                navigator.clipboard.writeText(
                  shareMode === 'embed' 
                    ? `<iframe src="${shareUrl}" width="100%" height="600" frameborder="0"></iframe>`
                    : shareUrl 
                );
                alert('Copied to clipboard!');
              }}
            >
              Copy to Clipboard
            </Button>
          </div>
        </Modal.Body>
      </Modal>
      
      {/* Refresh Schedule Modal */}
      <Modal
        show={showRefreshModal}
        onHide={() => setShowRefreshModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Schedule Dashboard Refresh</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-3">
            <Form.Label>Auto-refresh Interval (minutes)</Form.Label>
            <Form.Control
              type="number"
              min="0"
              max="1440"
              value={refreshInterval}
              onChange={(e) => setRefreshInterval(parseInt(e.target.value) || 0)}
            />
            <Form.Text className="text-muted">
              Set to 0 to disable auto-refresh. Maximum is 1440 minutes (24 hours).
            </Form.Text>
          </Form.Group>
          
          <Alert variant="info">
            <strong>Note:</strong> Auto-refresh will only work while the dashboard is open in your browser.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefreshModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSetRefreshSchedule}>
            Save Schedule
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Edit mode indicator */}
      {editMode && (
        <div className="edit-mode-indicator">
          Edit Mode
        </div>
      )}
    </div>
  );
};

export default DashboardEditor;

DashboardEditor.propTypes = {
  dashboardId: PropTypes.string.isRequired,
  onBack: PropTypes.func.isRequired,
};
