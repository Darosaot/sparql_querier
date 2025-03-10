import React, { useState } from 'react';
import { Card, Table, Button, Badge, Form, Row, Col, InputGroup } from 'react-bootstrap';

/**
 * QueryHistory component to track and manage previous SPARQL queries
 */
const QueryHistory = ({ queries, onLoadQuery, onDeleteQuery, onBookmarkQuery }) => {
  // State for filtering and sorting
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBookmarked, setFilterBookmarked] = useState(false);
  const [sortBy, setSortBy] = useState('date');
  const [sortDirection, setSortDirection] = useState('desc');
  
  // Filter and sort the queries based on user selections
  const filteredQueries = queries
    .filter(query => 
      // Filter by search term
      (query.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       query.endpoint.toLowerCase().includes(searchTerm.toLowerCase()) ||
       query.query.toLowerCase().includes(searchTerm.toLowerCase())) &&
      // Filter by bookmarked status
      (!filterBookmarked || query.bookmarked)
    )
    .sort((a, b) => {
      // Sort by the selected field
      let comparison = 0;
      
      switch (sortBy) {
        case 'date':
          comparison = new Date(b.timestamp) - new Date(a.timestamp);
          break;
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'rows':
          comparison = b.resultCount - a.resultCount;
          break;
        case 'endpoint':
          comparison = a.endpoint.localeCompare(b.endpoint);
          break;
        default:
          comparison = new Date(b.timestamp) - new Date(a.timestamp);
      }
      
      // Apply the sort direction
      return sortDirection === 'asc' ? -comparison : comparison;
    });
  
  // Handle click on sort header
  const handleSortClick = (field) => {
    if (sortBy === field) {
      // Toggle direction if same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // Change field and reset direction
      setSortBy(field);
      setSortDirection('desc');
    }
  };
  
  // Get sort indicator (arrow)
  const getSortIndicator = (field) => {
    if (sortBy !== field) return null;
    return sortDirection === 'asc' ? '↑' : '↓';
  };
  
  return (
    <Card>
      <Card.Header as="h5">Query History</Card.Header>
      <Card.Body>
        <p className="text-muted">
          View and manage your previous SPARQL queries. Click on a query to load it again.
        </p>
        
        {/* Search and filter controls */}
        <Row className="mb-3">
          <Col md={8}>
            <InputGroup>
              <InputGroup.Text>Search</InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="Search by name, endpoint or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </InputGroup>
          </Col>
          <Col md={4}>
            <Form.Check
              type="switch"
              id="bookmark-filter"
              label="Show bookmarked only"
              checked={filterBookmarked}
              onChange={(e) => setFilterBookmarked(e.target.checked)}
            />
          </Col>
        </Row>
        
        {/* Display when no queries are found */}
        {filteredQueries.length === 0 ? (
          <div className="text-center p-4 text-muted">
            <p>No queries found.</p>
            {queries.length > 0 && (
              <p>Try adjusting your search or filter settings.</p>
            )}
          </div>
        ) : (
          <div className="table-responsive">
            <Table hover>
              <thead>
                <tr>
                  <th style={{ width: '40px' }}></th> {/* Bookmark column */}
                  <th 
                    onClick={() => handleSortClick('name')}
                    style={{ cursor: 'pointer' }}
                  >
                    Name {getSortIndicator('name')}
                  </th>
                  <th 
                    onClick={() => handleSortClick('endpoint')}
                    style={{ cursor: 'pointer' }}
                  >
                    Endpoint {getSortIndicator('endpoint')}
                  </th>
                  <th 
                    onClick={() => handleSortClick('rows')}
                    style={{ cursor: 'pointer', width: '100px' }}
                  >
                    Rows {getSortIndicator('rows')}
                  </th>
                  <th 
                    onClick={() => handleSortClick('date')}
                    style={{ cursor: 'pointer', width: '180px' }}
                  >
                    Date {getSortIndicator('date')}
                  </th>
                  <th style={{ width: '130px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueries.map((query) => (
                  <tr key={query.id}>
                    <td className="text-center">
                      {query.bookmarked && <span className="text-warning">★</span>}
                    </td>
                    <td>{query.name || 'Unnamed Query'}</td>
                    <td>{query.endpoint}</td>
                    <td>{query.resultCount}</td>
                    <td>{new Date(query.timestamp).toLocaleString()}</td>
                    <td>
                      <Button 
                        variant="outline-primary" 
                        size="sm" 
                        className="me-1"
                        onClick={() => onLoadQuery(query)}
                        title="Load Query"
                      >
                        Load
                      </Button>
                      <Button 
                        variant={query.bookmarked ? "warning" : "outline-warning"}
                        size="sm" 
                        className="me-1"
                        onClick={() => onBookmarkQuery(query.id)}
                        title={query.bookmarked ? "Remove Bookmark" : "Bookmark"}
                      >
                        ★
                      </Button>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => onDeleteQuery(query.id)}
                        title="Delete Query"
                      >
                        ×
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default QueryHistory;
