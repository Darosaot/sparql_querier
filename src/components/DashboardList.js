// src/components/DashboardList.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Table, Modal, Form, InputGroup } from 'react-bootstrap';
import { getDashboards, createDashboard, deleteDashboard, exportDashboard, importDashboard } from '../utils/dashboardUtils';

const DashboardList = ({ onSelectDashboard }) => {
  const [dashboards, setDashboards] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [error, setError] = useState(null);
  const [importError, setImportError] = useState(null);
  
  // Load dashboards from localStorage when component mounts
  useEffect(() => {
    loadDashboards();
  }, []);
  
  // Load dashboards from storage
  const loadDashboards = () => {
    try {
      console.log('DashboardList: Attempting to load dashboards');
      const loadedDashboards = getDashboards();
      
      console.log('DashboardList: Loaded dashboards', loadedDashboards);
      
      if (loadedDashboards.length === 0) {
        console.warn('No dashboards found in storage');
        setError('No dashboards available. Create your first dashboard!');
      }
      
      setDashboards(loadedDashboards);
      setError(null);
    } catch (err) {
      console.error('Error loading dashboards:', err);
      setError('Failed to load dashboards. Please check your browser storage.');
    }
  };
  
  // Filter dashboards based on search term
  const filteredDashboards = dashboards.filter(dashboard => 
    dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dashboard.description && dashboard.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle creating a new dashboard
  const handleCreateDashboard = () => {
    console.log('Creating dashboard with name:', newDashboardName);
    
    if (!newDashboardName.trim()) {
      setError('Dashboard name is required');
      return;
    }
    
    try {
      const dashboard = createDashboard(newDashboardName, newDashboardDescription);
      
      console.log('Created dashboard:', dashboard);
      
      if (dashboard) {
        loadDashboards();
        setShowCreateModal(false);
        setNewDashboardName('');
        setNewDashboardDescription('');
        setError(null);
        
        // Automatically select the newly created dashboard
        onSelectDashboard(dashboard.id);
      } else {
        throw new Error('Failed to create dashboard');
      }
    } catch (err) {
      console.error('Dashboard creation error:', err);
      setError('Failed to create dashboard. Please try again.');
    }
  };
  
  // Handle deleting a dashboard
  const handleDeleteDashboard = (dashboardId) => {
    console.log(`Attempting to delete dashboard: ${dashboardId}`);
    
    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      try {
        if (deleteDashboard(dashboardId)) {
          console.log(`Dashboard ${dashboardId} deleted successfully`);
          loadDashboards();
        } else {
          throw new Error('Dashboard deletion failed');
        }
      } catch (err) {
        console.error('Dashboard deletion error:', err);
        setError('Failed to delete dashboard. Please try again.');
      }
    }
  };
  
  // Handle importing a dashboard
  const handleImportDashboard = async () => {
    console.log('Attempting to import dashboard');
    
    if (!importFile) {
      setImportError('Please select a file to import');
      return;
    }
    
    try {
      const importedDashboard = await importDashboard(importFile);
      
      console.log('Imported dashboard:', importedDashboard);
      
      loadDashboards();
      setShowImportModal(false);
      setImportFile(null);
      setImportError(null);
      
      // Automatically select the imported dashboard
      onSelectDashboard(importedDashboard.id);
    } catch (error) {
      console.error('Dashboard import error:', error);
      setImportError(error.message || 'Failed to import dashboard');
    }
  };
  
  // Handle file selection for import
  const handleFileChange = (e) => {
    if (e.target.files.length > 0) {
      console.log('Selected import file:', e.target.files[0].name);
      setImportFile(e.target.files[0]);
      setImportError(null);
    }
  };
  
  return (
    <Card>
      <Card.Header as="h5">Dashboards</Card.Header>
      <Card.Body>
        {error && (
          <div className="alert alert-danger mb-3">
            {error}
          </div>
        )}
        
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex gap-2">
            <Button variant="primary" onClick={() => setShowCreateModal(true)}>
              Create Dashboard
            </Button>
            <Button variant="outline-secondary" onClick={() => setShowImportModal(true)}>
              Import Dashboard
            </Button>
          </div>
          <InputGroup style={{ maxWidth: '300px' }}>
            <InputGroup.Text>Search</InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Find dashboard..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
        </div>
        
        {dashboards.length === 0 ? (
          <div className="text-center p-5">
            <p className="text-muted">No dashboards found. Create your first dashboard to get started.</p>
          </div>
        ) : filteredDashboards.length === 0 ? (
          <div className="text-center p-5">
            <p className="text-muted">No dashboards match your search.</p>
          </div>
        ) : (
          <Table hover responsive>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Created</th>
                <th>Last Modified</th>
                <th>Panels</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredDashboards.map(dashboard => (
                <tr key={dashboard.id}>
                  <td>{dashboard.name}</td>
                  <td>{dashboard.description}</td>
                  <td>{new Date(dashboard.dateCreated).toLocaleDateString()}</td>
                  <td>{new Date(dashboard.dateModified).toLocaleDateString()}</td>
                  <td>{dashboard.panels.length}</td>
                  <td>
                    <div className="d-flex gap-2">
                      <Button 
                        variant="outline-primary" 
                        size="sm"
                        onClick={() => {
                          console.log(`Selecting dashboard: ${dashboard.id}`);
                          onSelectDashboard(dashboard.id);
                        }}
                      >
                        Open
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => handleDeleteDashboard(dashboard.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
        
        {/* Create Dashboard Modal */}
        <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Create New Dashboard</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Dashboard Name *</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Enter dashboard name"
                  value={newDashboardName}
                  onChange={(e) => setNewDashboardName(e.target.value)}
                />
              </Form.Group>
              <Form.Group className="mb-3">
                <Form.Label>Description</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  placeholder="Enter description (optional)"
                  value={newDashboardDescription}
                  onChange={(e) => setNewDashboardDescription(e.target.value)}
                />
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleCreateDashboard}>
              Create Dashboard
            </Button>
          </Modal.Footer>
        </Modal>
        
        {/* Import Dashboard Modal */}
        <Modal show={showImportModal} onHide={() => setShowImportModal(false)}>
          <Modal.Header closeButton>
            <Modal.Title>Import Dashboard</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {importError && (
              <div className="alert alert-danger">{importError}</div>
            )}
            <Form>
              <Form.Group className="mb-3">
                <Form.Label>Dashboard JSON File</Form.Label>
                <Form.Control
                  type="file"
                  accept=".json"
                  onChange={handleFileChange}
                />
                <Form.Text className="text-muted">
                  Select a JSON file containing a previously exported dashboard.
                </Form.Text>
              </Form.Group>
            </Form>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={() => setShowImportModal(false)}>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleImportDashboard}
              disabled={!importFile}
            >
              Import Dashboard
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

export default DashboardList;
