// src/components/DashboardEditor.js
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Button, Row, Col, Form, Alert, Modal, OverlayTrigger, Tooltip, Dropdown } from 'react-bootstrap';
import { GridStack, GridStackElement } from 'gridstack';
import 'gridstack/dist/gridstack.min.css';
import { 
  getDashboardById, 
  saveDashboard, 
  createPanel, 
  deletePanel, 
  shareDashboard,
  updatePanelPosition,
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
  const [gridInstance, setGridInstance] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [shareMode, setShareMode] = useState('view');
  const [refreshInterval, setRefreshInterval] = useState(0);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  
  // Panel creation state
  const [newPanelTitle, setNewPanelTitle] = useState('');
  const [newPanelType, setNewPanelType] = useState('table');
  const [newPanelEndpoint, setNewPanelEndpoint] = useState('');
  const [newPanelQuery, setNewPanelQuery] = useState('');
  const [panelQueryError, setPanelQueryError] = useState(null);
  const [queryResults, setQueryResults] = useState(null);
  const [queryLoading, setQueryLoading] = useState(false);
  const [xAxis, setXAxis] = useState('');
  const [yAxis, setYAxis] = useState('');
  const [selectedColor, setSelectedColor] = useState('#1f77b4');
  
  // Initialize GridStack
  const initializeGrid = useCallback(() => {
    if (!dashboard) return;
    
    // Clean up any previous instance
    if (gridInstance) {
      gridInstance.destroy();
    }
    
    // Initialize new grid
    const grid = GridStack.init({
      column: 12,
      cellHeight: 50,
      animate: true,
      disableOneColumnMode: false,
      resizable: { handles: 'all' },
      draggable: { handle: '.panel-drag-handle' },
      staticGrid: !editMode // Only allow dragging in edit mode
    });
    
    setGridInstance(grid);
    
    // Add change event to save positions
    grid.on('change', (event, items) => {
      if (!items || !items.length) return;
      
      const updatedDashboard = { ...dashboard };
      
      items.forEach(item => {
        const panelId = item.id;
        const panelIndex = updatedDashboard.panels.findIndex(p => p.id === panelId);
        
        if (panelIndex !== -1) {
          // Update panel position
          updatedDashboard.panels[panelIndex].position = {
            x: item.x,
            y: item.y,
            w: item.w,
            h: item.h
          };
        }
      });
      
      // Update local state
      setDashboard(updatedDashboard);
      
      // Save to storage
      saveDashboard(updatedDashboard);
    });
    
    // Add panels to grid based on saved positions
    dashboard.panels.forEach(panel => {
      const element = document.getElementById(`panel-${panel.id}`);
      if (element) {
        const { x, y, w, h } = panel.position || { x: 0, y: 0, w: 6, h: 4 };
        grid.addWidget(element, { x, y, w, h, id: panel.id });
      }
    });
    
    // Update grid mode based on edit state
    grid.setStatic(!editMode);
    
  }, [dashboard, editMode, gridInstance]);
  
  // Load dashboard data
  useEffect(() => {
    loadDashboard();
    
    // Clean up GridStack on unmount
    return () => {
      if (gridInstance) {
        gridInstance.destroy();
      }
    };
  }, [dashboardId]);
  
  // Initialize grid after dashboard is loaded
  useEffect(() => {
    if (dashboard) {
      // Initialize grid after a short delay to ensure DOM elements are ready
      const timer = setTimeout(() => {
        initializeGrid();
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [dashboard, initializeGrid]);
  
  // Update grid when edit mode changes
  useEffect(() => {
    if (gridInstance) {
      gridInstance.setStatic(!editMode);
    }
  }, [editMode, gridInstance]);
  
  const loadDashboard = () => {
    setLoading(true);
    const dashboardData = getDashboardById(dashboardId);
    
    if (dashboardData) {
      setDashboard(dashboardData);
      setDashboardName(dashboardData.name);
      setDashboardDescription(dashboardData.description || '');
      setRefreshInterval(dashboardData.refreshInterval || 0);
      setError(null);
    } else {
      setError('Dashboard not found');
    }
    
    setLoading(false);
  };
  
  // Handle saving dashboard changes
  const handleSaveDashboard = () => {
    if (!dashboardName.trim()) {
      setError('Dashboard name is required');
      return;
    }
    
    const updatedDashboard = {
      ...dashboard,
      name: dashboardName,
      description: dashboardDescription,
      refreshInterval: refreshInterval
    };
    
    if (saveDashboard(updatedDashboard)) {
      setDashboard(updatedDashboard);
      setEditMode(false);
      setError(null);
    } else {
      setError('Failed to save dashboard');
    }
  };
  
  // Handle deleting a panel
  const handleDeletePanel = (panelId) => {
    if (window.confirm('Are you sure you want to delete this panel?')) {
      // Remove from grid
      if (gridInstance) {
        const element = document.getElementById(`panel-${panelId}`);
        if (element) {
          gridInstance.removeWidget(element, false);
        }
      }
      
      // Delete from storage
      if (deletePanel(dashboardId, panelId)) {
        loadDashboard();
      }
    }
  };
  
  // Handle sharing the dashboard
  const handleShareDashboard = () => {
    const url = shareDashboard(dashboardId, shareMode);
    setShareUrl(url);
    setShowShareModal(true);
  };
  
  // Handle setting a refresh schedule
  const handleSetRefreshSchedule = () => {
    const updatedDashboard = {
      ...dashboard,
      refreshInterval: refreshInterval
    };
    
    if (saveDashboard(updatedDashboard)) {
      setDashboard(updatedDashboard);
      setShowRefreshModal(false);
      
      // Activate the refresh schedule if an interval is set
      if (refreshInterval > 0) {
        scheduleDashboardRefresh(dashboardId, refreshInterval);
      }
    } else {
      setError('Failed to set refresh schedule');
    }
  };
  
  // Test panel query
  const handleTestQuery = async () => {
    if (!newPanelEndpoint || !newPanelQuery) {
      setPanelQueryError('Please provide both endpoint and query');
      return;
    }
    
    setQueryLoading(true);
    setPanelQueryError(null);
    
    try {
      const result = await executeQuery(newPanelEndpoint, newPanelQuery);
      
      if (result.success) {
        setQueryResults(result);
        // Set default X and Y axes if available
        if (result.columns.length > 0) {
          setXAxis(result.columns[0]);
          setYAxis(result.columns.length > 1 ? result.columns[1] : result.columns[0]);
        }
      } else {
        setPanelQueryError(`Query failed: ${result.error}`);
        setQueryResults(null);
      }
    } catch (err) {
      setPanelQueryError(`Error executing query: ${err.message}`);
      setQueryResults(null);
    } finally {
      setQueryLoading(false);
    }
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
    
    // Find a default position
    const position = {
      x: 0,
      y: 0,
      w: 6,
      h: 4
    };
    
    const panel = createPanel(
      dashboardId,
      newPanelTitle,
      newPanelType,
      query,
      visualization,
      position
    );
    
    if (panel) {
      loadDashboard();
      setShowAddPanelModal(false);
      resetPanelForm();
    } else {
      setPanelQueryError('Failed to create panel');
    }
  };
  
  // Reset panel creation form
  const resetPanelForm = () => {
    setNewPanelTitle('');
    setNewPanelType('table');
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
    // Trigger refresh for all panels
    if (dashboard && dashboard.panels) {
      const panelElements = document.querySelectorAll('[data-panel-refresh]');
      panelElements.forEach(element => {
        // Trigger a click event on each refresh button
        element.click();
      });
    }
  };
  
  if (loading) {
    return <div className="text-center p-5">Loading dashboard...</div>;
  }
  
  if (error && !dashboard) {
    return (
      <Alert variant="danger">
        {error}
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
        <Alert variant="danger" className="mb-3">
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
      
      {dashboard.panels.length === 0 ? (
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
        <div className="grid-stack">
          {dashboard.panels.map(panel => (
            <div 
              key={panel.id} 
              className="grid-stack-item" 
              id={`panel-${panel.id}`}
              data-gs-id={panel.id}
            >
              <div className="grid-stack-item-content">
                <DashboardPanel
                  panel={panel}
                  onDelete={() => handleDeletePanel(panel.id)}
                  isEditMode={editMode}
                />
              </div>
            </div>
          ))}
        </div>
      )}
      
      {/* Add Panel Modal */}
      <Modal 
        show={showAddPanelModal} 
        onHide={() => setShowAddPanelModal(false)}
        size="lg"
        className="panel-modal"
      >
        <Modal.Header closeButton>
          <Modal.Title>Add Dashboard Panel</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {panelQueryError && (
            <Alert variant="danger">{panelQueryError}</Alert>
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
                <option value="bubble">Bubble Chart</option>
                <option value="network">Network Graph</option>
                <option value="stats">Statistics</option>
              </Form.Select>
            </Form.Group>
            
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
                {queryLoading ? 'Testing Query...' : 'Test Query'}
              </Button>
            </div>
            
            {queryResults && (
              <>
                <Alert variant="success">
                  Query executed successfully! Retrieved {queryResults.data.length} results.
                </Alert>
                
                {['line', 'bar', 'pie', 'scatter', 'bubble', 'network'].includes(newPanelType) && (
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
                    
                    {['bubble', 'network'].includes(newPanelType) && (
                      <Col md={6}>
                        <Form.Group className="mb-3">
                          <Form.Label>Size Dimension</Form.Label>
                          <Form.Select>
                            <option value="">None (use fixed size)</option>
                            {queryResults.columns.map(column => (
                              <option key={column} value={column}>{column}</option>
                            ))}
                          </Form.Select>
                        </Form.Group>
                      </Col>
                    )}
                    
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
            {shareMode === 'embed' && 'Use this code to embed the dashboard in your website:'}
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
    </div>
  );
};

export default DashboardEditor;
