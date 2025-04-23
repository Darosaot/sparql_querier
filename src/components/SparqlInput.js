// src/components/SparqlInput.js
import React from 'react';
import { Form, Button, Spinner } from 'react-bootstrap';

function SparqlInput({ sparqlEndpoint, setSparqlEndpoint, query, setQuery, isLoading, onExecute }) {
  const handleEndpointChange = (event) => {
    setSparqlEndpoint(event.target.value);
  };

  const handleQueryChange = (event) => {
    setQuery(event.target.value);
  };

  return (
    <Form>
      <Form.Group className="mb-3" controlId="sparqlEndpoint">
        <Form.Label>SPARQL Endpoint</Form.Label>
        <Form.Control
          type="url"
          placeholder="Enter SPARQL Endpoint URL"
          value={sparqlEndpoint}
          onChange={handleEndpointChange}
        />
      </Form.Group>

      <Form.Group className="mb-3" controlId="sparqlQuery">
        <Form.Label>SPARQL Query</Form.Label>
        <Form.Control
          as="textarea"
          rows={5}
          placeholder="Enter SPARQL Query"
          value={query}
          onChange={handleQueryChange}
        />
      </Form.Group>

      <Button
        variant="primary"
        onClick={onExecute}
        disabled={isLoading}
      >
        {isLoading ? (
          <>
            <Spinner
              as="span"
              animation="border"
              size="sm"
              role="status"
              aria-hidden="true"
            />
            Loading...
          </>
        ) : (
          'Execute Query'
        )}
      </Button>
    </Form>
  );
}

export default SparqlInput;