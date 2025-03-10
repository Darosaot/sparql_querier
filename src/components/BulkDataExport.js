import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { executeQuery } from '../api/sparqlService';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// Import query definitions from bulkExportQueries.js
import {
  notice_details_query_part1,
  notice_details_query_part2,
  buyer_details_query,
  award_details_query_part1,
  contract_duration
} from '../data/bulkExportQueries';

const BulkDataExport = () => {
  // Authentication state (mock - in a real app this would come from an auth system)
  const [isAuthorized, setIsAuthorized] = useState(true); // Set to true for development

  // Form states
  const [sparqlEndpoint, setSparqlEndpoint] = useState('https://data.europa.eu/a4g/sparql');
  const [dateRange, setDateRange] = useState({
    startDate: '2023-01-01',
    endDate: '2025-01-01',
  });
  const [useNamedGraph, setUseNamedGraph] = useState(true);
  const [selectedGraphs, setSelectedGraphs] = useState(['https://data.europa.eu/a4g/graph/dgGrow']);
  const [selectedDataGroups, setSelectedDataGroups] = useState([]);
  const [selectedFields, setSelectedFields] = useState({});
  const [exportFormat, setExportFormat] = useState('CSV');
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState(null);
  const [error, setError] = useState(null);
  const [exportedData, setExportedData] = useState(null);

  // Available graphs
  const availableGraphs = [
    { id: 'dgGrow', value: 'https://data.europa.eu/a4g/graph/dgGrow', label: 'DG GROW' },
    { id: 'tedArch', value: 'https://data.europa.eu/a4g/graph/tedArch', label: 'TED Archive' }
  ];

  // Available data groups with their fields
  const dataGroups = [
    {
      id: 'noticeDetails',
      label: 'Notice Details',
      fields: [
        { id: 'notice', label: 'Notice URI', required: true },
        { id: 'noticeID', label: 'Notice ID' },
        { id: 'noticePublicationDate', label: 'Publication Date' },
        { id: 'noticeDispatchDate', label: 'Dispatch Date' },
        { id: 'noticeType', label: 'Notice Type' },
        { id: 'noticeSchema', label: 'Notice Schema' },
        { id: 'legalBasis', label: 'Legal Basis' },
        { id: 'CNIdentifier', label: 'CN Identifier' },
        { id: 'EstimatedValue', label: 'Estimated Value' },
        { id: 'EstimatedValueCurrency', label: 'Estimated Value Currency' },
      ]
    },
    {
      id: 'procedureDetails',
      label: 'Procedure Details',
      fields: [
        { id: 'procedure', label: 'Procedure URI', required: true },
        { id: 'procedureID', label: 'Procedure ID' },
        { id: 'procedureType', label: 'Procedure Type' },
        { id: 'TYPE_OF_CONTRACT', label: 'Contract Type' },
        { id: 'CPV', label: 'CPV Code' },
        { id: 'isJointProcurement', label: 'Is Joint Procurement' },
        { id: 'ProcurementTechniques', label: 'Procurement Techniques' },
      ]
    },
    {
      id: 'buyerDetails',
      label: 'Buyer Details',
      fields: [
        { id: 'Buyer', label: 'Buyer URI', required: true },
        { id: 'CAE_NAME', label: 'Buyer Name' },
        { id: 'CAE_NATIONALID', label: 'National Registration Number' },
        { id: 'ISO_COUNTRY_CODE', label: 'Country Code' },
        { id: 'buyerNutsCode', label: 'NUTS Code' },
        { id: 'CAE_TYPE', label: 'Buyer Legal Type' },
        { id: 'MAIN_ACTIVITY', label: 'Main Activity' },
        { id: 'CAE_TOWN', label: 'Town' },
        { id: 'CAE_POSTAL_CODE', label: 'Postal Code' },
        { id: 'CAE_ADDRESS', label: 'Address' },
      ]
    },
    {
      id: 'awardDetails',
      label: 'Award Details',
      fields: [
        { id: 'LotAward', label: 'Lot Award URI', required: true },
        { id: 'AwardStatus', label: 'Award Status' },
        { id: 'AwardValue', label: 'Award Value' },
        { id: 'awardCurrency', label: 'Award Currency' },
        { id: 'TotalAwardValue', label: 'Total Award Value' },
        { id: 'TotalAwardValueCurrency', label: 'Total Award Value Currency' },
      ]
    },
    {
      id: 'contractDetails',
      label: 'Contract Details',
      fields: [
        { id: 'Contract', label: 'Contract URI', required: true },
        { id: 'DURATION', label: 'Duration' },
        { id: 'durationUnit', label: 'Duration Unit' },
      ]
    }
  ];

  // Initialize selected fields when component mounts
  React.useEffect(() => {
    const initialSelectedFields = {};
    
    dataGroups.forEach(group => {
      initialSelectedFields[group.id] = {};
      
      group.fields.forEach(field => {
        // Pre-select required fields
        initialSelectedFields[group.id][field.id] = field.required;
      });
    });
    
    setSelectedFields(initialSelectedFields);
  }, []);

  // Handle date range changes
  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({ ...prev, [name]: value }));
  };

  // Handle graph selection changes
  const handleGraphSelection = (e) => {
    const value = e.target.value;
    if (selectedGraphs.includes(value)) {
      setSelectedGraphs(selectedGraphs.filter(graph => graph !== value));
    } else {
      setSelectedGraphs([...selectedGraphs, value]);
    }
  };

  // Handle data group selection changes
  const handleDataGroupSelection = (e) => {
    const value = e.target.value;
    if (selectedDataGroups.includes(value)) {
      setSelectedDataGroups(selectedDataGroups.filter(group => group !== value));
    } else {
      setSelectedDataGroups([...selectedDataGroups, value]);
    }
  };

  // Handle select/deselect all data groups
  const handleSelectAllDataGroups = (selectAll) => {
    if (selectAll) {
      setSelectedDataGroups(dataGroups.map(group => group.id));
    } else {
      setSelectedDataGroups([]);
    }
  };

  // Handle field selection changes
  const handleFieldSelection = (groupId, fieldId, checked) => {
    setSelectedFields(prev => ({
      ...prev,
      [groupId]: {
        ...prev[groupId],
        [fieldId]: checked
      }
    }));
  };

  // Handle select/deselect all fields for a group
  const handleSelectAllFields = (groupId, selectAll) => {
    const updatedFields = { ...selectedFields };
    
    // Get all fields for this group
    const groupFields = dataGroups.find(g => g.id === groupId).fields;
    
    // Update each field, but ensure required fields remain selected
    groupFields.forEach(field => {
      updatedFields[groupId][field.id] = field.required || selectAll;
    });
    
    setSelectedFields(updatedFields);
  };

  // Get the query by data group ID
  const getQueryByDataGroup = (groupId, offset = 0, limit = 1000) => {
    const queries = {
      noticeDetails: notice_details_query_part1,
      procedureDetails: notice_details_query_part2,
      buyerDetails: buyer_details_query,
      awardDetails: award_details_query_part1,
      contractDetails: contract_duration,
    };
    
    // Format query with offset and limit
    let query = queries[groupId] || '';
    
    // Modify query to include or exclude the GRAPH clause based on useNamedGraph
    if (!useNamedGraph) {
      // Remove GRAPH clauses from the query
      query = query.replace(/GRAPH\s+<[^>]+>\s*\{/g, '');
      query = query.replace(/\}\s*(?=OPTIONAL|FILTER|BIND|LIMIT|ORDER BY|GROUP BY|$)/g, '');
    }
    
    return query.replace('{offset}', offset).replace('{limit}', limit);
  };

  // Execute data export process
  const startDataExport = async () => {
    if (!sparqlEndpoint) {
      setError('Please provide a SPARQL endpoint URL.');
      return;
    }

    if (selectedDataGroups.length === 0) {
      setError('Please select at least one data group to export.');
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    setError(null);
    setExportedData(null);
    setExportStatus('Fetching data... Please wait while we prepare your download.');

    try {
      const totalOperations = selectedDataGroups.length;
      let completedOperations = 0;
      
      const combinedResults = {};
      
      // Execute queries for each selected data group
      for (const groupId of selectedDataGroups) {
        setExportStatus(`Processing ${dataGroups.find(g => g.id === groupId)?.label || groupId}...`);
        console.log(`Starting export for ${groupId} with date range ${dateRange.startDate} to ${dateRange.endDate}`);
        
        // Get selected fields for this group
        const fields = Object.entries(selectedFields[groupId] || {})
          .filter(([_, isSelected]) => isSelected)
          .map(([fieldId]) => fieldId);
        
        console.log(`Selected fields for ${groupId}:`, fields);
        
        // Get the query
        const query = getQueryByDataGroup(groupId);
        console.log(`Query for ${groupId}: ${query}`);
        
        try {
          // Execute the query
          const result = await executeQuery(sparqlEndpoint, query);
          
          if (result.success && result.data && result.data.length > 0) {
            // Filter the data to include only selected fields
            const filteredColumns = result.columns.filter(col => fields.includes(col));
            const filteredColumnIndices = filteredColumns.map(col => result.columns.indexOf(col));
            
            const filteredData = result.data.map(row => 
              filteredColumnIndices.map(idx => row[idx])
            );
            
            combinedResults[groupId] = {
              columns: filteredColumns,
              data: filteredData
            };
          } else {
            console.log(`No results or error for ${groupId}`);
            combinedResults[groupId] = {
              columns: [],
              data: []
            };
          }
        } catch (err) {
          console.error(`Error executing query for ${groupId}:`, err);
          combinedResults[groupId] = {
            columns: [],
            data: [],
            error: err.message
          };
        }
        
        completedOperations++;
        setProgress(Math.round((completedOperations / totalOperations) * 100));
      }

      // Set the completed data
      setExportedData(combinedResults);
      setExportStatus('Your data is ready for download!');
      
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setExportStatus(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle download button click
  const handleDownload = () => {
    if (!exportedData) return;
    
    try {
      // Prepare data for export based on selected format
      if (exportFormat === 'CSV') {
        exportToCsv();
      } else if (exportFormat === 'JSON') {
        exportToJson();
      } else if (exportFormat === 'Excel') {
        exportToExcel();
      }
    } catch (err) {
      setError(`Download failed: ${err.message}`);
    }
  };

  // Export to CSV
  const exportToCsv = () => {
    // For CSV, we'll create one file per data group
    Object.entries(exportedData).forEach(([groupId, groupData]) => {
      if (groupData.columns.length === 0 || groupData.data.length === 0) return;
      
      // Convert to CSV using PapaParse
      const csvData = Papa.unparse({
        fields: groupData.columns,
        data: groupData.data
      });
      
      // Create and download blob
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8' });
      const fileName = `${groupId}_export.csv`;
      saveAs(blob, fileName);
    });
  };

  // Export to JSON
  const exportToJson = () => {
    // For JSON, we'll create a single file with all data groups
    const jsonData = {};
    
    Object.entries(exportedData).forEach(([groupId, groupData]) => {
      if (groupData.columns.length === 0 || groupData.data.length === 0) return;
      
      // Convert array data to objects with column names as keys
      jsonData[groupId] = groupData.data.map(row => {
        const obj = {};
        groupData.columns.forEach((col, index) => {
          obj[col] = row[index];
        });
        return obj;
      });
    });
    
    // Create and download blob
    const blob = new Blob([JSON.stringify(jsonData, null, 2)], { type: 'application/json' });
    const fileName = 'sparql_export.json';
    saveAs(blob, fileName);
  };

  // Export to Excel
  const exportToExcel = () => {
    // Create a new workbook
    const wb = XLSX.utils.book_new();
    
    // Add each data group as a worksheet
    Object.entries(exportedData).forEach(([groupId, groupData]) => {
      if (groupData.columns.length === 0 || groupData.data.length === 0) return;
      
      // Convert data to worksheet format (include headers)
      const ws_data = [groupData.columns, ...groupData.data];
      const ws = XLSX.utils.aoa_to_sheet(ws_data);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, groupId);
    });
    
    // Generate Excel file and trigger download
    XLSX.writeFile(wb, 'sparql_export.xlsx');
  };

  // If the user is not authorized, show a message
  if (!isAuthorized) {
    return (
      <Container className="mt-4">
        <Card>
          <Card.Header as="h5">Bulk Data Export</Card.Header>
          <Card.Body>
            <Alert variant="warning">
              You do not have permission to access this feature. Please contact the PPDS administrator.
            </Alert>
          </Card.Body>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="mt-4">
      <Card>
        <Card.Header as="h5">Bulk Data Export</Card.Header>
        <Card.Body>
          <p className="text-muted">
            This feature allows you to export large datasets from SPARQL endpoints.
            Select the data groups and fields you want to include, then click "Start Export" to begin the process.
          </p>

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          {exportStatus && !error && (
            <Alert variant={exportedData ? "success" : "info"}>
              {exportStatus}
              {isSubmitting && (
                <ProgressBar animated now={progress} className="mt-2" />
              )}
              
              {exportedData && (
                <div className="mt-3">
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm="3">Export Format:</Form.Label>
                    <Col sm="6">
                      <Form.Select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                      >
                        <option value="CSV">CSV</option>
                        <option value="JSON">JSON</option>
                        <option value="Excel">Excel</option>
                      </Form.Select>
                    </Col>
                    <Col sm="3">
                      <Button 
                        variant="success" 
                        onClick={handleDownload}
                        className="w-100"
                      >
                        Download
                      </Button>
                    </Col>
                  </Form.Group>
                </div>
              )}
            </Alert>
          )}

          <Form>
            {/* SPARQL Endpoint */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">SPARQL Endpoint</Form.Label>
              <Col sm="9">
                <Form.Control
                  type="text"
                  placeholder="Enter SPARQL endpoint URL"
                  value={sparqlEndpoint}
                  onChange={(e) => setSparqlEndpoint(e.target.value)}
                />
                <Form.Text className="text-muted">
                  Example: https://data.europa.eu/a4g/sparql
                </Form.Text>
              </Col>
            </Form.Group>

            {/* Date Range Selection */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">Date Range</Form.Label>
              <Col sm="9">
                <Row>
                  <Col>
                    <Form.Label>Start Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="startDate"
                      value={dateRange.startDate}
                      onChange={handleDateChange}
                    />
                  </Col>
                  <Col>
                    <Form.Label>End Date</Form.Label>
                    <Form.Control
                      type="date"
                      name="endDate"
                      value={dateRange.endDate}
                      onChange={handleDateChange}
                    />
                  </Col>
                </Row>
              </Col>
            </Form.Group>

            {/* Named Graph Selection */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">Named Graph</Form.Label>
              <Col sm="9">
                <Form.Check
                  type="checkbox"
                  id="use-named-graph"
                  label="Use Named Graph"
                  checked={useNamedGraph}
                  onChange={(e) => setUseNamedGraph(e.target.checked)}
                  className="mb-2"
                />
                
                {useNamedGraph && (
                  <>
                    {availableGraphs.map(graph => (
                      <Form.Check
                        key={graph.id}
                        type="checkbox"
                        id={`graph-${graph.id}`}
                        label={graph.label}
                        value={graph.value}
                        checked={selectedGraphs.includes(graph.value)}
                        onChange={handleGraphSelection}
                      />
                    ))}
                  </>
                )}
              </Col>
            </Form.Group>

            {/* Data Groups Selection */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">Data Groups</Form.Label>
              <Col sm="9">
                <div className="mb-2">
                  <Button 
                    variant="outline-primary" 
                    size="sm" 
                    onClick={() => handleSelectAllDataGroups(true)}
                    className="me-2"
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="outline-secondary" 
                    size="sm" 
                    onClick={() => handleSelectAllDataGroups(false)}
                  >
                    Deselect All
                  </Button>
                </div>
                
                {dataGroups.map(group => (
                  <Form.Check
                    key={group.id}
                    type="checkbox"
                    id={`group-${group.id}`}
                    label={group.label}
                    value={group.id}
                    checked={selectedDataGroups.includes(group.id)}
                    onChange={handleDataGroupSelection}
                  />
                ))}
              </Col>
            </Form.Group>

            {/* Field selection for each selected data group */}
            {selectedDataGroups.length > 0 && (
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm="3">Fields to Export</Form.Label>
                <Col sm="9">
                  <Card>
                    <Card.Body>
                      <p className="text-muted">
                        Select the specific fields you want to include in each data group.
                        Fields marked with * are always included.
                      </p>
                      
                      {dataGroups
                        .filter(group => selectedDataGroups.includes(group.id))
                        .map(group => (
                          <div key={group.id} className="mb-4">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                              <h6>{group.label}</h6>
                              <div>
                                <Button 
                                  variant="outline-primary" 
                                  size="sm" 
                                  onClick={() => handleSelectAllFields(group.id, true)}
                                  className="me-2"
                                >
                                  Select All
                                </Button>
                                <Button 
                                  variant="outline-secondary" 
                                  size="sm" 
                                  onClick={() => handleSelectAllFields(group.id, false)}
                                >
                                  Deselect All
                                </Button>
                              </div>
                            </div>
                            <Row>
                              {group.fields.map(field => (
                                <Col sm="6" key={field.id}>
                                  <Form.Check
                                    type="checkbox"
                                    id={`field-${group.id}-${field.id}`}
                                    label={`${field.label}${field.required ? ' *' : ''}`}
                                    checked={selectedFields[group.id]?.[field.id] || false}
                                    onChange={(e) => handleFieldSelection(group.id, field.id, e.target.checked)}
                                    disabled={field.required}
                                  />
                                </Col>
                              ))}
                            </Row>
                          </div>
                        ))}
                    </Card.Body>
                  </Card>
                </Col>
              </Form.Group>
            )}

            {/* Submit Button */}
            <div className="d-grid gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={startDataExport}
                disabled={isSubmitting || selectedDataGroups.length === 0 || !sparqlEndpoint}
              >
                {isSubmitting ? 'Processing...' : 'Start Export'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BulkDataExport;
