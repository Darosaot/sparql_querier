import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Table, Alert } from 'react-bootstrap';

/**
 * DataOperations component for performing basic statistical operations on SPARQL query results
 * 
 * @param {Array} data - Array of data rows
 * @param {Array} columns - Array of column names
 */
const DataOperations = ({ data, columns }) => {
  // State for selected operation and column
  const [selectedOperation, setSelectedOperation] = useState('sum');
  const [selectedColumn, setSelectedColumn] = useState(columns[0] || '');
  const [operationResult, setOperationResult] = useState(null);
  const [excludeNA, setExcludeNA] = useState(true);
  const [error, setError] = useState(null);
  
  // Available operations
  const operations = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' }
  ];
  
  /**
   * Handle operation execution
   */
  const handleCalculate = () => {
    if (!selectedColumn) {
      setError('Please select a column');
      return;
    }
    
    try {
      // Get column index
      const columnIndex = columns.indexOf(selectedColumn);
      
      if (columnIndex === -1) {
        setError(`Column ${selectedColumn} not found`);
        return;
      }
      
      // Extract values from the selected column
      let values = data.map(row => row[columnIndex]);
      
      // Process values - convert to numbers and handle NA values
      values = values.map(val => {
        // Check if the value is empty, null, 'NA', 'N/A', etc.
        if (val === null || val === undefined || val === '' || 
            val === 'NA' || val === 'N/A' || val === 'null' || 
            val === 'undefined' || val === 'NaN') {
          return NaN;
        }
        
        // Try to convert to number
        const num = Number(val);
        return isNaN(num) ? val : num;
      });
      
      // If excludeNA is true, filter out all NaN values
      const validValues = excludeNA 
        ? values.filter(val => typeof val === 'number' && !isNaN(val))
        : values;
      
      // Count of all values (including non-numeric if not excluded)
      const totalCount = values.length;
      
      // Count of valid numeric values
      const validCount = validValues.filter(val => 
        typeof val === 'number' && !isNaN(val)
      ).length;
      
      // Count of NA values
      const naCount = totalCount - validCount;
      
      // Execute the selected operation
      let result, resultLabel;
      
      switch (selectedOperation) {
        case 'sum':
          // Sum only works on numeric values
          if (validValues.some(val => typeof val !== 'number' || isNaN(val))) {
            const numericValues = validValues.filter(val => 
              typeof val === 'number' && !isNaN(val)
            );
            result = numericValues.reduce((sum, val) => sum + val, 0);
            resultLabel = `Sum (${numericValues.length} numeric values)`;
          } else {
            result = validValues.reduce((sum, val) => sum + val, 0);
            resultLabel = 'Sum';
          }
          break;
          
        case 'avg':
          // Average only works on numeric values
          const numericValues = validValues.filter(val => 
            typeof val === 'number' && !isNaN(val)
          );
          
          if (numericValues.length === 0) {
            throw new Error('No numeric values found for average calculation');
          }
          
          result = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
          resultLabel = `Average (${numericValues.length} numeric values)`;
          break;
          
        case 'count':
          // Count can work on any values
          result = validValues.length;
          resultLabel = 'Count';
          break;
          
        case 'min':
          // Min only works on numeric values
          const minValues = validValues.filter(val => 
            typeof val === 'number' && !isNaN(val)
          );
          
          if (minValues.length === 0) {
            throw new Error('No numeric values found for minimum calculation');
          }
          
          result = Math.min(...minValues);
          resultLabel = `Minimum (${minValues.length} numeric values)`;
          break;
          
        case 'max':
          // Max only works on numeric values
          const maxValues = validValues.filter(val => 
            typeof val === 'number' && !isNaN(val)
          );
          
          if (maxValues.length === 0) {
            throw new Error('No numeric values found for maximum calculation');
          }
          
          result = Math.max(...maxValues);
          resultLabel = `Maximum (${maxValues.length} numeric values)`;
          break;
          
        default:
          throw new Error(`Unknown operation: ${selectedOperation}`);
      }
      
      setOperationResult({
        resultLabel,
        result,
        totalCount,
        validCount,
        naCount
      });
      
      setError(null);
    } catch (err) {
      setError(`Error calculating ${selectedOperation}: ${err.message}`);
      setOperationResult(null);
    }
  };
  
  return (
    <Card>
      <Card.Header as="h5">Data Operations</Card.Header>
      <Card.Body>
        <p className="text-muted">
          Perform basic statistical operations on the query results.
        </p>
        
        <Form>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Operation:
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={selectedOperation}
                onChange={(e) => setSelectedOperation(e.target.value)}
              >
                {operations.map((op) => (
                  <option key={op.value} value={op.value}>
                    {op.label}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Form.Group>
          
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Column:
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={selectedColumn}
                onChange={(e) => setSelectedColumn(e.target.value)}
              >
                {columns.map((column) => (
                  <option key={column} value={column}>
                    {column}
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Form.Group>
          
          <Form.Group as={Row} className="mb-3">
            <Col sm={{ span: 9, offset: 3 }}>
              <Form.Check
                type="checkbox"
                id="exclude-na"
                label="Exclude NA/missing values"
                checked={excludeNA}
                onChange={(e) => setExcludeNA(e.target.checked)}
              />
            </Col>
          </Form.Group>
          
          <div className="d-grid gap-2">
            <Button variant="primary" onClick={handleCalculate}>
              Calculate
            </Button>
          </div>
        </Form>
        
        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
        
        {operationResult && (
          <div className="mt-4">
            <h5>Result</h5>
            <Table bordered>
              <tbody>
                <tr>
                  <th>{operationResult.resultLabel}</th>
                  <td className="fw-bold">{typeof operationResult.result === 'number' ? operationResult.result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : operationResult.result}</td>
                </tr>
                <tr>
                  <th>Total data points</th>
                  <td>{operationResult.totalCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <th>Valid numeric values</th>
                  <td>{operationResult.validCount.toLocaleString()}</td>
                </tr>
                <tr>
                  <th>NA/missing values {excludeNA ? '(excluded)' : ''}</th>
                  <td>{operationResult.naCount.toLocaleString()}</td>
                </tr>
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default DataOperations;
