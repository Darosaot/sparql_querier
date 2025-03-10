import React, { useState } from 'react';
import { Container, Row, Col, Nav, Tab } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import Header from './Header';
import QueryEditor from './QueryEditor';
import ResultsTable from './ResultsTable';
import Visualization from './Visualization';
import RegressionAnalysis from './RegressionAnalysis';
import DataOperations from './DataOperations'; // Import the new component
import ExportOptions from './ExportOptions';
import BulkDataExport from './BulkDataExport';
import { executeQuery, isValidSparql } from '../api/sparqlService';

function App() {
  // State for query and results
  const [sparqlEndpoint, setSparqlEndpoint] = useState('');
  const [query, setQuery] = useState('');
  const [queryResults, setQueryResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sparql-query');
  
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
