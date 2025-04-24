import React from 'react';
import PropTypes from 'prop-types';
import { Alert } from 'react-bootstrap';

function ErrorDisplay({ error }) {
  return (
    <Alert variant="danger" className="mt-3">
      {error}
    </Alert>
  );
}

ErrorDisplay.propTypes = {
  error: PropTypes.string
};

export default ErrorDisplay;