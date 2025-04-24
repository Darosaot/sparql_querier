// src/components/App.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, useRouteError } from 'react-router-dom';
import { Container, Row, Col, Nav, Tab, Alert } from 'react-bootstrap';
import SparqlInput from './SparqlInput';
import ErrorDisplay from './ErrorDisplay';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap-icons/font/bootstrap-icons.css'; // Add Bootstrap Icons
import './App.css';
import Header from './Header';
import Visualization from './Visualization';
import RegressionAnalysis from './RegressionAnalysis';
import DataOperations from './DataOperations';
import ExportOptions from './ExportOptions';
import QueryHistory from './QueryHistory';
import DashboardManager from './DashboardManager';
import { executeQuery, isValidSparql } from '../api/sparqlService';
import ResultsTable from './ResultsTable';
import SuccessDisplay from './SuccessDisplay';
import SharedDashboard from './SharedDashboard';


// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>;
    }
    return this.props.children;
  }
}

// Main App component
function App() {
  // State for query and results
  const [sparqlEndpoint, setSparqlEndpoint] = useState('');
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [queryName, setQueryName] = useState('');
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
    
    if (query && !isValidSparql(query)) {
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
        const timestamp = new Date().getTime();
        
        const queryNameAux = getQueryName(query);
        // Create a new history entry
        const historyEntry = {
          id: timestamp,
          name: queryNameAux,
          query: query,
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
  
  const Home = () => (
    <div>
        <Header />
        <Container fluid className="mb-5">
          <Tab.Container activeKey={activeTab} onSelect={(key) => setActiveTab(key)}>
            <Row className="mt-3 mb-4">
              <Col>
                <Nav variant="tabs" className="nav-tabs-custom">
                  <Nav.Item>
                    <Nav.Link eventKey="sparql-query">SPARQL Query</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="query-history">Query History</Nav.Link>
                  </Nav.Item>
                  <Nav.Item>
                    <Nav.Link eventKey="dashboards">Dashboards</Nav.Link>
                  </Nav.Item>
                </Nav>
              </Col>
            </Row>
            
            <Row>
              <Col>
                <Tab.Content>
                  <Tab.Pane eventKey="sparql-query">
                  <div>
                      {/* Use our SparqlInput component */}
                      <SparqlInput
                        sparqlEndpoint={sparqlEndpoint}
                        setSparqlEndpoint={setSparqlEndpoint}
                        query={query}
                        setQuery={setQuery}
                        isLoading={isLoading}
                        onExecute={handleExecuteQuery}
                      />
                      {error && <ErrorDisplay error={error} />}
                      {queryResults && queryResults.data.length > 0 && (
                        <>
                          <SuccessDisplay
                            resultCount={queryResults.data.length}
                            columnCount={queryResults.columns.length}
                            executionTime={queryResults.executionTime}
                          />
                          <div className="mt-4">
                            <h3 className="mb-3">Results</h3>
                            <ResultsTable data={queryResults.data} columns={queryResults.columns} />
                          </div>
                          <div className="mt-4">
                            <h3 className="mb-3">Data Visualization</h3>
                          <Visualization data={queryResults.data} columns={queryResults.columns} />
                        </div>
                        <div className="mt-4">
                          <h3 className="mb-3">Data Operations</h3>
                          <DataOperations data={queryResults.data} columns={queryResults.columns} />
                        </div>
                        <div className="mt-4">
                          <h3 className="mb-3">Regression Analysis</h3>
                          <RegressionAnalysis data={queryResults.data} columns={queryResults.columns} />
                        </div>
                        <div className="mt-4 mb-5">
                          <h3 className="mb-3">Export Results</h3>
                          <ExportOptions data={queryResults.data} columns={queryResults.columns} />
                        </div>
                        </>
                      )}
                    </div>

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
                </Tab.Content>
              </Col>
            </Row>
          </Tab.Container>
        </Container> 
        {/* Footer */}
        <footer className="app-footer">
          <Container>
            <Row>
              <Col className="text-center">
                <p>&copy; {new Date().getFullYear()} SPARQL Analytics. All rights reserved.</p>
                <p className="small mb-0">A modern tool for querying and visualizing SPARQL endpoints.</p>
              </Col>
            </Row>
          </Container>
          {/* Footer */}
          <footer className="app-footer">
          </footer>
    </div>
    </div>
    
  );

  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/shared/:shareToken" element={<SharedDashboard />} />
    </Routes>
        </ErrorBoundary>

  )
}


export default App;

