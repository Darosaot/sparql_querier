import React, { useState, useEffect } from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import { processData } from '../utils/dataUtils';
import _ from 'lodash';

const Visualization = ({ data, columns }) => {
  const [vizType, setVizType] = useState('Table');
  const [xAxis, setXAxis] = useState(columns[0] || '');
  const [yAxis, setYAxis] = useState(columns.length > 1 ? columns[1] : columns[0] || '');
  const [customColor, setCustomColor] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#00f900');
  
  // New state for metrics and grouping
  const [groupByOperation, setGroupByOperation] = useState('sum');
  const [excludeNA, setExcludeNA] = useState(true);
  
  // Initialize column selections when data changes
  useEffect(() => {
    if (columns.length > 0) {
      setXAxis(columns[0]);
      if (columns.length > 1) {
        setYAxis(columns[1]);
      } else {
        setYAxis(columns[0]);
      }
    }
  }, [columns]);
  
  // List of available operations
  const operations = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'median', label: 'Median' }
  ];

  // Process data for visualization
  const processedData = processData(data, columns);
  
  // Helper function to get values from a column
  const extractColumnValues = (columnName, excludeNAValues = true) => {
    if (!columnName) {
      return [];
    }
    
    const columnIndex = columns.indexOf(columnName);
    if (columnIndex === -1) {
      return [];
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
  };

  // Perform a specific operation on a set of values
  const performOperation = (operation, values) => {
    const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
    
    if (numericValues.length === 0) {
      return 0;
    }
    
    switch (operation) {
      case 'sum':
        return numericValues.reduce((sum, val) => sum + val, 0);
      case 'avg':
        return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      case 'count':
        return values.length;
      case 'min':
        return Math.min(...numericValues);
      case 'max':
        return Math.max(...numericValues);
      case 'median':
        numericValues.sort((a, b) => a - b);
        const mid = Math.floor(numericValues.length / 2);
        return numericValues.length % 2 !== 0
          ? numericValues[mid]
          : (numericValues[mid - 1] + numericValues[mid]) / 2;
      default:
        return 0;
    }
  };

  // Group data by the X-axis and apply the selected operation to Y-axis values
  const groupDataByOperation = () => {
    if (!xAxis || !yAxis) {
      return { labels: [], values: [] };
    }
    
    // Get column indices
    const xIndex = columns.indexOf(xAxis);
    const yIndex = columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return { labels: [], values: [] };
    }
    
    // Group the data by X-axis value
    const groupedData = _.groupBy(data, row => {
      const value = row[xIndex];
      return value === null || value === undefined || value === '' ? 'NA' : value;
    });
    
    // Skip NA group if requested
    if (excludeNA && 'NA' in groupedData) {
      delete groupedData['NA'];
    }
    
    // Apply the selected operation to each group
    const result = {};
    
    Object.entries(groupedData).forEach(([xValue, rows]) => {
      // Get Y-axis values for this group
      const yValues = rows.map(row => {
        const val = row[yIndex];
        
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
      const validValues = excludeNA 
        ? yValues.filter(val => typeof val === 'number' && !isNaN(val))
        : yValues;
      
      // Apply the operation
      result[xValue] = performOperation(groupByOperation, validValues);
    });
    
    // Convert to arrays for Plotly
    const sortedEntries = Object.entries(result).sort((a, b) => {
      // Try to sort numerically if possible
      const numA = Number(a[0]);
      const numB = Number(b[0]);
      if (!isNaN(numA) && !isNaN(numB)) {
        return numA - numB;
      }
      // Fall back to alphabetical sorting
      return a[0].localeCompare(b[0]);
    });
    
    return {
      labels: sortedEntries.map(([label]) => label),
      values: sortedEntries.map(([_, value]) => value)
    };
  };
  
  // Function to render the appropriate visualization
  const renderVisualization = () => {
    if (!data || data.length === 0) {
      return <div className="alert alert-warning">No data to visualize</div>;
    }
    
    switch (vizType) {
      case 'Line Chart':
        return renderLineChart();
      case 'Bar Chart':
        return renderBarChart();
      case 'Pie Chart':
        return renderPieChart();
      default:
        // Table view is handled by ResultsTable component
        return <div className="alert alert-info">Table view is displayed in the Results section above</div>;
    }
  };
  
  // Render line chart using Plotly
  const renderLineChart = () => {
    const { labels, values } = groupDataByOperation();
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
    
    const chartData = [{
      x: labels,
      y: values,
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: customColor ? selectedColor : null },
      line: { color: customColor ? selectedColor : null }
    }];
    
    const layout = {
      title: `${operationLabel} of ${yAxis} by ${xAxis}`,
      xaxis: { title: xAxis },
      yaxis: { title: `${operationLabel} of ${yAxis}` },
      autosize: true,
      height: 500
    };
    
    return (
      <Plot
        data={chartData}
        layout={layout}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render bar chart using Plotly
  const renderBarChart = () => {
    const { labels, values } = groupDataByOperation();
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
    
    const chartData = [{
      x: labels,
      y: values,
      type: 'bar',
      marker: { color: customColor ? selectedColor : null }
    }];
    
    const layout = {
      title: `${operationLabel} of ${yAxis} by ${xAxis}`,
      xaxis: { title: xAxis },
      yaxis: { title: `${operationLabel} of ${yAxis}` },
      autosize: true,
      height: 500
    };
    
    return (
      <Plot
        data={chartData}
        layout={layout}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render pie chart using Plotly
  const renderPieChart = () => {
    const { labels, values } = groupDataByOperation();
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
    
    const chartData = [{
      type: 'pie',
      labels: labels,
      values: values,
      marker: { colors: customColor ? [selectedColor] : null }
    }];
    
    const layout = {
      title: `${operationLabel} of ${yAxis} Distribution by ${xAxis}`,
      autosize: true,
      height: 500
    };
    
    return (
      <Plot
        data={chartData}
        layout={layout}
        style={{ width: '100%' }}
        useResizeHandler={true}
      />
    );
  };
  
  return (
    <Card>
      <Card.Body>
        <Form>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Select visualization type:
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={vizType}
                onChange={(e) => setVizType(e.target.value)}
              >
                <option value="Table">Table</option>
                <option value="Line Chart">Line Chart</option>
                <option value="Bar Chart">Bar Chart</option>
                <option value="Pie Chart">Pie Chart</option>
              </Form.Select>
            </Col>
          </Form.Group>
          
          {vizType !== 'Table' && (
            <>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  X-axis (Group By):
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={xAxis}
                    onChange={(e) => setXAxis(e.target.value)}
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
                  Y-axis (Metric):
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={yAxis}
                    onChange={(e) => setYAxis(e.target.value)}
                  >
                    {columns.map((column) => (
                      <option key={column} value={column}>
                        {column}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Form.Group>
              
              {/* New section for aggregation operation */}
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Aggregation Method:
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
                    id="exclude-na"
                    label="Exclude NA/missing values"
                    checked={excludeNA}
                    onChange={(e) => setExcludeNA(e.target.checked)}
                  />
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Col sm={{ span: 9, offset: 3 }}>
                  <Form.Check
                    type="checkbox"
                    label="Customize Chart Color"
                    checked={customColor}
                    onChange={(e) => setCustomColor(e.target.checked)}
                  />
                  
                  {customColor && (
                    <Form.Control
                      type="color"
                      value={selectedColor}
                      onChange={(e) => setSelectedColor(e.target.value)}
                      title="Choose chart color"
                      className="mt-2"
                    />
                  )}
                </Col>
              </Form.Group>
            </>
          )}
        </Form>
        
        <div className="mt-4">
          {renderVisualization()}
        </div>
      </Card.Body>
    </Card>
  );
};

export default Visualization;
