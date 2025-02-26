import React from 'react';
import { Form, Button, Card } from 'react-bootstrap';
import queryTemplates from '../data/queryTemplates';

const QueryEditor = ({ 
  sparqlEndpoint, 
  setSparqlEndpoint, 
  query, 
  setQuery, 
  onExecute, 
  isLoading 
}) => {
  // Handle template selection
  const handleTemplateChange = (e) => {
    const selectedTemplate = e.target.value;
    setQuery(queryTemplates[selectedTemplate] || '');
  };

  return (
    <Card>
      <Card.Header as="h5">SPARQL Editor & Querier</Card.Header>
      <Card.Body>
        <Form>
          <Form.Group className="mb-3">
            <Form.Label>SPARQL Endpoint</Form.Label>
            <Form.Control
              type="text"
              placeholder="Enter SPARQL endpoint URL"
              value={sparqlEndpoint}
              onChange={(e) => setSparqlEndpoint(e.target.value)}
            />
            <Form.Text className="text-muted">
              Example: https://dbpedia.org/sparql
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

          <Form.Group className="mb-3">
            <Form.Label>SPARQL Query</Form.Label>
            <Form.Control
              as="textarea"
              rows={10}
              placeholder="Enter your SPARQL query here..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Form.Text className="text-muted">
              Make sure to include PREFIX declarations if necessary.
            </Form.Text>
          </Form.Group>

          <Button 
            variant="primary" 
            onClick={onExecute} 
            disabled={isLoading || !sparqlEndpoint}
          >
            {isLoading ? 'Executing...' : 'Execute Query'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default QueryEditor;
