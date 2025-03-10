// src/components/DashboardEditor.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Form, Alert, Modal } from 'react-bootstrap';
import { getDashboardById, saveDashboard, createPanel, deletePanel, shareDashboard } from '../utils/dashboardUtils';
import { executeQuery } from '../api/sparqlService';
import DashboardPanel from './DashboardPanel';

const DashboardEditor = ({ dashboardId, onBack }) => {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddPanelModal, setShowAddPanelModal] = useState(false);
  const [dashboardName, setDashboardName] = useState('');
  const [dashboardDescription, setDashboardDescription] = useState('');
  
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
  
  // Load dashboard data
  useEffect(() => {
    loadDashboard();
  }, [dashboardId]);
  
  const loadDashboard = () => {
    setLoading(true);
    const dashboardData = getDashboardById(dashboardId);
    
    if (dashboardData) {
      setDashboard(dashboardData);
      setDashboardName(dashboardData.name);
      setDashboardDescription(dashboardData.description || '');
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
      description: dashboardDescription
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
      if (deletePanel(dashboardId, panelId)) {
        loadDashboard();
      }
    }
  };
  
  // Handle sharing the dashboard
  const handleShareDashboard = () => {
    shareDashboard(dashboardId);
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
    
    const panel = createPanel(
      dashboardId,
      newPanelTitle,
      newPanelType,
      query,
      visualization
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
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
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
        <div className="d-flex gap-2">
          <Button variant="outline-success" onClick={handleShareDashboard}>
            Share Dashboard
          </Button>
          <Button variant="primary" onClick={() => setShowAddPanelModal(true)}>
            Add Panel
          </Button>
        </div>
      </div>
      
      {error && (
        <Alert variant="danger" className="mb-3">
          {error}
        </Alert>
      )}
      
      <Card className="mb-4">
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
        <div className="dashboard-grid">
          <Row>
            {dashboard.panels.map(panel => (
              <Col xs={12} md={6} xl={4} key={panel.id} className="mb-4">
                <DashboardPanel
                  panel={panel}
                  onDelete={() => handleDeletePanel(panel.id)}
                  isEditMode={editMode}
                />
              </Col>
            ))}
          </Row>
        </div>
      )}
      
      {/* Add Panel Modal */}
      <Modal 
        show={showAddPanelModal} 
        onHide={() => setShowAddPanelModal(false)}
        size="lg"
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
                
                {newPanelType !== 'table' && newPanelType !== 'stats' && (
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
    </div>
  );
};

export default DashboardEditor;
