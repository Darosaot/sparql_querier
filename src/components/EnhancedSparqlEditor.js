// src/components/EnhancedSparqlEditor.js
import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Card, Alert, Row, Col, Tooltip, OverlayTrigger, Badge, Spinner } from 'react-bootstrap';
import { Editor } from '@monaco-editor/react';
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
  { prefix: 'epo', uri: 'http://data.europa.eu/a4g/ontology#', description: 'EU Procurement Ontology' },
  { prefix: 'cccev', uri: 'http://data.europa.eu/m8g/', description: 'Core Criterion and Core Evidence Vocabulary' },
  { prefix: 'locn', uri: 'http://www.w3.org/ns/locn#', description: 'ISA Location Core Vocabulary' },
  { prefix: 'sh', uri: 'http://www.w3.org/ns/shacl#', description: 'Shapes Constraint Language' }
];

// Common endpoint suggestions with procurement focus
const endpointSuggestions = [
  { url: 'https://data.europa.eu/a4g/sparql', description: 'EU TED Data - Public procurement notices' },
  { url: 'https://dbpedia.org/sparql', description: 'DBpedia - General knowledge from Wikipedia' },
  { url: 'https://query.wikidata.org/sparql', description: 'Wikidata - Structured data from Wikimedia projects' },
  { url: 'https://linkedgeodata.org/sparql', description: 'LinkedGeoData - Spatial data from OpenStreetMap' },
  { url: 'https://publications.europa.eu/webapi/rdf/sparql', description: 'CELLAR - EU Publications Office Reference Data' }
];

// SPARQL keywords for autocompletion
const sparqlKeywords = [
  'SELECT', 'DISTINCT', 'WHERE', 'FILTER', 'OPTIONAL', 'UNION', 'MINUS', 
  'GRAPH', 'SERVICE', 'BIND', 'VALUES', 'GROUP BY', 'HAVING', 'ORDER BY', 
  'LIMIT', 'OFFSET', 'ASK', 'CONSTRUCT', 'DESCRIBE', 'COUNT', 'SUM', 'AVG', 
  'MIN', 'MAX', 'FROM', 'FROM NAMED', 'PREFIX', 'BASE', 'IN', 'NOT IN', 
  'EXISTS', 'NOT EXISTS', 'FILTER NOT EXISTS', 'a'
];

const EnhancedSparqlEditor = ({ 
  sparqlEndpoint, 
  setSparqlEndpoint, 
  query, 
  setQuery, 
  onExecute, 
  isLoading 
}) => {
  const [validationResult, setValidationResult] = useState({ valid: true, warnings: [] });
  const [performanceWarnings, setPerformanceWarnings] = useState([]);
  const [suggestedPrefixes, setSuggestedPrefixes] = useState([]);
  const [extractedVariables, setExtractedVariables] = useState([]);
  const [showVariables, setShowVariables] = useState(false);
  const [disableValidation, setDisableValidation] = useState(false);
  const [editorLoaded, setEditorLoaded] = useState(false);
  const editorRef = useRef(null);
  const monacoRef = useRef(null);
  
  // Configure Monaco editor when it loads
  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    setEditorLoaded(true);
    
    // Configure SPARQL language features
    configureSparqlLanguage(monaco);
    
    // Add autocompletion provider
    monaco.languages.registerCompletionItemProvider('sparql', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn
        };
        
        const suggestions = [
          // SPARQL keywords
          ...sparqlKeywords.map(keyword => ({
            label: keyword,
            kind: monaco.languages.CompletionItemKind.Keyword,
            insertText: keyword,
            range: range
          })),
          
          // Common prefixes
          ...commonPrefixes.map(prefix => ({
            label: `PREFIX ${prefix.prefix}: <${prefix.uri}>`,
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: `PREFIX ${prefix.prefix}: <${prefix.uri}>`,
            detail: prefix.description,
            documentation: prefix.description,
            range: range
          })),
          
          // Variables in the query
          ...extractedVariables.map(variable => ({
            label: variable,
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: variable,
            range: range
          }))
        ];
        
        return {
          suggestions: suggestions
        };
      }
    });
    
    // Add linting provider
    const updateDecorations = () => {
      if (!editor) return;
      
      const model = editor.getModel();
      if (!model) return;
      
      const validationResult = validateSparqlQuery(model.getValue());
      setValidationResult(validationResult);
      
      const decorations = [];
      
      if (!validationResult.valid && validationResult.error) {
        // Add error decorations
        const errorMatch = validationResult.error.match(/line (\d+)/i);
        if (errorMatch) {
          const lineNumber = parseInt(errorMatch[1], 10);
          decorations.push({
            range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
            options: {
              isWholeLine: true,
              className: 'error-line',
              glyphMarginClassName: 'error-glyph',
              hoverMessage: { value: validationResult.error }
            }
          });
        }
      }
      
      // Add warning decorations
      if (validationResult.warnings) {
        validationResult.warnings.forEach(warning => {
          const lineMatch = warning.match(/line (\d+)/i);
          if (lineMatch) {
            const lineNumber = parseInt(lineMatch[1], 10);
            decorations.push({
              range: new monaco.Range(lineNumber, 1, lineNumber, model.getLineMaxColumn(lineNumber)),
              options: {
                isWholeLine: true,
                className: 'warning-line',
                glyphMarginClassName: 'warning-glyph',
                hoverMessage: { value: warning }
              }
            });
          }
        });
      }
      
      editor.deltaDecorations([], decorations);
    };
    
    const validateTimer = setTimeout(updateDecorations, 500);
    editor.onDidChangeModelContent(() => {
      clearTimeout(validateTimer);
      setTimeout(updateDecorations, 500);
    });
    
    // Initial validation
    updateDecorations();
  };
  
  // Configure Monaco for SPARQL syntax highlighting
  const configureSparqlLanguage = (monaco) => {
    // Register SPARQL language if it doesn't exist
    if (!monaco.languages.getLanguages().some(lang => lang.id === 'sparql')) {
      monaco.languages.register({ id: 'sparql' });
      
      // Define SPARQL tokens for syntax highlighting
      monaco.languages.setMonarchTokensProvider('sparql', {
        keywords: sparqlKeywords,
        
        operators: [
          '=', '!=', '<', '>', '<=', '>=', '&&', '||', '!', '+', '-', '*', '/', '?', '^', '.'
        ],
        
        tokenizer: {
          root: [
            // Keywords
            [/\b(SELECT|WHERE|FILTER|OPTIONAL|UNION|MINUS|GRAPH|SERVICE|GROUP BY|HAVING|ORDER BY|LIMIT|OFFSET|ASK|CONSTRUCT|DESCRIBE|COUNT|SUM|AVG|MIN|MAX|DISTINCT|REDUCED|FROM|NAMED|PREFIX|BASE|BIND|VALUES|IN|NOT IN|EXISTS|NOT EXISTS)\b/i, 'keyword'],
            
            // Prefixed names
            [/\b[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+\b/, 'string'],
            
            // Variables
            [/\?[a-zA-Z0-9_]+/, 'variable'],
            
            // URI literals
            [/<[^>]+>/, 'string.uri'],
            
            // Prefix declarations
            [/\bPREFIX\s+([a-zA-Z0-9_-]+):/i, 'type'],
            
            // String literals
            [/"([^"\\]|\\.)*"/, 'string'],
            [/'([^'\\]|\\.)*'/, 'string'],
            
            // Comments
            [/#.*$/, 'comment'],
            
            // Operators
            [/[=<>!&|+\-*\/\^\?]/, 'operator'],
            
            // Numbers
            [/\b\d+\.?\d*\b/, 'number']
          ]
        }
      });
      
      // Define editor theme
      monaco.editor.defineTheme('sparqlTheme', {
        base: 'vs',
        inherit: true,
        rules: [
          { token: 'keyword', foreground: '0000FF', fontStyle: 'bold' },
          { token: 'variable', foreground: '7D8600' },
          { token: 'type', foreground: '00627A' },
          { token: 'string.uri', foreground: '067D17' },
          { token: 'string', foreground: '9C2543' },
          { token: 'comment', foreground: '8A8A8A', fontStyle: 'italic' }
        ],
        colors: {
          'editor.foreground': '#000000',
          'editor.background': '#FFFFFF',
          'editor.lineHighlightBackground': '#F0F0F0'
        }
      });
    }
  };
  
  // Handle query change
  const handleQueryChange = (value) => {
    setQuery(value);
    
    // Only perform validation if not disabled
    if (!disableValidation && value && value.length > 10) {
      try {
        const result = validateSparqlQuery(value);
        setValidationResult(result);
        
        // Check for performance issues
        setPerformanceWarnings(checkPerformance(value));
        
        // Suggest prefixes based on URIs in query
        setSuggestedPrefixes(suggestPrefixes(value));
        
        // Extract variables for assistance
        setExtractedVariables(extractVariables(value));
      } catch (err) {
        console.warn("Validation error:", err);
        // Don't block the user if validation fails
      }
    }
  };
  
  // Effect to perform initial checks when component mounts or query changes dramatically
  useEffect(() => {
    if (query) {
      try {
        // Only perform validation if not disabled
        if (!disableValidation) {
          // Validate the query
          const result = validateSparqlQuery(query);
          setValidationResult(result);
          
          // Check for performance issues
          setPerformanceWarnings(checkPerformance(query));
          
          // Get prefix suggestions
          setSuggestedPrefixes(suggestPrefixes(query));
          
          // Extract variables
          setExtractedVariables(extractVariables(query));
        }
      } catch (err) {
        console.warn("Initial validation error:", err);
        // Don't block the user if validation fails
      }
    }
  }, [query, disableValidation]);

  // Handle template selection
  const handleTemplateChange = (e) => {
    const selectedTemplate = e.target.value;
    const templateQuery = queryTemplates[selectedTemplate] || '';
    setQuery(templateQuery);
    
    // Validate the selected template
    if (templateQuery && !disableValidation) {
      try {
        const result = validateSparqlQuery(templateQuery);
        setValidationResult(result);
      } catch (err) {
        console.warn("Template validation error:", err);
      }
    }
  };

  // Handle execution with controlled validation
  const handleExecuteQuery = () => {
    if (!sparqlEndpoint) {
      setValidationResult({ valid: false, error: 'Please provide a SPARQL endpoint URL' });
      return;
    }
    
    if (!disableValidation) {
      // Perform validation before execution
      try {
        const result = validateSparqlQuery(query);
        setValidationResult(result);
        
        if (!result.valid) {
          return; // Don't execute if validation fails
        }
      } catch (err) {
        console.warn("Execution validation error:", err);
        // Continue with execution even if validation fails
      }
    }
    
    // Execute the query regardless of validation errors if disableValidation is true
    onExecute();
  };

  // Add common prefix to query
  const addPrefix = (prefix, uri) => {
    // Check if the prefix is already in the query
    if (!query.includes(`PREFIX ${prefix}:`)) {
      const prefixDeclaration = `PREFIX ${prefix}: <${uri}>\n`;
      
      // Insert at the beginning or after other prefixes
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        const lines = model.getLinesContent();
        let lastPrefixLine = -1;
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].trim().toUpperCase().startsWith('PREFIX')) {
            lastPrefixLine = i;
          }
        }
        
        const position = lastPrefixLine >= 0 
          ? { lineNumber: lastPrefixLine + 1, column: 1 } 
          : { lineNumber: 1, column: 1 };
        
        const range = {
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        };
        
        // Apply the edit directly to the editor
        editorRef.current.executeEdits('', [
          { range, text: lastPrefixLine >= 0 ? prefixDeclaration : prefixDeclaration }
        ]);
      } else {
        // Fallback if editor reference is not available
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
      }
    }
  };

  // Format the query
  const handleFormatQuery = () => {
    try {
      const formatted = formatSparqlQuery(query);
      setQuery(formatted);
      
      // Update the editor value
      if (editorRef.current) {
        editorRef.current.setValue(formatted);
      }
    } catch (err) {
      console.warn("Formatting error:", err);
      // Don't change the query if formatting fails
    }
  };

  // Add missing structure to the query
  const handleAddStructure = () => {
    try {
      const completeQuery = addMissingStructure(query);
      setQuery(completeQuery);
      
      // Update the editor value
      if (editorRef.current) {
        editorRef.current.setValue(completeQuery);
      }
      
      // Validate the new query
      if (!disableValidation) {
        const result = validateSparqlQuery(completeQuery);
        setValidationResult(result);
      }
    } catch (err) {
      console.warn("Structure addition error:", err);
      // Don't change the query if structure addition fails
    }
  };
  
  // Add LIMIT if missing
  const addLimit = () => {
    try {
      if (!query.toUpperCase().includes('LIMIT')) {
        let updatedQuery = query.trim();
        updatedQuery += '\nLIMIT 100';
        setQuery(updatedQuery);
        
        // Update the editor value
        if (editorRef.current) {
          editorRef.current.setValue(updatedQuery);
        }
      }
    } catch (err) {
      console.warn("Limit addition error:", err);
      // Don't change the query if limit addition fails
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
              <div className="d-flex align-items-center">
                <Form.Check 
                  type="switch"
                  id="disable-validation"
                  label="Advanced Mode (disable validation)"
                  checked={disableValidation}
                  onChange={(e) => setDisableValidation(e.target.checked)}
                  className="me-3"
                />
                <Button 
                  variant="outline-secondary" 
                  size="sm"
                  onClick={() => setShowVariables(!showVariables)}
                >
                  {showVariables ? 'Hide Variables' : 'Show Variables'} ({extractedVariables.length})
                </Button>
              </div>
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
            
            <div className="editor-container rounded border">
              {!editorLoaded && (
                <div className="text-center p-3">
                  <Spinner animation="border" size="sm" className="me-2" />
                  Loading editor...
                </div>
              )}
              <Editor
                height="300px"
                language="sparql"
                theme="sparqlTheme"
                value={query}
                onChange={handleQueryChange}
                onMount={handleEditorDidMount}
                options={{
                  minimap: { enabled: false },
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                  scrollbar: {
                    vertical: 'auto',
                    horizontal: 'auto'
                  },
                  folding: true,
                  wordWrap: 'on'
                }}
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
              {disableValidation && (
                <span className="text-warning ms-1">
                  <strong>Advanced Mode:</strong> Validation is disabled for complex queries.
                </span>
              )}
            </Form.Text>
          </Form.Group>

          {/* Validation messages - only show if validation is not disabled */}
          {!disableValidation && !validationResult.valid && (
            <Alert variant="danger" className="mt-3">
              <strong>Error:</strong> {validationResult.error}
            </Alert>
          )}
          
          {!disableValidation && validationResult.valid && validationResult.warnings && validationResult.warnings.length > 0 && (
            <Alert variant="warning" className="mt-3">
              <strong>Syntax Warnings:</strong>
              <ul className="mb-0">
                {validationResult.warnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            </Alert>
          )}
          
          {/* Performance warnings - only show if validation is not disabled */}
          {!disableValidation && performanceWarnings.length > 0 && (
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
              disabled={isLoading || !sparqlEndpoint || (!disableValidation && !validationResult.valid)}
              className="px-4"
            >
              {isLoading ? (
                <>
                  <Spinner animation="border" size="sm" className="me-2" role="status" aria-hidden="true" />
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
                    if (editorRef.current) {
                      editorRef.current.setValue('');
                    }
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
