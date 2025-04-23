// src/components/DashboardList.js - Fixed version
import React, { useState } from 'react';
import { Card, Button, Table, Modal, Form, InputGroup, Alert, Badge } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { createDashboard, deleteDashboard, exportDashboard, importDashboard } from '../utils/dashboardUtils';

const DashboardList = ({ dashboards = [], onSelectDashboard, onDashboardsChanged }) => {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [newDashboardName, setNewDashboardName] = useState('');
  const [newDashboardDescription, setNewDashboardDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [importFile, setImportFile] = useState(null);
  const [error, setError] = useState(null);
  const [importError, setImportError] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Filter dashboards based on search term
  const filteredDashboards = dashboards.filter(dashboard => 
    dashboard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (dashboard.description && dashboard.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  // Handle creating a new dashboard
  const handleCreateDashboard = () => {
    // Validate input
    if (!newDashboardName.trim()) {
      setError('Dashboard name is required');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      console.log('Creating dashboard with name:', newDashboardName);
      const dashboard = createDashboard(newDashboardName, newDashboardDescription);
      
      if (dashboard) {
        console.log('Created dashboard:', dashboard.id);
        
        // Close modal and reset form
        setShowCreateModal(false);
        setNewDashboardName('');
        setNewDashboardDescription('');
        
        // Notify parent about the change
        if (onDashboardsChanged) {
          onDashboardsChanged();
        }
        
        // Select the newly created dashboard
        if (onSelectDashboard) {
          // Small delay to ensure the dashboard is properly saved before selection
          setTimeout(() => {
            onSelectDashboard(dashboard.id);
          }, 100);
        }
      } else {
        throw new Error('Failed to create dashboard');
      }
    } catch (err) {
      console.error('Dashboard creation error:', err);
      setError('Failed to create dashboard. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };
  
  // Handle deleting a dashboard
  const handleDeleteDashboard = (dashboardId) => {
    if (!dashboardId) {
      setError('Cannot delete: Invalid dashboard ID');
      return;
    }
    
    console.log(`Attempting to delete dashboard: ${dashboardId}`);
    
    if (window.confirm('Are you sure you want to delete this dashboard?')) {
      try {
        const result = deleteDashboard(dashboardId);
        
        if (result) {
          console.log(`Dashboard ${dashboardId} deleted successfully`);
          
          // Notify parent about the change
          if (onDashboardsChanged) {
            onDashboardsChanged();
          }
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
    // Validate input
    if (!importFile) {
      setImportError('Please select a file to import');
      return;
    }
    
    setIsImporting(true);
    setImportError(null);
    
    try {
      console.log('Attempting to import dashboard from file:', importFile.name);
      const importedDashboard = await importDashboard(importFile);
      
      console.log('Imported dashboard:', importedDashboard.id);
      
      // Close modal and reset form
      setShowImportModal(false);
      setImportFile(null);
      
      // Notify parent about the change
      if (onDashboardsChanged) {
        onDashboardsChanged();
      }
      
      // Select the imported dashboard
      if (onSelectDashboard) {
        // Small delay to ensure the dashboard is properly saved before selection
        setTimeout(() => {
          onSelectDashboard(importedDashboard.id);
        }, 100);
      }
    } catch (error) {
      console.error('Dashboard import error:', error);
      setImportError(error.message || 'Failed to import dashboard');
    } finally {
      setIsImporting(false);
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
  
  // Handle exporting a dashboard
  const handleExportDashboard = (dashboardId) => {
    if (!dashboardId) {
      setError('Cannot export: Invalid dashboard ID');
      return;
    }
    
    try {
      console.log(`Exporting dashboard: ${dashboardId}`);
      exportDashboard(dashboardId);
    } catch (err) {
      console.error('Dashboard export error:', err);
      setError('Failed to export dashboard. Please try again.');
    }
  };
  
  return (
    <Card>
      <Card.Header as="h5">Dashboards</Card.Header>
      <Card.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-3">
            {error}
          </Alert>
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
            <Button 
              variant="primary" 
              onClick={() => setShowCreateModal(true)}
              className="mt-2"
            >
              Create Your First Dashboard
            </Button>
          </div>
        ) : filteredDashboards.length === 0 ? (
          <div className="text-center p-5">
            <p className="text-muted">No dashboards match your search.</p>
            <Button 
              variant="outline-secondary" 
              onClick={() => setSearchTerm('')}
              className="mt-2"
            >
              Clear Search
            </Button>
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover>
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
                    <td>
                      {dashboard.name}
                      {dashboard.refreshInterval > 0 && (
                        <Badge bg="info" pill className="ms-2" title={`Auto-refresh: ${dashboard.refreshInterval} minutes`}>
                          <i className="bi bi-arrow-repeat"></i>
                        </Badge>
                      )}
                    </td>
                    <td>{dashboard.description || '-'}</td>
                    <td>{new Date(dashboard.dateCreated).toLocaleDateString()}</td>
                    <td>{new Date(dashboard.dateModified).toLocaleDateString()}</td>
                    <td>{dashboard.panels?.length || 0}</td>
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
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleExportDashboard(dashboard.id)}
                          title="Export Dashboard"
                        >
                          <i className="bi bi-download"></i>
                        </Button>
                        <Button 
                          variant="outline-danger" 
                          size="sm"
                          onClick={() => handleDeleteDashboard(dashboard.id)}
                          title="Delete Dashboard"
                        >
                          <i className="bi bi-trash"></i>
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
        
        {/* Create Dashboard Modal */}
        <Modal 
          show={showCreateModal} 
          onHide={() => setShowCreateModal(false)}
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>Create New Dashboard</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {error && (
              <Alert variant="danger" dismissible onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
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
            <Button 
              variant="primary" 
              onClick={handleCreateDashboard}
              disabled={isCreating}
            >
              {isCreating ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Creating...
                </>
              ) : 'Create Dashboard'}
            </Button>
          </Modal.Footer>
        </Modal>
        
        {/* Import Dashboard Modal */}
        <Modal 
          show={showImportModal} 
          onHide={() => setShowImportModal(false)}
          backdrop="static"
        >
          <Modal.Header closeButton>
            <Modal.Title>Import Dashboard</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            {importError && (
              <Alert variant="danger" dismissible onClose={() => setImportError(null)}>
                {importError}
              </Alert>
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
              disabled={!importFile || isImporting}
            >
              {isImporting ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Importing...
                </>
              ) : 'Import Dashboard'}
            </Button>
          </Modal.Footer>
        </Modal>
      </Card.Body>
    </Card>
  );
};

export default DashboardList;

DashboardList.propTypes = {
  dashboards: PropTypes.arrayOf(PropTypes.object).isRequired,
  onSelectDashboard: PropTypes.func.isRequired,
  onDashboardsChanged: PropTypes.func.isRequired,
};
