import React, { useState } from 'react';
import { Card, Form, Row, Col } from 'react-bootstrap';
// Removed the unused Button import
import Plot from 'react-plotly.js';
import { processData } from '../utils/dataUtils';

const Visualization = ({ data, columns }) => {
  const [vizType, setVizType] = useState('Table');
  const [xAxis, setXAxis] = useState(columns[0] || '');
  const [yAxis, setYAxis] = useState(columns.length > 1 ? columns[1] : columns[0] || '');
  const [customColor, setCustomColor] = useState(false);
  const [selectedColor, setSelectedColor] = useState('#00f900');
  
  // Rest of the component remains the same
  // ...

  // Process data for visualization
  const processedData = processData(data, columns);
  
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
    // Extract data for the selected axes
    const xData = processedData.map(row => row[xAxis]);
    const yData = processedData.map(row => row[yAxis]);
    
    const chartData = [{
      x: xData,
      y: yData,
      type: 'scatter',
      mode: 'lines+markers',
      marker: { color: customColor ? selectedColor : null },
      line: { color: customColor ? selectedColor : null }
    }];
    
    const layout = {
      title: `${yAxis} vs ${xAxis}`,
      xaxis: { title: xAxis },
      yaxis: { title: yAxis },
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
    // Extract data for the selected axes
    const xData = processedData.map(row => row[xAxis]);
    const yData = processedData.map(row => row[yAxis]);
    
    const chartData = [{
      x: xData,
      y: yData,
      type: 'bar',
      marker: { color: customColor ? selectedColor : null }
    }];
    
    const layout = {
      title: `${yAxis} by ${xAxis}`,
      xaxis: { title: xAxis },
      yaxis: { title: yAxis },
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
    // For pie chart, we need category labels and values
    // xAxis provides the labels (categories)
    // yAxis provides the values
    
    if (columns.length < 2) {
      return <div className="alert alert-warning">Not enough columns for a pie chart. Please select a different visualization type.</div>;
    }
    
    const labels = processedData.map(row => row[xAxis]);
    const values = processedData.map(row => row[yAxis]);
    
    const chartData = [{
      type: 'pie',
      labels: labels,
      values: values,
      marker: { colors: customColor ? [selectedColor] : null }
    }];
    
    const layout = {
      title: `${yAxis} Distribution by ${xAxis}`,
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
                  X-axis:
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
                  Y-axis:
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
