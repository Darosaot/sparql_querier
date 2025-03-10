// src/components/EnhancedSparqlEditor.js
import React, { useState, useRef, useEffect } from 'react';
import { Form, Button, Card, Alert, Row, Col, Tooltip, OverlayTrigger, Badge } from 'react-bootstrap';
import queryTemplates from '../data/queryTemplates';
import { 
  validateSparqlQuery, 
  formatSparqlQuery, 
  extractPrefixes,
  extractVariables,
  suggestPrefixes,
  checkPerformance,
  addMissingStructure
} from '../utils/sparqlUtils';
import './EnhancedSparqlEditor.css';

// List of common SPARQL prefixes with tooltips
const commonPrefixes = [
  { prefix: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', description: 'RDF basic vocabulary' },
  { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#', description: 'RDF Schema vocabulary' },
  { prefix: 'owl', uri: 'http://www.w3.org/2002/07/owl#', description: 'Web Ontology Language' },
  { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#', description: 'XML Schema Datatypes' },
  { prefix: 'foaf', uri: 'http://xmlns.com/foaf/0.1/', description: 'Friend of a Friend vocabulary' },
  { prefix: 'dc', uri: 'http://purl.org/dc/elements/1.1/', description: 'Dublin Core elements' },
  { prefix: 'dct', uri: 'http://purl.org/dc/terms/', description: 'Dublin Core terms' },
  { prefix: 'skos', uri: 'http://www.w3.org/2004/02/skos/core#', description: 'Simple Knowledge Organization System' },
  { prefix: 'epo', uri: 'http://data.europa.eu/a4g/ontology#', description: 'EU Procurement Ontology' }
];

// Common endpoint suggestions
const endpointSuggestions = [
  { url: 'https://dbpedia.org/sparql', description: 'DBpedia - General knowledge from Wikipedia' },
  { url: 'https://query.wikidata.org/sparql', description: 'Wikidata - Structured data from Wikimedia projects' },
  { url: 'http://linkedgeodata.org/sparql', description: 'LinkedGeoData - Spatial data from OpenStreetMap' },
  { url: 'https://publications.europa.eu/webapi/rdf/sparql', description: 'CELLAR - EU Publications Office Reference Data' }
];

// Line number helper function
const LineNumbers = ({ lines }) => {
  return (
    <div className="line-numbers">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="line-number">{i + 1}</div>
      ))}
    </div>
  );
};

const EnhancedSparqlEditor = ({ 
  sparqlEndpoint, 
  setSparqlEndpoint, 
  query, 
  setQuery, 
  onExecute, 
  isLoading 
}) => {
  const [validationResult, setValidationResult] = useState({ valid: true, warnings: [] });
  const [lineCount, setLineCount] = useState(1);
  const [performanceWarnings, setPerformanceWarnings] = useState([]);
  const [suggestedPrefixes, setSuggestedPrefixes] = useState([]);
  const [extractedVariables, setExtractedVariables] = useState([]);
  const [showVariables, setShowVariables] = useState(false);
  const textareaRef = useRef(null);
  
  // Handle query change
  const handleQueryChange = (e) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    
    // Update line count for line numbers
    setLineCount((newQuery.match(/\n/g) || []).length + 1);
    
    // Debounced validation for immediate feedback
    if (newQuery.length > 10) {
      const result = validateSparqlQuery(newQuery);
      setValidationResult(result);
      
      // Check for performance issues
      setPerformanceWarnings(checkPerformance(newQuery));
      
      // Suggest prefixes based on URIs in query
      setSuggestedPrefixes(suggestPrefixes(newQuery));
      
      // Extract variables for assistance
      setExtractedVariables(extractVariables(newQuery));
    }
  };
  
  // Effect to perform initial checks when component mounts or query changes dramatically
  useEffect(() => {
    if (query) {
      // Validate the query
      const result = validateSparqlQuery(query);
      setValidationResult(result);
      
      // Check for performance issues
      setPerformanceWarnings(checkPerformance(query));
      
      // Get prefix suggestions
      setSuggestedPrefixes(suggestPrefixes(query));
      
      // Extract variables
      setExtractedVariables(extractVariables(query));
      
      // Update line count
      setLineCount((query.match(/\n/g) || []).length + 1);
    }
  }, []);

  // Handle template selection
  const handleTemplateChange = (e) => {
    const selectedTemplate = e.target.value;
    const templateQuery = queryTemplates[selectedTemplate] || '';
    setQuery(templateQuery);
    
    // Update line count
    setLineCount((templateQuery.match(/\n/g) || []).length + 1);
    
    // Validate the selected template
    if (templateQuery) {
      const result = validateSparqlQuery(templateQuery);
      setValidationResult(result);
    }
  };

  // Handle execution with validation
  const handleExecuteQuery = () => {
    if (!sparqlEndpoint) {
      setValidationResult({ valid: false, error: 'Please provide a SPARQL endpoint URL' });
      return;
    }
    
    const result = validateSparqlQuery(query);
    setValidationResult(result);
    
    if (result.valid) {
      onExecute();
    }
  };

  // Add common prefix to query
  const addPrefix = (prefix, uri) => {
    // Check if the prefix is already in the query
    if (!query.includes(`PREFIX ${prefix}:`)) {
      const prefixDeclaration = `PREFIX ${prefix}: <${uri}>\n`;
      
      // Add at the beginning or after other prefixes
      const lines = query.split('\n');
      let lastPrefixIndex = -1;
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].trim().toUpperCase().startsWith('PREFIX')) {
          lastPrefixIndex = i;
        }
      }
      
      if (lastPrefixIndex >= 0) {
        // Insert after the last prefix
        lines.splice(lastPrefixIndex + 1, 0, prefixDeclaration);
      } else {
        // Insert at the beginning
        lines.unshift(prefixDeclaration);
      }
      
      const updatedQuery = lines.join('\n');
      setQuery(updatedQuery);
      setLineCount((updatedQuery.match(/\n/g) || []).length + 1);
    }
  };

  // Format the query
  const handleFormatQuery = () => {
    const formatted = formatSparqlQuery(query);
    setQuery(formatted);
    setLineCount((formatted.match(/\n/g) || []).length + 1);
  };

  // Add missing structure to the query
  const handleAddStructure = () => {
    const completeQuery = addMissingStructure(query);
    setQuery(completeQuery);
    setLineCount((completeQuery.match(/\n/g) || []).length + 1);
    
    // Validate the new query
    const result = validateSparqlQuery(completeQuery);
    setValidationResult(result);
  };
  
  // Add LIMIT if missing
  const addLimit = () => {
    if (!query.toUpperCase().includes('LIMIT')) {
      let updatedQuery = query.trim();
      updatedQuery += '\nLIMIT 100';
      setQuery(updatedQuery);
      setLineCount((updatedQuery.match(/\n/g) || []).length + 1);
    }
  };

  return (
    <Card>
      <Card.Header as="h5">SPARQL Editor</Card.Header>
      <Card.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>SPARQL Endpoint</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter SPARQL endpoint URL"
              value={sparqlEndpoint}
              onChange={(e) => setSparqlEndpoint(e.target.value)}
              list="endpointSuggestions"
            />
            <datalist id="endpointSuggestions">
              {endpointSuggestions.map((endpoint, index) => (
                <option key={index} value={endpoint.url} label={endpoint.description} />
              ))}
            </datalist>
            <Form.Text className="text-muted">
              Example: https://dbpedia.org/sparql or https://data.europa.eu/a4g/sparql
            </Form.Text>
          </Form.Group>

          <Form.Group className="mb-3">
            <Form.Label>Query Templates</Form.Label>
            <Form.Select onChange={handleTemplateChange}>
              {Object.keys(queryTemplates).map((template) => (
                <option key={template} value={template}>
                  {template}
                </option>
              ))}
            </Form.Select>
          </Form.Group>

          <Row className="mb-3">
            <Col md={6}>
              <Form.Group>
                <Form.Label>Common Prefixes</Form.Label>
                <div className="d-flex flex-wrap gap-1 mb-2">
                  {commonPrefixes.map((prefixInfo, index) => (
                    <OverlayTrigger
                      key={index}
                      placement="top"
                      overlay={<Tooltip>{prefixInfo.description}<br/>{prefixInfo.uri}</Tooltip>}
                    >
                      <Button 
                        variant="outline-secondary" 
                        size="sm"
                        onClick={() => addPrefix(prefixInfo.prefix, prefixInfo.uri)}
                      >
                        {prefixInfo.prefix}
                      </Button>
                    </OverlayTrigger>
                  ))}
                </div>
              </Form.Group>
            </Col>
            
            <Col md={6}>
              {suggestedPrefixes.length > 0 && (
                <Form.Group>
                  <Form.Label>
                    Suggested Prefixes 
                    <Badge bg="info" className="ms-2">
                      {suggestedPrefixes.length}
                    </Badge>
                  </Form.Label>
                  <div className="d-flex flex-wrap gap-1 mb-2">
                    {suggestedPrefixes.map((suggestion, index) => (
                      <OverlayTrigger
                        key={index}
                        placement="top"
                        overlay={<Tooltip>{suggestion.uri}</Tooltip>}
                      >
                        <Button 
                          variant="outline-info" 
                          size="sm"
                          onClick={() => addPrefix(suggestion.prefix, suggestion.uri)}
                        >
                          {suggestion.prefix}
                        </Button>
                      </OverlayTrigger>
                    ))}
                  </div>
                </Form.Group>
              )}
            </Col>
          </Row>

          <Form.Group className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <Form.Label>SPARQL Query</Form.Label>
              <Button 
                variant="outline-secondary" 
                size="sm"
                onClick={() => setShowVariables(!showVariables)}
              >
                {showVariables ? 'Hide Variables' : 'Show Variables'} ({extractedVariables.length})
              </Button>
            </div>
            
            {showVariables && extractedVariables.length > 0 && (
              <div className="mb-2 p-2 border rounded bg-light">
                <small className="text-muted">Variables in query:</small>
                <div className="d-flex flex-wrap gap-1 mt-1">
                  {extractedVariables.map((variable, index) => (
                    <Badge key={index} bg="secondary" className="me-1">
                      {variable}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            
            <div className="editor-container d-flex border rounded">
              <div className="line-numbers-container p-2 bg-light border-end">
                <LineNumbers lines={lineCount} />
              </div>
              <Form.Control
                ref={textareaRef}
                as="textarea"
                rows={15}
                placeholder="Enter your SPARQL query here..."
                value={query}
                onChange={handleQueryChange}
                className="border-0"
                style={{ resize: 'vertical', fontFamily: 'monospace' }}
                spellCheck="false"
              />
            </div>
            
            <Row className="mt-2">
              <Col>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={handleFormatQuery}
                  className="me-2"
                  title="Beautify and indent the query"
                >
                  <i className="bi bi-braces"></i> Format Query
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={handleAddStructure}
                  className="me-2"
                  title="Fix or add missing query structure"
                >
                  <i className="bi bi-tools"></i> Fix Structure
                </Button>
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={addLimit}
                  className="me-2"
                  title="Add LIMIT 100 to the query"
                >
                  <i className="bi bi-chevron-bar-down"></i> Add LIMIT
                </Button>
              </Col>
            </Row>
            
            <Form.Text className="text-muted mt-2">
              Use the buttons above to format your query or add common structure elements.
            </Form.Text>
          </Form.Group>

          {/* Validation messages */}
          {!validationResult.valid && (
            <Alert variant="danger" className="mt-3">
              <strong>Error:</strong> {validationResult.error}
            </Alert>
          )}
          
          {validationResult.valid && validationResult.warnings && validationResult.warnings.length > 0 && (
            <Alert variant="warning" className="mt-3">
              <strong>Syntax Warnings:</strong>
              <ul className="mb-0">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}
          
          {/* Performance warnings */}
          {performanceWarnings.length > 0 && (
            <Alert variant="info" className="mt-3">
              <strong>Performance Recommendations:</strong>
              <ul className="mb-0">
                {performanceWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}

          <div className="d-flex justify-content-between mt-3">
            <Button 
              variant="primary" 
              onClick={handleExecuteQuery} 
              disabled={isLoading || !sparqlEndpoint || !validationResult.valid}
              className="px-4"
            >
              {isLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  Executing...
                </>
              ) : (
                'Execute Query'
              )}
            </Button>
            
            <div>
              <Button 
                variant="outline-secondary" 
                onClick={() => {
                  if (window.confirm('Are you sure you want to clear the query?')) {
                    setQuery('');
                    setLineCount(1);
                  }
                }}
                className="me-2"
              >
                Clear
              </Button>
              
              <OverlayTrigger
                placement="top"
                overlay={<Tooltip>Learn about SPARQL syntax</Tooltip>}
              >
                <Button 
                  variant="outline-info"
                  as="a"
                  href="https://www.w3.org/TR/sparql11-query/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  SPARQL Help
                </Button>
              </OverlayTrigger>
            </div>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default EnhancedSparqlEditor;
