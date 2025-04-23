import React from 'react';
import { Alert } from 'react-bootstrap';

function ErrorDisplay({ error }) {
  return (
    <Alert variant="danger" className="mt-3">
      {error}
    </Alert>
  );
}

export default ErrorDisplay;