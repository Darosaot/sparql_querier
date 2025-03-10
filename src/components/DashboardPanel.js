// src/components/DashboardPanel.js
import React, { useState, useEffect } from 'react';
import { Card, Button, Spinner, Table } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import { executeQuery } from '../api/sparqlService';
import * as ss from 'simple-statistics';

const DashboardPanel = ({ panel, onDelete, isEditMode }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  // Load data when component mounts
  useEffect(() => {
    loadData();
    
    // Clean up any refresh interval on unmount
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [panel.id, panel.query]); // Reload when panel ID or query changes
  
  // Function to load data from the SPARQL endpoint
  const loadData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await executeQuery(panel.query.endpoint, panel.query.sparql);
      
      if (result.success) {
        setData(result);
      } else {
        setError(`Query failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Error executing query: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  // Function to refresh data
  const handleRefresh = () => {
    loadData();
  };
  
  // Render different content based on panel type
  const renderPanelContent = () => {
    if (loading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      );
    }
    
    if (error) {
      return (
        <div className="alert alert-danger">
          {error}
        </div>
      );
    }
    
    if (!data || data.data.length === 0) {
      return (
        <div className="alert alert-warning">
          No data available
        </div>
      );
    }
    
    switch (panel.type) {
      case 'table':
        return renderTable();
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'stats':
        return renderStats();
      default:
        return (
          <div className="alert alert-info">
            Unknown panel type: {panel.type}
          </div>
        );
    }
  };
  
  // Render a table
  const renderTable = () => {
    // Limit to first 10 rows for display
    const displayRows = data.data.slice(0, 10);
    
    return (
      <div className="table-responsive">
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              {data.columns.map((column, index) => (
                <th key={index}>{column}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={cellIndex}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
        {data.data.length > 10 && (
          <div className="text-center text-muted small mt-2">
            Showing 10 of {data.data.length} rows
          </div>
        )}
      </div>
    );
  };
  
  // Render a line chart
  const renderLineChart = () => {
    const { xAxis, yAxis, color } = panel.visualization;
    
    if (!xAxis || !yAxis) {
      return (
        <div className="alert alert-warning">
          Chart configuration is incomplete
        </div>
      );
    }
    
    const xIndex = data.columns.indexOf(xAxis);
    const yIndex = data.columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return (
        <div className="alert alert-warning">
          Selected columns not found in data
        </div>
      );
    }
    
    const xValues = data.data.map(row => row[xIndex]);
    const yValues = data.data.map(row => row[yIndex]);
    
    const plotData = [
      {
        x: xValues,
        y: yValues,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { color: color },
        line: { color: color }
      }
    ];
    
    const layout = {
      autosize: true,
      margin: { l: 50, r: 20, t: 30, b: 50 },
      xaxis: { title: xAxis },
      yaxis: { title: yAxis },
      height: 250
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render a bar chart
  const renderBarChart = () => {
    const { xAxis, yAxis, color } = panel.visualization;
    
    if (!xAxis || !yAxis) {
      return (
        <div className="alert alert-warning">
          Chart configuration is incomplete
        </div>
      );
    }
    
    const xIndex = data.columns.indexOf(xAxis);
    const yIndex = data.columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return (
        <div className="alert alert-warning">
          Selected columns not found in data
        </div>
      );
    }
    
    const xValues = data.data.map(row => row[xIndex]);
    const yValues = data.data.map(row => row[yIndex]);
    
    const plotData = [
      {
        x: xValues,
        y: yValues,
        type: 'bar',
        marker: { color: color }
      }
    ];
    
    const layout = {
      autosize: true,
      margin: { l: 50, r: 20, t: 30, b: 50 },
      xaxis: { title: xAxis },
      yaxis: { title: yAxis },
      height: 250
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render a pie chart
  const renderPieChart = () => {
    const { xAxis, yAxis, color } = panel.visualization;
    
    if (!xAxis || !yAxis) {
      return (
        <div className="alert alert-warning">
          Chart configuration is incomplete
        </div>
      );
    }
    
    const xIndex = data.columns.indexOf(xAxis);
    const yIndex = data.columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return (
        <div className="alert alert-warning">
          Selected columns not found in data
        </div>
      );
    }
    
    const labels = data.data.map(row => row[xIndex]);
    const values = data.data.map(row => {
      const val = row[yIndex];
      return typeof val === 'string' ? Number(val) : val;
    });
    
    const plotData = [
      {
        labels: labels,
        values: values,
        type: 'pie',
        marker: {
          colors: Array(labels.length).fill(color)
        }
      }
    ];
    
    const layout = {
      autosize: true,
      margin: { l: 20, r: 20, t: 30, b: 20 },
      height: 250,
      showlegend: true,
      legend: { orientation: 'h', y: -0.2 }
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render statistics
  const renderStats = () => {
    // For stats, choose the first numeric column
    let statisticsColumn = null;
    let columnIndex = -1;
    
    for (let i = 0; i < data.columns.length; i++) {
      // Check if at least 70% of values are numeric
      const column = data.columns[i];
      const values = data.data.map(row => row[i]);
      const numericCount = values.filter(val => !isNaN(Number(val))).length;
      
      if (numericCount / values.length >= 0.7) {
        statisticsColumn = column;
        columnIndex = i;
        break;
      }
    }
    
    if (statisticsColumn === null) {
      return (
        <div className="alert alert-warning">
          No suitable numeric column found for statistics
        </div>
      );
    }
    
    // Extract numeric values
    const values = data.data
      .map(row => row[columnIndex])
      .map(val => typeof val === 'string' ? Number(val) : val)
      .filter(val => !isNaN(val));
    
    // Calculate statistics
    const stats = {
      count: values.length,
      sum: values.reduce((sum, val) => sum + val, 0),
      mean: ss.mean(values),
      median: ss.median(values),
      min: Math.min(...values),
      max: Math.max(...values),
      standardDeviation: ss.standardDeviation(values),
      // Add percentiles
      percentile25: ss.quantile(values, 0.25),
      percentile75: ss.quantile(values, 0.75)
    };
    
    return (
      <Table striped bordered size="sm">
        <thead>
          <tr>
            <th colSpan="2" className="text-center">Statistics for {statisticsColumn}</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th>Count</th>
            <td>{stats.count}</td>
          </tr>
          <tr>
            <th>Sum</th>
            <td>{stats.sum.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Mean</th>
            <td>{stats.mean.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Median</th>
            <td>{stats.median.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Min</th>
            <td>{stats.min.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Max</th>
            <td>{stats.max.toFixed(2)}</td>
          </tr>
          <tr>
            <th>Std Dev</th>
            <td>{stats.standardDeviation.toFixed(2)}</td>
          </tr>
          <tr>
            <th>25th Percentile</th>
            <td>{stats.percentile25.toFixed(2)}</td>
          </tr>
          <tr>
            <th>75th Percentile</th>
            <td>{stats.percentile75.toFixed(2)}</td>
          </tr>
        </tbody>
      </Table>
    );
  };
  
  return (
    <Card>
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h6 className="mb-0">{panel.title}</h6>
        <div>
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={handleRefresh}
            className="me-1"
            title="Refresh"
          >
            ↻
          </Button>
          
          {isEditMode && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={onDelete}
              title="Delete Panel"
            >
              ×
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className="p-2">
        {renderPanelContent()}
      </Card.Body>
      <Card.Footer className="text-muted small p-1">
        <div className="d-flex justify-content-between">
          <div>Type: {panel.type}</div>
          <div>{data?.data.length || 0} rows</div>
        </div>
      </Card.Footer>
    </Card>
  );
};

export default DashboardPanel;
