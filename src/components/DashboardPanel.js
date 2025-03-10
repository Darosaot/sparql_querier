// src/components/DashboardPanel.js
import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Spinner, Table, OverlayTrigger, Tooltip, Dropdown } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import { executeQuery } from '../api/sparqlService';
import * as ss from 'simple-statistics';

const DashboardPanel = ({ panel, onDelete, isEditMode }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [fullScreenMode, setFullScreenMode] = useState(false);
  
  const plotRef = useRef(null);
  const panelRef = useRef(null);
  
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
        setLastUpdated(new Date());
      } else {
        setError(`Query failed: ${result.error}`);
      }
    } catch (err) {
      setError(`Error executing query: ${err.message}`);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };
  
  // Function to refresh data
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadData();
  };
  
  // Function to handle auto-refresh settings
  const setAutoRefresh = (minutes) => {
    // Clear any existing interval
    if (refreshInterval) {
      clearInterval(refreshInterval);
      setRefreshInterval(null);
    }
    
    // Setup new interval if minutes > 0
    if (minutes > 0) {
      const interval = setInterval(() => {
        handleRefresh();
      }, minutes * 60 * 1000);
      setRefreshInterval(interval);
    }
  };
  
  // Toggle full screen mode
  const toggleFullScreen = () => {
    if (!fullScreenMode) {
      if (panelRef.current && panelRef.current.requestFullscreen) {
        panelRef.current.requestFullscreen().catch(err => {
          console.error(`Error attempting to enable full-screen mode: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setFullScreenMode(!fullScreenMode);
  };
  
  // Listen for fullscreen change events
  useEffect(() => {
    const handleFullscreenChange = () => {
      setFullScreenMode(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Export chart as an image
  const exportChart = () => {
    if (plotRef.current) {
      plotRef.current.toImage({
        format: 'png',
        height: 800,
        width: 1200,
        scale: 2
      }).then(dataUrl => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `${panel.title.replace(/\s+/g, '_')}_chart.png`;
        link.click();
      });
    }
  };
  
  // Render different content based on panel type
  const renderPanelContent = () => {
    if (loading && !data) {
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
      case 'scatter':
        return renderScatterPlot();
      case 'bubble':
        return renderBubbleChart();
      case 'network':
        return renderNetworkGraph();
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
    // Limit to first 10 rows for display, more if expanded
    const displayLimit = expanded ? 50 : 10;
    const displayRows = data.data.slice(0, displayLimit);
    
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
                  <td key={cellIndex}>{String(cell)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
        {data.data.length > displayLimit && (
          <div className="text-center text-muted small mt-2">
            Showing {displayLimit} of {data.data.length} rows
          </div>
        )}
      </div>
    );
  };
  
  // Helper function to group data by X-axis and apply an operation to Y-axis
  const groupDataByOperation = (xAxis, yAxis, operation = 'sum') => {
    if (!xAxis || !yAxis) {
      return { labels: [], values: [] };
    }
    
    // Get column indices
    const xIndex = data.columns.indexOf(xAxis);
    const yIndex = data.columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return { labels: [], values: [] };
    }
    
    // Group the data by X-axis value
    const groupedData = {};
    
    data.data.forEach(row => {
      const xValue = row[xIndex];
      const yValue = row[yIndex];
      
      // Skip null/undefined values
      if (xValue === null || xValue === undefined || xValue === '' ||
          yValue === null || yValue === undefined || yValue === '') {
        return;
      }
      
      const key = String(xValue);
      if (!groupedData[key]) {
        groupedData[key] = [];
      }
      
      // Convert Y-value to number if possible
      const numValue = Number(yValue);
      groupedData[key].push(isNaN(numValue) ? yValue : numValue);
    });
    
    // Apply the selected operation to each group
    const result = {};
    
    Object.entries(groupedData).forEach(([xValue, yValues]) => {
      // Filter out non-numeric values for operations that require them
      const numericValues = yValues.filter(val => typeof val === 'number' && !isNaN(val));
      
      if (operation === 'count') {
        result[xValue] = yValues.length;
      } else if (numericValues.length > 0) {
        switch (operation) {
          case 'sum':
            result[xValue] = numericValues.reduce((sum, val) => sum + val, 0);
            break;
          case 'avg':
            result[xValue] = numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
            break;
          case 'min':
            result[xValue] = Math.min(...numericValues);
            break;
          case 'max':
            result[xValue] = Math.max(...numericValues);
            break;
          case 'median':
            result[xValue] = ss.median(numericValues);
            break;
          default:
            result[xValue] = numericValues.length;
        }
      } else {
        result[xValue] = 0;
      }
    });
    
    // Convert to arrays for Plotly
    const sortedEntries = Object.entries(result).sort();
    
    return {
      labels: sortedEntries.map(([label]) => label),
      values: sortedEntries.map(([_, value]) => value)
    };
  };
  
  // Render line chart
  const renderLineChart = () => {
    const { xAxis, yAxis } = panel.visualization;
    const { labels, values } = groupDataByOperation(xAxis, yAxis, 'sum');
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const plotData = [{
      x: labels,
      y: values,
      type: 'scatter',
      mode: 'lines+markers',
      marker: { 
        color: panel.visualization.color || '#1f77b4',
        size: 6
      },
      line: {
        color: panel.visualization.color || '#1f77b4',
        width: 2
      }
    }];
    
    const layout = {
      title: panel.title,
      xaxis: { title: xAxis, automargin: true },
      yaxis: { title: yAxis, automargin: true },
      autosize: true,
      margin: { l: 50, r: 20, t: 50, b: 50 },
      height: expanded ? 400 : 250,
      font: { size: 10 }
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render bar chart
  const renderBarChart = () => {
    const { xAxis, yAxis } = panel.visualization;
    const { labels, values } = groupDataByOperation(xAxis, yAxis, 'sum');
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const plotData = [{
      x: labels,
      y: values,
      type: 'bar',
      marker: { 
        color: panel.visualization.color || '#1f77b4'
      }
    }];
    
    const layout = {
      title: panel.title,
      xaxis: { title: xAxis, automargin: true },
      yaxis: { title: yAxis, automargin: true },
      autosize: true,
      margin: { l: 50, r: 20, t: 50, b: 50 },
      height: expanded ? 400 : 250,
      font: { size: 10 }
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render pie chart
  const renderPieChart = () => {
    const { xAxis, yAxis } = panel.visualization;
    const { labels, values } = groupDataByOperation(xAxis, yAxis, 'sum');
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const plotData = [{
      labels: labels,
      values: values,
      type: 'pie',
      textinfo: expanded ? 'label+percent' : 'none',
      hoverinfo: 'label+value+percent',
      marker: {
        colors: [panel.visualization.color || '#1f77b4']
      }
    }];
    
    const layout = {
      title: panel.title,
      autosize: true,
      margin: { l: 10, r: 10, t: 50, b: 10 },
      height: expanded ? 400 : 250,
      font: { size: 10 },
      showlegend: expanded
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render scatter plot
  const renderScatterPlot = () => {
    const { xAxis, yAxis } = panel.visualization;
    
    // Get column indices
    const xIndex = data.columns.indexOf(xAxis);
    const yIndex = data.columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return <div className="alert alert-warning">Invalid column selection</div>;
    }
    
    // Extract values, filtering out invalid entries
    const validData = data.data.filter(row => {
      const xVal = Number(row[xIndex]);
      const yVal = Number(row[yIndex]);
      return !isNaN(xVal) && !isNaN(yVal);
    });
    
    if (validData.length === 0) {
      return <div className="alert alert-warning">No numeric data for scatter plot</div>;
    }
    
    const plotData = [{
      x: validData.map(row => Number(row[xIndex])),
      y: validData.map(row => Number(row[yIndex])),
      mode: 'markers',
      type: 'scatter',
      marker: {
        color: panel.visualization.color || '#1f77b4',
        size: 8
      }
    }];
    
    const layout = {
      title: panel.title,
      xaxis: { title: xAxis, automargin: true },
      yaxis: { title: yAxis, automargin: true },
      autosize: true,
      margin: { l: 50, r: 20, t: 50, b: 50 },
      height: expanded ? 400 : 250,
      font: { size: 10 }
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render bubble chart
  const renderBubbleChart = () => {
    const { xAxis, yAxis } = panel.visualization;
    
    // Get column indices
    const xIndex = data.columns.indexOf(xAxis);
    const yIndex = data.columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return <div className="alert alert-warning">Invalid column selection</div>;
    }
    
    // Extract values, filtering out invalid entries
    const validData = data.data.filter(row => {
      const xVal = Number(row[xIndex]);
      const yVal = Number(row[yIndex]);
      return !isNaN(xVal) && !isNaN(yVal);
    });
    
    if (validData.length === 0) {
      return <div className="alert alert-warning">No numeric data for bubble chart</div>;
    }
    
    // Use the third numeric column for bubble size if available
    let sizeIndex = -1;
    for (let i = 0; i < data.columns.length; i++) {
      if (i !== xIndex && i !== yIndex) {
        // Check if this column has numeric values
        const hasNumericValues = data.data.some(row => {
          const val = Number(row[i]);
          return !isNaN(val);
        });
        
        if (hasNumericValues) {
          sizeIndex = i;
          break;
        }
      }
    }
    
    const sizes = sizeIndex !== -1 
      ? validData.map(row => {
          const val = Number(row[sizeIndex]);
          return !isNaN(val) ? Math.max(5, Math.min(20, val)) : 8;
        })
      : Array(validData.length).fill(8);
    
    const plotData = [{
      x: validData.map(row => Number(row[xIndex])),
      y: validData.map(row => Number(row[yIndex])),
      mode: 'markers',
      type: 'scatter',
      marker: {
        color: panel.visualization.color || '#1f77b4',
        size: sizes,
        opacity: 0.7
      }
    }];
    
    const layout = {
      title: panel.title,
      xaxis: { title: xAxis, automargin: true },
      yaxis: { title: yAxis, automargin: true },
      autosize: true,
      margin: { l: 50, r: 20, t: 50, b: 50 },
      height: expanded ? 400 : 250,
      font: { size: 10 }
    };
    
    const config = {
      displayModeBar: false,
      responsive: true
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    );
  };
  
  // Render network graph
  const renderNetworkGraph = () => {
    // Simple network graph placeholder - in reality you'd want to use a specialized library
    return (
      <div className="text-center p-3">
        <div className="alert alert-info">
          Network graph visualization (interactive version available in full view)
        </div>
      </div>
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
          {expanded && (
            <>
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
            </>
          )}
        </tbody>
      </Table>
    );
  };
  
  return (
    <Card className="dashboard-panel h-100" ref={panelRef}>
      <Card.Header className="d-flex justify-content-between align-items-center panel-drag-handle">
        <div className="d-flex align-items-center">
          <h6 className="mb-0 me-2">{panel.title}</h6>
          {isRefreshing && (
            <Spinner animation="border" size="sm" className="ms-2" />
          )}
        </div>
        <div>
          <OverlayTrigger
            placement="top"
            overlay={<Tooltip>Refresh data</Tooltip>}
          >
            <Button
              variant="link"
              size="sm"
              onClick={handleRefresh}
              className="p-0 me-2 text-secondary"
              disabled={isRefreshing}
              data-panel-refresh="true"
            >
              <i className={`bi bi-arrow-clockwise ${isRefreshing ? 'refresh-animation' : ''}`}></i>
            </Button>
          </OverlayTrigger>
          
          <Dropdown align="end" className="d-inline">
            <Dropdown.Toggle variant="link" size="sm" className="p-0 me-2 text-secondary" id={`panel-${panel.id}-menu`}>
              <i className="bi bi-three-dots-vertical"></i>
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setExpanded(!expanded)}>
                {expanded ? 'Collapse' : 'Expand'}
              </Dropdown.Item>
              <Dropdown.Item onClick={toggleFullScreen}>
                {fullScreenMode ? 'Exit Full Screen' : 'Full Screen'}
              </Dropdown.Item>
              <Dropdown.Item onClick={exportChart} disabled={!['line', 'bar', 'pie', 'scatter', 'bubble'].includes(panel.type)}>
                Export as Image
              </Dropdown.Item>
              <Dropdown.Divider />
              <Dropdown.Header>Auto-refresh</Dropdown.Header>
              <Dropdown.Item onClick={() => setAutoRefresh(0)} active={refreshInterval === null}>
                Off
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAutoRefresh(1)} active={refreshInterval !== null}>
                Every minute
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAutoRefresh(5)} active={refreshInterval !== null}>
                Every 5 minutes
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAutoRefresh(15)} active={refreshInterval !== null}>
                Every 15 minutes
              </Dropdown.Item>
              <Dropdown.Item onClick={() => setAutoRefresh(30)} active={refreshInterval !== null}>
                Every 30 minutes
              </Dropdown.Item>
              {isEditMode && (
                <>
                  <Dropdown.Divider />
                  <Dropdown.Item onClick={onDelete} className="text-danger">
                    Delete Panel
                  </Dropdown.Item>
                </>
              )}
            </Dropdown.Menu>
          </Dropdown>
          
          {isEditMode && (
            <Button
              variant="outline-danger"
              size="sm"
              onClick={onDelete}
              className="p-0 px-1"
              title="Delete Panel"
            >
              <i className="bi bi-x"></i>
            </Button>
          )}
        </div>
      </Card.Header>
      <Card.Body className={`p-0 overflow-auto ${expanded ? 'expanded-panel' : ''}`}>
        {renderPanelContent()}
      </Card.Body>
      {lastUpdated && (
        <Card.Footer className="text-muted small p-1">
          <div className="d-flex justify-content-between">
            <div>Type: {panel.type}</div>
            <div>Updated: {lastUpdated.toLocaleTimeString()}</div>
          </div>
        </Card.Footer>
      )}
    </Card>
  );
};

export default DashboardPanel;
