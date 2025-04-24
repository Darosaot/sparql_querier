import React, { useState } from 'react';
import { Card, Form, Button, Row, Col } from 'react-bootstrap';
import PropTypes from 'prop-types';
import { exportToCSV, exportToJSON, exportToExcel } from '../utils/exportUtils';

const ExportOptions = ({ data, columns }) => {
  const [exportFormat, setExportFormat] = useState('CSV');
  
  // Handle export button click
  const handleExport = () => {
    switch (exportFormat) {
      case 'CSV':
        exportToCSV(data, columns);
        break;
      case 'JSON':
        exportToJSON(data, columns);
        break;
      case 'Excel':
        exportToExcel(data, columns);
        break;
      default:
        break;
    }
  };
  
  return (
    <Card>
      <Card.Body>
        <p>Export the results of your SPARQL query to CSV, JSON, or Excel formats for offline analysis.</p>
        
        <Form>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Export Format:
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value)}
              >
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
                <option value="Excel">Excel</option>
              </Form.Select>
            </Col>
          </Form.Group>
          
          <div className="d-grid gap-2">
            <Button variant="success" onClick={handleExport}>
              Download as {exportFormat}
            </Button>
          </div>
        </Form>
      </Card.Body>
    </Card>
  );
};

ExportOptions.propTypes = {
  data: PropTypes.array.isRequired,
  columns: PropTypes.array.isRequired,
};

export default ExportOptions;
