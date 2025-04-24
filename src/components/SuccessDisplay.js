import React from 'react';
import { Alert } from 'react-bootstrap';
import PropTypes from 'prop-types';

function SuccessDisplay({ resultCount, columnCount }) {
  return (
    <Alert variant="success" className="mt-4">
      <strong>Success!</strong> Query executed successfully, retrieved {resultCount} results with {columnCount} columns.
    </Alert>
  );
}

SuccessDisplay.propTypes = {
  resultCount: PropTypes.number.isRequired,
  columnCount: PropTypes.number.isRequired,
};

export default SuccessDisplay;