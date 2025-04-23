import React from 'react';
import { Alert } from 'react-bootstrap';

function SuccessDisplay({ resultCount, columnCount }) {
  return (
    <Alert variant="success" className="mt-4">
      <strong>Success!</strong> Query executed successfully, retrieved {resultCount} results with {columnCount} columns.
    </Alert>
  );
}

export default SuccessDisplay;