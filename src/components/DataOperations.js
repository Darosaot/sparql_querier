import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Table, Alert, Tabs, Tab } from 'react-bootstrap';
import * as ss from 'simple-statistics';
import _ from 'lodash';

const DataOperations = ({ data, columns }) => {
  // This keeps track of which tab is active (basic, groupby, stats)
  const [activeTab, setActiveTab] = useState('basic');
  const [error, setError] = useState(null);
  
  // For the basic operations tab
  const [selectedOperation, setSelectedOperation] = useState('sum');
  const [selectedColumn, setSelectedColumn] = useState(columns[0] || '');
  const [operationResult, setOperationResult] = useState(null);
  const [excludeNA, setExcludeNA] = useState(true);
  
  // For the group by operations tab
  const [groupByColumn, setGroupByColumn] = useState(columns[0] || '');
  const [groupByMetricColumn, setGroupByMetricColumn] = useState(columns.length > 1 ? columns[1] : columns[0] || '');
  const [groupByOperation, setGroupByOperation] = useState('sum');
  const [groupByResult, setGroupByResult] = useState(null);
  const [groupByExcludeNA, setGroupByExcludeNA] = useState(true);
  
  // For the advanced statistics tab
  const [statsColumn, setStatsColumn] = useState(columns[0] || '');
  const [statsResult, setStatsResult] = useState(null);
  const [statsExcludeNA, setStatsExcludeNA] = useState(true);
  
  // List of available operations
  const operations = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'median', label: 'Median' },
    { value: 'mode', label: 'Mode' }
  ];

  // Helper function to get values from a column
  const extractColumnValues = (columnName, excludeNAValues = true) => {
    if (!columnName) {
      throw new Error('Column name is required');
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
      throw new Error(`Column ${columnName} not found`);
    }
    
    // Get all the values from this column
    let values = data.map(row => row[columnIndex]);
    
    // Clean up the values - convert to numbers when possible
    values = values.map(val => {
      // Check if value is empty or NA
      if (val === null || val === undefined || val === '' || 
          val === 'NA' || val === 'N/A' || val === 'null' || 
          val === 'undefined' || val === 'NaN') {
        return NaN;
      }
      
      // Convert to number if possible
      const num = Number(val);
      return isNaN(num) ? val : num;
    });
    
    // Remove NA values if requested
    return excludeNAValues 
      ? values.filter(val => typeof val === 'number' && !isNaN(val) || typeof val === 'string' && val !== '')
      : values;
  }

  // Calculate various statistics for a set of values
  const calculateStats = (values) => {
    const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
    
    if (numericValues.length === 0) {
      throw new Error('No numeric values found for statistical calculations');
    }
    
    // Sort values for percentile calculations
    const sortedValues = [...numericValues].sort((a, b) => a - b);
    
    return {
      count: numericValues.length,
      sum: numericValues.reduce((sum, val) => sum + val, 0),
      mean: ss.mean(numericValues),
      median: ss.median(numericValues),
      min: Math.min(...numericValues),
      max: Math.max(...numericValues),
      range: Math.max(...numericValues) - Math.min(...numericValues),
      variance: ss.variance(numericValues),
      standardDeviation: ss.standardDeviation(numericValues),
      percentile25: ss.quantile(sortedValues, 0.25),
      percentile75: ss.quantile(sortedValues, 0.75),
      mode: ss.mode(numericValues),
      iqr: ss.quantile(sortedValues, 0.75) - ss.quantile(sortedValues, 0.25)
    };
  }

  // Perform a specific operation on a set of values
  const performOperation = (operation, values) => {
    const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
    
    switch (operation) {
      case 'sum':
        return numericValues.reduce((sum, val) => sum + val, 0);
      case 'avg':
        if (numericValues.length === 0) {
          throw new Error('No numeric values found for average calculation');
        }
        return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      case 'count':
        return values.length;
      case 'min':
        if (numericValues.length === 0) {
          throw new Error('No numeric values found for minimum calculation');
        }
        return Math.min(...numericValues);
      case 'max':
        if (numericValues.length === 0) {
          throw new Error('No numeric values found for maximum calculation');
        }
        return Math.max(...numericValues);
      case 'median':
        if (numericValues.length === 0) {
          throw new Error('No numeric values found for median calculation');
        }
        return ss.median(numericValues);
      case 'mode':
        if (numericValues.length === 0) {
          throw new Error('No numeric values found for mode calculation');
        }
        return ss.mode(numericValues);
      default:
        throw new Error(`Unknown operation: ${operation}`);
    }
  }

  // Handle basic operation calculation
  const handleCalculate = () => {
    if (!selectedColumn) {
      setError('Please select a column');
      return;
    }
    
    try {
      // Get and process values
      const values = extractColumnValues(selectedColumn, excludeNA);
      
      // Count values
      const totalCount = data.length;
      const validCount = values.length;
      const naCount = totalCount - validCount;
      
      // Do the calculation
      const result = performOperation(selectedOperation, values);
      const resultLabel = operations.find(op => op.value === selectedOperation)?.label || selectedOperation;
      
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

  // Handle group by operation calculation
  const handleGroupByCalculate = () => {
    if (!groupByColumn || !groupByMetricColumn) {
      setError('Please select both group by column and metric column');
      return;
    }
    
    try {
      // Get column positions
      const groupColumnIndex = columns.indexOf(groupByColumn);
      const metricColumnIndex = columns.indexOf(groupByMetricColumn);
      
      if (groupColumnIndex === -1 || metricColumnIndex === -1) {
        throw new Error('Column not found');
      }
      
      // Group data by the selected column
      const groupedData = _.groupBy(data, row => {
        const value = row[groupColumnIndex];
        return value === null || value === undefined || value === '' ? 'NA' : value;
      });
      
      // Calculate the operation for each group
      const result = {};
      let grandTotal = 0;
      
      Object.entries(groupedData).forEach(([groupValue, rows]) => {
        // Skip NA group if requested
        if (groupByExcludeNA && groupValue === 'NA') {
          return;
        }
        
        // Get metric values for this group
        const metricValues = rows.map(row => {
          const val = row[metricColumnIndex];
          
          // Check if value is NA
          if (val === null || val === undefined || val === '' || 
              val === 'NA' || val === 'N/A' || val === 'null' || 
              val === 'undefined' || val === 'NaN') {
            return NaN;
          }
          
          // Convert to number if possible
          const num = Number(val);
          return isNaN(num) ? val : num;
        });
        
        // Remove NA values if requested
        const validValues = groupByExcludeNA 
          ? metricValues.filter(val => typeof val === 'number' && !isNaN(val))
          : metricValues;
        
        // Do the calculation
        let operationResult;
        try {
          operationResult = performOperation(groupByOperation, validValues);
          
          // Add to grand total for sum and count operations
          if (['sum', 'count'].includes(groupByOperation)) {
            grandTotal += operationResult;
          }
        } catch (err) {
          operationResult = 'N/A';
        }
        
        result[groupValue] = {
          count: rows.length,
          validCount: validValues.length,
          naCount: rows.length - validValues.length,
          result: operationResult
        };
      });
      
      setGroupByResult({
        operation: groupByOperation,
        groupColumn: groupByColumn,
        metricColumn: groupByMetricColumn,
        groups: result,
        grandTotal: ['sum', 'count'].includes(groupByOperation) ? grandTotal : null
      });
      
      setError(null);
    } catch (err) {
      setError(`Error performing group by operation: ${err.message}`);
      setGroupByResult(null);
    }
  };

  // Handle advanced statistics calculation
  const handleCalculateStats = () => {
    if (!statsColumn) {
      setError('Please select a column for statistics');
      return;
    }
    
    try {
      // Get and process values
      const values = extractColumnValues(statsColumn, statsExcludeNA);
      
      // Count values
      const totalCount = data.length;
      const validCount = values.length;
      const naCount = totalCount - validCount;
      
      // Calculate statistics
      const stats = calculateStats(values);
      
      setStatsResult({
        column: statsColumn,
        totalCount,
        validCount,
        naCount,
        stats
      });
      
      setError(null);
    } catch (err) {
      setError(`Error calculating statistics: ${err.message}`);
      setStatsResult(null);
    }
  };

  return (
    <Card>
      <Card.Header as="h5">Data Operations</Card.Header>
      <Card.Body>
        <p className="text-muted">
          Perform statistical operations and analysis on the query results.
        </p>
        
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="basic" title="Basic Operations">
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
                      <th>Valid values</th>
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
          </Tab>
          
          <Tab eventKey="groupby" title="Group By">
            <Form>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Group By Column:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={groupByColumn}
                    onChange={(e) => setGroupByColumn(e.target.value)}
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
                <Form.Label column sm={3}>
                  Metric Column:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={groupByMetricColumn}
                    onChange={(e) => setGroupByMetricColumn(e.target.value)}
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
                <Form.Label column sm={3}>
                  Operation:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={groupByOperation}
                    onChange={(e) => setGroupByOperation(e.target.value)}
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
                <Col sm={{ span: 9, offset: 3 }}>
                  <Form.Check
                    type="checkbox"
                    id="group-by-exclude-na"
                    label="Exclude NA/missing values"
                    checked={groupByExcludeNA}
                    onChange={(e) => setGroupByExcludeNA(e.target.checked)}
                  />
                </Col>
              </Form.Group>
              
              <div className="d-grid gap-2">
                <Button variant="primary" onClick={handleGroupByCalculate}>
                  Calculate Group Metrics
                </Button>
              </div>
            </Form>
            
            {groupByResult && (
              <div className="mt-4">
                <h5>Group By Results</h5>
                <p className="text-muted">
                  {operations.find(op => op.value === groupByResult.operation)?.label || groupByResult.operation} of {groupByResult.metricColumn} grouped by {groupByResult.groupColumn}
                </p>
                
                <Table bordered>
                  <thead>
                    <tr>
                      <th>{groupByResult.groupColumn}</th>
                      <th>Count</th>
                      <th>Valid Values</th>
                      <th>{operations.find(op => op.value === groupByResult.operation)?.label || groupByResult.operation}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(groupByResult.groups).map(([groupValue, groupData]) => (
                      <tr key={groupValue}>
                        <td>{groupValue}</td>
                        <td>{groupData.count.toLocaleString()}</td>
                        <td>{groupData.validCount.toLocaleString()}</td>
                        <td>{typeof groupData.result === 'number' ? groupData.result.toLocaleString(undefined, { maximumFractionDigits: 4 }) : groupData.result}</td>
                      </tr>
                    ))}
                    
                    {groupByResult.grandTotal !== null && (
                      <tr className="table-secondary">
                        <th>Grand Total</th>
                        <td colSpan={2}></td>
                        <th>{groupByResult.grandTotal.toLocaleString(undefined, { maximumFractionDigits: 4 })}</th>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            )}
          </Tab>
          
          <Tab eventKey="stats" title="Advanced Statistics">
            <Form>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Column:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={statsColumn}
                    onChange={(e) => setStatsColumn(e.target.value)}
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
                    id="stats-exclude-na"
                    label="Exclude NA/missing values"
                    checked={statsExcludeNA}
                    onChange={(e) => setStatsExcludeNA(e.target.checked)}
                  />
                </Col>
              </Form.Group>
              
              <div className="d-grid gap-2">
                <Button variant="primary" onClick={handleCalculateStats}>
                  Calculate Statistics
                </Button>
              </div>
            </Form>
            
            {statsResult && (
              <div className="mt-4">
                <h5>Statistical Summary for {statsResult.column}</h5>
                
                <div className="row mt-3">
                  <div className="col-md-6">
                    <Table bordered>
                      <tbody>
                        <tr>
                          <th>Count</th>
                          <td>{statsResult.stats.count.toLocaleString()}</td>
                        </tr>
                        <tr>
                          <th>Sum</th>
                          <td>{statsResult.stats.sum.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Mean</th>
                          <td>{statsResult.stats.mean.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Median</th>
                          <td>{statsResult.stats.median.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Mode</th>
                          <td>{statsResult.stats.mode.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Minimum</th>
                          <td>{statsResult.stats.min.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Maximum</th>
                          <td>{statsResult.stats.max.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                  <div className="col-md-6">
                    <Table bordered>
                      <tbody>
                        <tr>
                          <th>Range</th>
                          <td>{statsResult.stats.range.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Variance</th>
                          <td>{statsResult.stats.variance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Standard Deviation</th>
                          <td>{statsResult.stats.standardDeviation.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>25th Percentile</th>
                          <td>{statsResult.stats.percentile25.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>75th Percentile</th>
                          <td>{statsResult.stats.percentile75.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>Interquartile Range</th>
                          <td>{statsResult.stats.iqr.toLocaleString(undefined, { maximumFractionDigits: 4 })}</td>
                        </tr>
                        <tr>
                          <th>NA Values</th>
                          <td>{statsResult.naCount.toLocaleString()} ({((statsResult.naCount / statsResult.totalCount) * 100).toFixed(2)}%)</td>
                        </tr>
                      </tbody>
                    </Table>
                  </div>
                </div>
              </div>
            )}
          </Tab>
        </Tabs>
        
        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
      </Card.Body>
    </Card>
  );
};

export default DataOperations;
