import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, ProgressBar } from 'react-bootstrap';
import { executeQuery } from '../api/sparqlService';

// Import query definitions from PPDS_queries.py
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
  const [dateRange, setDateRange] = useState({
    startDate: '2023-01-01',
    endDate: '2025-01-01',
  });
  const [selectedGraphs, setSelectedGraphs] = useState(['https://data.europa.eu/a4g/graph/dgGrow']);
  const [selectedDataGroups, setSelectedDataGroups] = useState([]);
  const [email, setEmail] = useState('');
  
  // UI states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportStatus, setExportStatus] = useState(null);
  const [error, setError] = useState(null);

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
    return query.replace('{offset}', offset).replace('{limit}', limit);
  };

  // Execute data export process
  const startDataExport = async () => {
    if (!email) {
      setError('Please provide an email address to receive the export notification.');
      return;
    }

    if (selectedDataGroups.length === 0) {
      setError('Please select at least one data group to export.');
      return;
    }

    setIsSubmitting(true);
    setProgress(0);
    setError(null);
    setExportStatus('The data export process has been launched. It may take a while. An email will be sent to you with the access to the downloaded data when it is available.');

    try {
      // In a real implementation, you would send this information to a backend
      // that would process the export asynchronously and notify the user via email
      
      // For demonstration purposes, we'll simulate the process by running
      // a few queries sequentially
      
      const totalOperations = selectedDataGroups.length;
      let completedOperations = 0;
      
      // Simulate executing queries for each selected data group
      for (const groupId of selectedDataGroups) {
        // In a real app, this would be sent to a backend job queue
        console.log(`Starting export for ${groupId} with date range ${dateRange.startDate} to ${dateRange.endDate}`);
        
        // Simulating query execution
        const query = getQueryByDataGroup(groupId);
        console.log(`Query for ${groupId}: ${query}`);
        
        // Simulate a delay as if we're executing the query
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        completedOperations++;
        setProgress(Math.round((completedOperations / totalOperations) * 100));
      }

      // Set final status
      setExportStatus(`Data export completed. An email will be sent to ${email} with download links.`);
      
      // In a real app, this is where you'd trigger the email notification
      console.log(`Notification would be sent to ${email}`);
      
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      setExportStatus(null);
    } finally {
      setIsSubmitting(false);
    }
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
            This feature allows authorized users to export large datasets from the PPDS knowledge graph.
            The data will be processed in the background and you will receive an email with links to download the files.
          </p>

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          {exportStatus && !error && (
            <Alert variant="info">
              {exportStatus}
              {isSubmitting && (
                <ProgressBar animated now={progress} className="mt-2" />
              )}
            </Alert>
          )}

          <Form>
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

            {/* Graph Selection */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">Select Graphs</Form.Label>
              <Col sm="9">
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
              </Col>
            </Form.Group>

            {/* Data Groups Selection */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">Data Groups</Form.Label>
              <Col sm="9">
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
                          <div key={group.id} className="mb-3">
                            <h6>{group.label}</h6>
                            <Row>
                              {group.fields.map(field => (
                                <Col sm="6" key={field.id}>
                                  <Form.Check
                                    type="checkbox"
                                    id={`field-${group.id}-${field.id}`}
                                    label={`${field.label}${field.required ? ' *' : ''}`}
                                    checked={field.required}
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

            {/* Email for notification */}
            <Form.Group as={Row} className="mb-3">
              <Form.Label column sm="3">Notification Email</Form.Label>
              <Col sm="9">
                <Form.Control
                  type="email"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <Form.Text className="text-muted">
                  You will receive an email with download links when the export is complete.
                </Form.Text>
              </Col>
            </Form.Group>

            {/* Submit Button */}
            <div className="d-grid gap-2">
              <Button
                variant="primary"
                size="lg"
                onClick={startDataExport}
                disabled={isSubmitting || selectedDataGroups.length === 0 || !email}
              >
                {isSubmitting ? 'Processing...' : 'Start Data Export'}
              </Button>
            </div>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BulkDataExport;
