import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Nav, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from './Header';
import QueryEditor from './QueryEditor';
import ResultsTable from './ResultsTable';
import Visualization from './Visualization';
import RegressionAnalysis from './RegressionAnalysis';
import DataOperations from './DataOperations';
import ExportOptions from './ExportOptions';
import BulkDataExport from './BulkDataExport';
import QueryHistory from './QueryHistory';
import DashboardManager from './DashboardManager';
import { executeQuery, isValidSparql } from '../api/sparqlService';

function App() {
  // State for query and results
  const [sparqlEndpoint, setSparqlEndpoint] = useState('');
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sparql-query');
  
  // State for query history
  const [queryHistory, setQueryHistory] = useState([]);
  
  // Load query history from localStorage when component mounts
  useEffect(() => {
    const savedQueries = localStorage.getItem('queryHistory');
    if (savedQueries) {
      try {
        setQueryHistory(JSON.parse(savedQueries));
      } catch (err) {
        console.error('Error loading query history:', err);
        // If there's an error parsing, initialize with empty array
        setQueryHistory([]);
      }
    }
  }, []);
  
  // Save query history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('queryHistory', JSON.stringify(queryHistory));
  }, [queryHistory]);
  
  // Function to handle query execution
  const handleExecuteQuery = async () => {
    if (!sparqlEndpoint) {
      setError('Please provide a SPARQL endpoint URL');
      return;
    }
    
    if (!isValidSparql(query)) {
      setError('The SPARQL query seems to be invalid. Please check the syntax.');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery(sparqlEndpoint, query);
      
      if (result.success) {
        setQueryResults(result);
        
        // Save the query to history
        const timestamp = new Date().toISOString();
        const queryName = getQueryName(query);
        
        // Create a new history entry
        const historyEntry = {
          id: timestamp, // Use timestamp as ID
          timestamp,
          name: queryName,
          query,
          endpoint: sparqlEndpoint,
          resultCount: result.data.length,
          executionTime: result.executionTime,
          bookmarked: false // Not bookmarked by default
        };
        
        // Add to history (newest first)
        setQueryHistory(prevHistory => [historyEntry, ...prevHistory]);
        
        if (result.data.length === 0) {
          setError('No results found.');
        }
      } else {
        setError(`An error occurred during query execution: ${result.error}`);
      }
    } catch (err) {
      setError(`Failed to execute query: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };
  
  // Helper function to extract a name from the query
  const getQueryName = (queryText) => {
    // Look for SELECT or CONSTRUCT keyword
    const selectMatch = queryText.match(/SELECT\s+.+?\s+WHERE/i);
    if (selectMatch) {
      // Extract and return up to 30 characters after SELECT
      const extractedText = selectMatch[0]
        .replace(/SELECT\s+/i, '')
        .replace(/\s+WHERE$/, '')
        .trim();
      return extractedText.length > 30 
        ? extractedText.substring(0, 30) + '...' 
        : extractedText;
    }
    
    // If no pattern is found, return a generic name with timestamp
    return `Query ${new Date().toLocaleTimeString()}`;
  };
  
  // Handle loading a query from history
  const handleLoadQuery = (historyItem) => {
    setQuery(historyItem.query);
    setSparqlEndpoint(historyItem.endpoint);
    setActiveTab('sparql-query');
  };
  
  // Handle deleting a query from history
  const handleDeleteQuery = (queryId) => {
    setQueryHistory(prevHistory => 
      prevHistory.filter(item => item.id !== queryId)
    );
  };
  
  // Handle bookmarking a query
  const handleBookmarkQuery = (queryId) => {
    setQueryHistory(prevHistory => 
      prevHistory.map(item => 
        item.id === queryId 
          ? { ...item, bookmarked: !item.bookmarked } 
          : item
      )
    );
  };
  
  return (
    <div className="App">
      <Header />
      <Container fluid>
        <Tab.Container activeKey={activeTab} onSelect={(key) => setActiveTab(key)}>
          <Row className="mt-3 mb-3">
            <Col>
              <Nav variant="tabs">
                <Nav.Item>
                  <Nav.Link eventKey="sparql-query">SPARQL Query</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="query-history">Query History</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="dashboards">Dashboards</Nav.Link>
                </Nav.Item>
                <Nav.Item>
                  <Nav.Link eventKey="bulk-export">Bulk Data Export</Nav.Link>
                </Nav.Item>
              </Nav>
            </Col>
          </Row>
          
          <Row>
            <Col>
              <Tab.Content>
                <Tab.Pane eventKey="sparql-query">
                  <QueryEditor 
                    sparqlEndpoint={sparqlEndpoint}
                    setSparqlEndpoint={setSparqlEndpoint}
                    query={query}
                    setQuery={setQuery}
                    onExecute={handleExecuteQuery}
                    isLoading={isLoading}
                  />
                  
                  {error && (
                    <div className="alert alert-danger mt-3" role="alert">
                      {error}
                    </div>
                  )}
                  
                  {queryResults && queryResults.data.length > 0 && (
                    <>
                      <div className="alert alert-success mt-3" role="alert">
                        Query executed successfully, retrieved {queryResults.data.length} results in {queryResults.executionTime.toFixed(2)} seconds.
                      </div>
                      
                      <div className="mt-4">
                        <h3>Results</h3>
                        <ResultsTable data={queryResults.data} columns={queryResults.columns} />
                      </div>
                      
                      <div className="mt-4">
                        <h3>Data Operations</h3>
                        <DataOperations data={queryResults.data} columns={queryResults.columns} />
                      </div>
                      
                      <div className="mt-4">
                        <h3>Data Visualization</h3>
                        <Visualization data={queryResults.data} columns={queryResults.columns} />
                      </div>
                      
                      <div className="mt-4">
                        <h3>Regression Analysis</h3>
                        <RegressionAnalysis data={queryResults.data} columns={queryResults.columns} />
                      </div>
                      
                      <div className="mt-4 mb-5">
                        <h3>Export Results</h3>
                        <ExportOptions data={queryResults.data} columns={queryResults.columns} />
                      </div>
                    </>
                  )}
                </Tab.Pane>
                
                <Tab.Pane eventKey="query-history">
                  <QueryHistory 
                    queries={queryHistory}
                    onLoadQuery={handleLoadQuery}
                    onDeleteQuery={handleDeleteQuery}
                    onBookmarkQuery={handleBookmarkQuery}
                  />
                </Tab.Pane>
                
                <Tab.Pane eventKey="dashboards">
                  <DashboardManager />
                </Tab.Pane>
                
                <Tab.Pane eventKey="bulk-export">
                  <BulkDataExport />
                </Tab.Pane>
              </Tab.Content>
            </Col>
          </Row>
        </Tab.Container>
      </Container>
    </div>
  );
}

export default App;
