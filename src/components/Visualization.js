// src/components/Visualization.js
import React, { useState, useEffect, useRef } from 'react';
import { Card, Form, Row, Col, Button, Tabs, Tab, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import { processData } from '../utils/dataUtils';
import _ from 'lodash';

const Visualization = ({ data, columns}) => {
  const [vizType, setVizType] = useState('Table');
  const [xAxis, setXAxis] = useState(columns[0] || '');
  const [yAxis, setYAxis] = useState(columns.length > 1 ? columns[1] : columns[0] || '');
  const [colorMetric, setColorMetric] = useState('');
  const [groupByField, setGroupByField] = useState('');
  const [customColors, setCustomColors] = useState([]);
  const [colorScheme, setColorScheme] = useState('viridis');
  const [showLegend, setShowLegend] = useState(true);
  const [activeTab, setActiveTab] = useState('basic');
  const [chartTitle, setChartTitle] = useState('');
  const [zAxis, setZAxis] = useState(columns.length > 2 ? columns[2] : '');
  const [sizeMetric, setSizeMetric] = useState('');
  const [chartWidth, setChartWidth] = useState('100%');
  const [chartHeight, setChartHeight] = useState(500);
  const [chartSubtitle, setChartSubtitle] = useState('');
  
  // Chart configuration
  const [chartConfig, setChartConfig] = useState({
    // Appearance
    backgroundColor: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: 12,
    textColor: '#333333',
    gridLines: true,
    
    // Interaction
    enableZoom: true,
    enablePan: true,
    tooltips: true,
    interactive: true,
    
    // Axes
    xAxisTitle: '',
    yAxisTitle: '',
    zAxisTitle: '',
    
    // Animation
    animationEnabled: true,
    animationDuration: 500,
  });
  
  // New state for metrics and grouping
  const [groupByOperation, setGroupByOperation] = useState('sum');
  const [excludeNA, setExcludeNA] = useState(true);

  
  // State for network graph
  const [nodeField, setNodeField] = useState('');
  const [edgeSourceField, setEdgeSourceField] = useState('');
  const [edgeTargetField, setEdgeTargetField] = useState('');
  const [edgeWeightField, setEdgeWeightField] = useState('');
  
  // Plot ref for exporting
  const plotRef = useRef(null);
  
  // Initialize column selections when data changes
  useEffect(() => {
    if (columns.length > 0) {
      setXAxis(columns[0]);
      if (columns.length > 1) {
        setYAxis(columns[1]);
        if (columns.length > 2) {
          setZAxis(columns[2]);
        }
      } else {
        setYAxis(columns[0]);
      }
    }
  }, [columns]);
  
  // Update chart axis titles when axes change
  useEffect(() => {
    setChartConfig(prevConfig => ({
      ...prevConfig,
      xAxisTitle: xAxis,
      yAxisTitle: yAxis,
      zAxisTitle: zAxis
    }));
  }, [xAxis, yAxis, zAxis]);
  
  // List of available operations
  const operations = [
    { value: 'sum', label: 'Sum' },
    { value: 'avg', label: 'Average' },
    { value: 'count', label: 'Count' },
    { value: 'min', label: 'Minimum' },
    { value: 'max', label: 'Maximum' },
    { value: 'median', label: 'Median' }
  ];
  
  // List of available chart types
  const chartTypes = [
    { value: 'Table', label: 'Table', description: 'Display data in a table format' },
    { value: 'Line Chart', label: 'Line Chart', description: 'Best for showing trends over time' },
    { value: 'Bar Chart', label: 'Bar Chart', description: 'Best for comparing values across categories' },
    { value: 'Pie Chart', label: 'Pie Chart', description: 'Best for showing proportions of a whole' },
    { value: 'Scatter Plot', label: 'Scatter Plot', description: 'Best for showing relationships between variables' },
    { value: 'Bubble Chart', label: 'Bubble Chart', description: 'Like scatter plots with a third dimension represented by bubble size' },
    { value: 'Heatmap', label: 'Heatmap', description: 'Best for showing patterns in a matrix of data' },
    { value: 'Network Graph', label: 'Network Graph', description: 'Visualize relationships between entities' },
    { value: '3D Surface', label: '3D Surface', description: '3D visualization for complex data relationships' }
  ];
  
  // List of color schemes
  const colorSchemes = [
    { value: 'viridis', label: 'Viridis', description: 'Sequential colormap from purple to yellow' },
    { value: 'plasma', label: 'Plasma', description: 'Sequential colormap from purple to yellow-orange' },
    { value: 'inferno', label: 'Inferno', description: 'Sequential colormap from black to yellow' },
    { value: 'magma', label: 'Magma', description: 'Sequential colormap from black to pink-white' },
    { value: 'cividis', label: 'Cividis', description: 'Color-vision deficiency friendly colormap' },
    { value: 'rainbow', label: 'Rainbow', description: 'Full rainbow spectrum' },
    { value: 'blues', label: 'Blues', description: 'Sequential blue colormap' },
    { value: 'greens', label: 'Greens', description: 'Sequential green colormap' },
    { value: 'reds', label: 'Reds', description: 'Sequential red colormap' },
    { value: 'YlOrRd', label: 'Yellow-Orange-Red', description: 'Sequential yellow to red colormap' },
    { value: 'RdBu', label: 'Red-Blue', description: 'Diverging red to blue colormap' },
    { value: 'Portland', label: 'Portland', description: 'Portland color scheme (green-tan-white)' },
    { value: 'Picnic', label: 'Picnic', description: 'Picnic color scheme (purple-pink-white)' },
    { value: 'Jet', label: 'Jet', description: 'Classic jet colormap (blue-cyan-yellow-red)' },
    { value: 'Hot', label: 'Hot', description: 'Black-red-yellow-white' },
    { value: 'Greys', label: 'Greys', description: 'Sequential greyscale' },
  ];

  // Process data for visualization

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

  // Determine if a column is numeric or categorical
  const isNumericColumn = (columnName) => {
    if (!columnName) return false;
    
    const values = extractColumnValues(columnName, false);
    const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
    
    // If at least 70% of values are numeric, consider it a numeric column
    return numericValues.length / values.length >= 0.7;
  };

  // Perform a specific operation on a set of values
  const performOperation = (operation, values) => {
    const numericValues = values.filter(val => typeof val === 'number' && !isNaN(val));
    
    if (numericValues.length === 0) {
      return 0;
    }
    
    switch (operation) {
      case 'sum': {
        return numericValues.reduce((sum, val) => sum + val, 0);
      }
      case 'avg': {
        return numericValues.reduce((sum, val) => sum + val, 0) / numericValues.length;
      }
      case 'count': {
        return values.length;
      }
      case 'min': {
        return Math.min(...numericValues);
      }
      case 'max': {
        return Math.max(...numericValues);
      }
      case 'median': {
        numericValues.sort((a, b) => a - b);
        const mid = Math.floor(numericValues.length / 2);
        return numericValues.length % 2 !== 0
          ? numericValues[mid]
          : (numericValues[mid - 1] + numericValues[mid]) / 2;
      }
      default:
        return 0;
    }
  };



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
    
    // Further group by groupByField if specified
    const result = {};
    
    if (groupByField && groupByField !== '') {
      const groupIndex = columns.indexOf(groupByField);
      
      if (groupIndex !== -1) {
        // Create multi-series data
        const groups = {};
        
        Object.entries(groupedData).forEach(([xValue, rows]) => {
          // Group rows by the groupByField
          const subGroups = _.groupBy(rows, row => {
            const value = row[groupIndex];
            return value === null || value === undefined || value === '' ? 'NA' : value;
          });
          
          // Skip NA subgroup if requested
          if (excludeNA && 'NA' in subGroups) {
            delete subGroups['NA'];
          }
          
          // Process each subgroup
          Object.entries(subGroups).forEach(([groupValue, subRows]) => {
            if (!groups[groupValue]) {
              groups[groupValue] = {};
            }
            
            // Get Y-axis values for this group
            const yValues = subRows.map(row => {
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
            groups[groupValue][xValue] = performOperation(groupByOperation, validValues);
          });
        });
        
        // Convert to the final format
        return {
          multiSeries: true,
          groups: Object.keys(groups),
          data: Object.entries(groups).map(([groupName, values]) => {
            return {
              name: groupName,
              xValues: Object.keys(values),
              yValues: Object.values(values)
            };
          })
        };
      }
    }
    
    // Apply the selected operation to each group (single series case)
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
      return String(a[0]).localeCompare(String(b[0]));
    });
    
    return {
      multiSeries: false,
      labels: sortedEntries.map(([label]) => label),
      values: sortedEntries.map(([_, value]) => value)
    };
  };
  
  // Generate data for 3D visualization
  const generate3DData = () => {
    if (!xAxis || !yAxis || !zAxis) {
      return { x: [], y: [], z: [] };
    }
    
    const xIndex = columns.indexOf(xAxis);
    const yIndex = columns.indexOf(yAxis);
    const zIndex = columns.indexOf(zAxis);
    
    if (xIndex === -1 || yIndex === -1 || zIndex === -1) {
      return { x: [], y: [], z: [] };
    }
    
    // Extract values, filtering out invalid entries
    const validData = data.filter(row => {
      const xVal = Number(row[xIndex]);
      const yVal = Number(row[yIndex]);
      const zVal = Number(row[zIndex]);
      return !isNaN(xVal) && !isNaN(yVal) && !isNaN(zVal);
    });
    
    if (validData.length === 0) {
      return { x: [], y: [], z: [] };
    }
    
    return {
      x: validData.map(row => Number(row[xIndex])),
      y: validData.map(row => Number(row[yIndex])),
      z: validData.map(row => Number(row[zIndex]))
    };
  };
  
  // Generate network graph data
  const generateNetworkData = () => {
    if (!nodeField || !edgeSourceField || !edgeTargetField) {
      return { nodes: [], edges: [] };
    }
    
    const nodeIndex = columns.indexOf(nodeField);
    const sourceIndex = columns.indexOf(edgeSourceField);
    const targetIndex = columns.indexOf(edgeTargetField);
    const weightIndex = edgeWeightField ? columns.indexOf(edgeWeightField) : -1;
    
    if (nodeIndex === -1 || sourceIndex === -1 || targetIndex === -1) {
      return { nodes: [], edges: [] };
    }
    
    // Extract unique nodes
    const nodeValues = new Set(data.map(row => row[nodeIndex]));
    const nodes = Array.from(nodeValues).map(value => ({ id: value, label: String(value) }));
    
    // Create edges
    const edges = data.map(row => {
      const edge = {
        source: row[sourceIndex],
        target: row[targetIndex]
      };
      
      if (weightIndex !== -1) {
        edge.value = Number(row[weightIndex]) || 1;
      }
      
      return edge;
    });
    
    return { nodes, edges };
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
      case 'Scatter Plot':
        return renderScatterPlot();
      case 'Bubble Chart':
        return renderBubbleChart();
      case 'Heatmap':
        return renderHeatmap();
      case 'Network Graph':
        return renderNetworkGraph();
      case '3D Surface':
        return render3DSurface();
      default:
        // Table view is handled by ResultsTable component
        return <div className="alert alert-info">Table view is displayed in the Results section above</div>;
    }
  };
  
  // Render line chart using Plotly
  const renderLineChart = () => {
    const groupedData = groupDataByOperation();
    
    if (groupedData.multiSeries) {
      // Multi-series line chart
      const plotData = groupedData.data.map((series, index) => {
        return {
          name: series.name,
          x: series.xValues,
          y: series.yValues,
          type: 'scatter',
          mode: 'lines+markers',
          hoverinfo: 'x+y+name',
          line: { 
            width: 3,
            // Use color scheme if specified
            color: customColors[index] || null
          },
          marker: { 
            size: 8,
            color: customColors[index] || null
          }
        };
      });
      
      const layout = {
        title: {
          text: chartTitle || `${operations.find(op => op.value === groupByOperation)?.label || groupByOperation} of ${yAxis} by ${xAxis}`,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 6,
            color: chartConfig.textColor
          }
        },
        subtitle: chartSubtitle ? {
          text: chartSubtitle,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        } : null,
        xaxis: { 
          title: {
            text: chartConfig.xAxisTitle || xAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        yaxis: { 
          title: {
            text: chartConfig.yAxisTitle || `${operations.find(op => op.value === groupByOperation)?.label || groupByOperation} of ${yAxis}`,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        paper_bgcolor: chartConfig.backgroundColor,
        plot_bgcolor: chartConfig.backgroundColor,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize,
          color: chartConfig.textColor
        },
        showlegend: showLegend,
        legend: {
          x: 1,
          xanchor: 'right',
          y: 1
        },
        autosize: true,
        height: chartHeight,
        margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
        hovermode: 'closest'
      };
      
      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        scrollZoom: chartConfig.enableZoom,
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'chart_export',
          height: 800,
          width: 1200,
          scale: 2
        }
      };
      
      return (
        <Plot
          ref={plotRef}
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: chartWidth, height: chartHeight }}
          useResizeHandler={true}
        />
      );
    } else {
      // Single-series line chart
      const { labels, values } = groupedData;
      
      if (labels.length === 0 || values.length === 0) {
        return <div className="alert alert-warning">Not enough data for visualization</div>;
      }
      
      const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
      
      const plotData = [{
        x: labels,
        y: values,
        type: 'scatter',
        mode: 'lines+markers',
        marker: { 
          color: customColors[0] || null,
          size: 8
        },
        line: { 
          color: customColors[0] || null,
          width: 3
        }
      }];
      
      const layout = {
        title: {
          text: chartTitle || `${operationLabel} of ${yAxis} by ${xAxis}`,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 6,
            color: chartConfig.textColor
          }
        },
        subtitle: chartSubtitle ? {
          text: chartSubtitle,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        } : null,
        xaxis: { 
          title: {
            text: chartConfig.xAxisTitle || xAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        yaxis: { 
          title: {
            text: chartConfig.yAxisTitle || `${operationLabel} of ${yAxis}`,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        paper_bgcolor: chartConfig.backgroundColor,
        plot_bgcolor: chartConfig.backgroundColor,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize,
          color: chartConfig.textColor
        },
        autosize: true,
        height: chartHeight,
        margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
        hovermode: 'closest'
      };
      
      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        scrollZoom: chartConfig.enableZoom,
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'chart_export',
          height: 800,
          width: 1200,
          scale: 2
        }
      };
      
      return (
        <Plot
          ref={plotRef}
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: chartWidth, height: chartHeight }}
          useResizeHandler={true}
        />
      );
    }
  };
  
  // Render bar chart using Plotly
  const renderBarChart = () => {
    const groupedData = groupDataByOperation();
    
    if (groupedData.multiSeries) {
      // Multi-series bar chart
      const plotData = groupedData.data.map((series, index) => {
        return {
          name: series.name,
          x: series.xValues,
          y: series.yValues,
          type: 'bar',
          hoverinfo: 'x+y+name',
          marker: { 
            color: customColors[index] || null
          }
        };
      });
      
      const layout = {
        title: {
          text: chartTitle || `${operations.find(op => op.value === groupByOperation)?.label || groupByOperation} of ${yAxis} by ${xAxis}`,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 6,
            color: chartConfig.textColor
          }
        },
        subtitle: chartSubtitle ? {
          text: chartSubtitle,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        } : null,
        barmode: 'group', // Can be 'group', 'stack', 'relative'
        xaxis: { 
          title: {
            text: chartConfig.xAxisTitle || xAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        yaxis: { 
          title: {
            text: chartConfig.yAxisTitle || `${operations.find(op => op.value === groupByOperation)?.label || groupByOperation} of ${yAxis}`,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        paper_bgcolor: chartConfig.backgroundColor,
        plot_bgcolor: chartConfig.backgroundColor,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize,
          color: chartConfig.textColor
        },
        showlegend: showLegend,
        legend: {
          x: 1,
          xanchor: 'right',
          y: 1
        },
        autosize: true,
        height: chartHeight,
        margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
        hovermode: 'closest'
      };
      
      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        scrollZoom: chartConfig.enableZoom,
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'chart_export',
          height: 800,
          width: 1200,
          scale: 2
        }
      };
      
      return (
        <Plot
          ref={plotRef}
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: chartWidth, height: chartHeight }}
          useResizeHandler={true}
        />
      );
    } else {
      // Single-series bar chart
      const { labels, values } = groupedData;
      
      if (labels.length === 0 || values.length === 0) {
        return <div className="alert alert-warning">Not enough data for visualization</div>;
      }
      
      const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
      
      const plotData = [{
        x: labels,
        y: values,
        type: 'bar',
        marker: { 
          color: customColors[0] || null
        }
      }];
      
      const layout = {
        title: {
          text: chartTitle || `${operationLabel} of ${yAxis} by ${xAxis}`,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 6,
            color: chartConfig.textColor
          }
        },
        subtitle: chartSubtitle ? {
          text: chartSubtitle,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        } : null,
        xaxis: { 
          title: {
            text: chartConfig.xAxisTitle || xAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        yaxis: { 
          title: {
            text: chartConfig.yAxisTitle || `${operationLabel} of ${yAxis}`,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          },
          showgrid: chartConfig.gridLines,
          gridcolor: '#e0e0e0'
        },
        paper_bgcolor: chartConfig.backgroundColor,
        plot_bgcolor: chartConfig.backgroundColor,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize,
          color: chartConfig.textColor
        },
        autosize: true,
        height: chartHeight,
        margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
        hovermode: 'closest'
      };
      
      const config = {
        responsive: true,
        displayModeBar: true,
        modeBarButtonsToRemove: ['lasso2d', 'select2d'],
        scrollZoom: chartConfig.enableZoom,
        displaylogo: false,
        toImageButtonOptions: {
          format: 'png',
          filename: 'chart_export',
          height: 800,
          width: 1200,
          scale: 2
        }
      };
      
      return (
        <Plot
          ref={plotRef}
          data={plotData}
          layout={layout}
          config={config}
          style={{ width: chartWidth, height: chartHeight }}
          useResizeHandler={true}
        />
      );
    }
  };
  
  // Render pie chart using Plotly
  const renderPieChart = () => {
    const { labels, values } = groupDataByOperation();
    
    if (labels.length === 0 || values.length === 0) {
      return <div className="alert alert-warning">Not enough data for visualization</div>;
    }
    
    const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
    
    const plotData = [{
      labels: labels,
      values: values,
      type: 'pie',
      textinfo: 'label+percent',
      hoverinfo: 'label+value+percent',
      marker: {
        colors: customColors.length > 0 ? customColors : null
      },
      insidetextfont: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize
      },
      outsidetextfont: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize
      }
    }];
    
    const layout = {
      title: {
        text: chartTitle || `${operationLabel} of ${yAxis} Distribution by ${xAxis}`,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 6,
          color: chartConfig.textColor
        }
      },
      subtitle: chartSubtitle ? {
        text: chartSubtitle,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 2,
          color: chartConfig.textColor
        }
      } : null,
      paper_bgcolor: chartConfig.backgroundColor,
      plot_bgcolor: chartConfig.backgroundColor,
      font: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize,
        color: chartConfig.textColor
      },
      showlegend: showLegend,
      legend: {
        x: 1,
        xanchor: 'right',
        y: 1
      },
      autosize: true,
      height: chartHeight,
      margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 }
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      modeBarButtonsToRemove: ['lasso2d', 'select2d'],
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'chart_export',
        height: 800,
        width: 1200,
        scale: 2
      }
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: chartWidth, height: chartHeight }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render scatter plot using Plotly
  const renderScatterPlot = () => {
    if (!xAxis || !yAxis) {
      return <div className="alert alert-warning">Please select X and Y axes</div>;
    }
    
    const xIndex = columns.indexOf(xAxis);
    const yIndex = columns.indexOf(yAxis);
    const colorIndex = colorMetric ? columns.indexOf(colorMetric) : -1;
    
    if (xIndex === -1 || yIndex === -1) {
      return <div className="alert alert-warning">Invalid axes selection</div>;
    }
    
    // Extract valid X and Y values (must be numeric)
    const validData = data.filter(row => {
      const xVal = Number(row[xIndex]);
      const yVal = Number(row[yIndex]);
      return !isNaN(xVal) && !isNaN(yVal);
    });
    
    if (validData.length === 0) {
      return <div className="alert alert-warning">Not enough numeric data for scatter plot</div>;
    }
    
    // Prepare basic plot data
    const plotData = {
      x: validData.map(row => Number(row[xIndex])),
      y: validData.map(row => Number(row[yIndex])),
      type: 'scatter',
      mode: 'markers',
      marker: {
        size: 10,
        opacity: 0.7,
        color: colorIndex !== -1 ? validData.map(row => {
          const val = row[colorIndex];
          return isNaN(Number(val)) ? null : Number(val);
        }) : customColors[0] || null,
        colorscale: colorScheme,
        showscale: colorIndex !== -1
      },
      text: validData.map(row => {
        // Create informative hover text
        let hoverText = `${xAxis}: ${row[xIndex]}<br>${yAxis}: ${row[yIndex]}`;
        
        if (colorIndex !== -1) {
          hoverText += `<br>${colorMetric}: ${row[colorIndex]}`;
        }
        
        return hoverText;
      }),
      hoverinfo: 'text'
    };
    
    // If groupByField is specified, create multiple traces
    if (groupByField && groupByField !== '') {
      const groupIndex = columns.indexOf(groupByField);
      
      if (groupIndex !== -1) {
        // Group data by the group field
        const groups = _.groupBy(validData, row => {
          const value = row[groupIndex];
          return value === null || value === undefined || value === '' ? 'NA' : value;
        });
        
        // Skip NA group if requested
        if (excludeNA && 'NA' in groups) {
          delete groups['NA'];
        }
        
        // Create a trace for each group
        const traces = Object.entries(groups).map(([groupName, rows], index) => {
          return {
            name: groupName,
            x: rows.map(row => Number(row[xIndex])),
            y: rows.map(row => Number(row[yIndex])),
            type: 'scatter',
            mode: 'markers',
            marker: {
              size: 10,
              opacity: 0.7,
              color: customColors[index % customColors.length] || null
            },
            text: rows.map(row => {
              // Create informative hover text
              let hoverText = `${xAxis}: ${row[xIndex]}<br>${yAxis}: ${row[yIndex]}<br>${groupByField}: ${row[groupIndex]}`;
              return hoverText;
            }),
            hoverinfo: 'text'
          };
        });
        
        const layout = {
          title: {
            text: chartTitle || `Scatter Plot of ${yAxis} vs ${xAxis}`,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 6,
              color: chartConfig.textColor
            }
          },
          subtitle: chartSubtitle ? {
            text: chartSubtitle,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize + 2,
              color: chartConfig.textColor
            }
          } : null,
          xaxis: { 
            title: {
              text: chartConfig.xAxisTitle || xAxis,
              font: {
                family: chartConfig.fontFamily,
                size: chartConfig.fontSize + 2,
                color: chartConfig.textColor
              }
            },
            showgrid: chartConfig.gridLines,
            gridcolor: '#e0e0e0',
            zeroline: true,
            zerolinecolor: '#e0e0e0'
          },
          yaxis: { 
            title: {
              text: chartConfig.yAxisTitle || yAxis,
              font: {
                family: chartConfig.fontFamily,
                size: chartConfig.fontSize + 2,
                color: chartConfig.textColor
              }
            },
            showgrid: chartConfig.gridLines,
            gridcolor: '#e0e0e0',
            zeroline: true,
            zerolinecolor: '#e0e0e0'
          },
          paper_bgcolor: chartConfig.backgroundColor,
          plot_bgcolor: chartConfig.backgroundColor,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize,
            color: chartConfig.textColor
          },
          showlegend: showLegend,
          legend: {
            x: 1,
            xanchor: 'right',
            y: 1
          },
          autosize: true,
          height: chartHeight,
          margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
          hovermode: 'closest'
        };
        
        const config = {
          responsive: true,
          displayModeBar: true,
          scrollZoom: chartConfig.enableZoom,
          displaylogo: false,
          toImageButtonOptions: {
            format: 'png',
            filename: 'scatter_plot_export',
            height: 800,
            width: 1200,
            scale: 2
          }
        };
        
        return (
          <Plot
            ref={plotRef}
            data={traces}
            layout={layout}
            config={config}
            style={{ width: chartWidth, height: chartHeight }}
            useResizeHandler={true}
          />
        );
      }
    }
    
    // Single trace scatter plot
    const layout = {
      title: {
        text: chartTitle || `Scatter Plot of ${yAxis} vs ${xAxis}`,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 6,
          color: chartConfig.textColor
        }
      },
      subtitle: chartSubtitle ? {
        text: chartSubtitle,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 2,
          color: chartConfig.textColor
        }
      } : null,
      xaxis: { 
        title: {
          text: chartConfig.xAxisTitle || xAxis,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        },
        showgrid: chartConfig.gridLines,
        gridcolor: '#e0e0e0',
        zeroline: true,
        zerolinecolor: '#e0e0e0'
      },
      yaxis: { 
        title: {
          text: chartConfig.yAxisTitle || yAxis,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        },
        showgrid: chartConfig.gridLines,
        gridcolor: '#e0e0e0',
        zeroline: true,
        zerolinecolor: '#e0e0e0'
      },
      paper_bgcolor: chartConfig.backgroundColor,
      plot_bgcolor: chartConfig.backgroundColor,
      font: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize,
        color: chartConfig.textColor
      },
      showlegend: colorIndex !== -1,
      coloraxis: colorIndex !== -1 ? {
        colorbar: {
          title: colorMetric,
          titlefont: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize
          }
        }
      } : null,
      autosize: true,
      height: chartHeight,
      margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
      hovermode: 'closest'
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      scrollZoom: chartConfig.enableZoom,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'scatter_plot_export',
        height: 800,
        width: 1200,
        scale: 2
      }
    };
    
    return (
      <Plot
        ref={plotRef}
        data={[plotData]}
        layout={layout}
        config={config}
        style={{ width: chartWidth, height: chartHeight }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render bubble chart using Plotly
  const renderBubbleChart = () => {
    if (!xAxis || !yAxis || !sizeMetric) {
      return <div className="alert alert-warning">Please select X, Y, and Size metrics</div>;
    }
    
    const xIndex = columns.indexOf(xAxis);
    const yIndex = columns.indexOf(yAxis);
    const sizeIndex = columns.indexOf(sizeMetric);
    const colorIndex = colorMetric ? columns.indexOf(colorMetric) : -1;
    
    if (xIndex === -1 || yIndex === -1 || sizeIndex === -1) {
      return <div className="alert alert-warning">Invalid axes or size metric selection</div>;
    }
    
    // Extract valid data points
    const validData = data.filter(row => {
      const xVal = Number(row[xIndex]);
      const yVal = Number(row[yIndex]);
      const sizeVal = Number(row[sizeIndex]);
      return !isNaN(xVal) && !isNaN(yVal) && !isNaN(sizeVal);
    });
    
    if (validData.length === 0) {
      return <div className="alert alert-warning">Not enough numeric data for bubble chart</div>;
    }
    
    // Calculate size scaling (normalize size values)
    const sizeValues = validData.map(row => Number(row[sizeIndex]));
    const minSize = Math.min(...sizeValues);
    const maxSize = Math.max(...sizeValues);
    const sizeRange = maxSize - minSize;
    
    // Scale sizes between 10 and 50 for better visibility
    const scaledSizes = sizeValues.map(size => {
      if (sizeRange === 0) return 30; // If all values are the same
      return 10 + ((size - minSize) / sizeRange) * 40;
    });
    
    // Prepare plot data
    const plotData = {
      x: validData.map(row => Number(row[xIndex])),
      y: validData.map(row => Number(row[yIndex])),
      type: 'scatter',
      mode: 'markers',
      marker: {
        size: scaledSizes,
        sizemode: 'diameter',
        sizeref: 0.1,
        opacity: 0.7,
        color: colorIndex !== -1 ? validData.map(row => {
          const val = row[colorIndex];
          return isNaN(Number(val)) ? null : Number(val);
        }) : customColors[0] || null,
        colorscale: colorScheme,
        showscale: colorIndex !== -1,
        line: {
          color: 'rgba(0, 0, 0, 0.3)',
          width: 1
        }
      },
      text: validData.map(row => {
        // Create informative hover text
        let hoverText = `${xAxis}: ${row[xIndex]}<br>${yAxis}: ${row[yIndex]}<br>${sizeMetric}: ${row[sizeIndex]}`;
        
        if (colorIndex !== -1) {
          hoverText += `<br>${colorMetric}: ${row[colorIndex]}`;
        }
        
        return hoverText;
      }),
      hoverinfo: 'text'
    };
    
    const layout = {
      title: {
        text: chartTitle || `Bubble Chart of ${yAxis} vs ${xAxis} (size: ${sizeMetric})`,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 6,
          color: chartConfig.textColor
        }
      },
      subtitle: chartSubtitle ? {
        text: chartSubtitle,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 2,
          color: chartConfig.textColor
        }
      } : null,
      xaxis: { 
        title: {
          text: chartConfig.xAxisTitle || xAxis,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        },
        showgrid: chartConfig.gridLines,
        gridcolor: '#e0e0e0',
        zeroline: true,
        zerolinecolor: '#e0e0e0'
      },
      yaxis: { 
        title: {
          text: chartConfig.yAxisTitle || yAxis,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        },
        showgrid: chartConfig.gridLines,
        gridcolor: '#e0e0e0',
        zeroline: true,
        zerolinecolor: '#e0e0e0'
      },
      paper_bgcolor: chartConfig.backgroundColor,
      plot_bgcolor: chartConfig.backgroundColor,
      font: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize,
        color: chartConfig.textColor
      },
      showlegend: false,
      coloraxis: colorIndex !== -1 ? {
        colorbar: {
          title: colorMetric,
          titlefont: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize
          }
        }
      } : null,
      autosize: true,
      height: chartHeight,
      margin: { l: 50, r: 50, b: 50, t: 80, pad: 4 },
      hovermode: 'closest'
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      scrollZoom: chartConfig.enableZoom,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'bubble_chart_export',
        height: 800,
        width: 1200,
        scale: 2
      }
    };
    
    return (
      <Plot
        ref={plotRef}
        data={[plotData]}
        layout={layout}
        config={config}
        style={{ width: chartWidth, height: chartHeight }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render heatmap using Plotly
  const renderHeatmap = () => {
    if (!xAxis || !yAxis) {
      return <div className="alert alert-warning">Please select X and Y axes</div>;
    }
    
    const xIndex = columns.indexOf(xAxis);
    const yIndex = columns.indexOf(yAxis);
    
    if (xIndex === -1 || yIndex === -1) {
      return <div className="alert alert-warning">Invalid axes selection</div>;
    }
    
    // Get unique values for X and Y axes
    const xValues = _.uniq(data.map(row => row[xIndex])).filter(val => val !== null && val !== '');
    const yValues = _.uniq(data.map(row => row[yIndex])).filter(val => val !== null && val !== '');
    
    if (xValues.length === 0 || yValues.length === 0) {
      return <div className="alert alert-warning">Not enough unique values for heatmap</div>;
    }
    
    // Order values (numerically if possible, otherwise alphabetically)
    const sortNumericOrAlpha = (values) => {
      const allNumeric = values.every(val => !isNaN(Number(val)));
      if (allNumeric) {
        return [...values].sort((a, b) => Number(a) - Number(b));
      }
      return [...values].sort();
    };
    
    const sortedXValues = sortNumericOrAlpha(xValues);
    const sortedYValues = sortNumericOrAlpha(yValues);
    
    // Create a matrix of values for the heatmap
    const zValues = [];
    for (let i = 0; i < sortedYValues.length; i++) {
      const row = [];
      for (let j = 0; j < sortedXValues.length; j++) {
        // Find all data points matching this X and Y combination
        const matchingPoints = data.filter(
          d => d[xIndex] === sortedXValues[j] && d[yIndex] === sortedYValues[i]
        );
        
        // Count or aggregate based on the operation
        if (groupByOperation === 'count') {
          row.push(matchingPoints.length);
        } else {
          // If there's a third variable to aggregate, use it
          if (zAxis && zAxis !== '') {
            const zIndex = columns.indexOf(zAxis);
            if (zIndex !== -1) {
              const zValues = matchingPoints.map(p => {
                const val = p[zIndex];
                return isNaN(Number(val)) ? null : Number(val);
              }).filter(v => v !== null);
              
              row.push(performOperation(groupByOperation, zValues) || 0);
            } else {
              row.push(matchingPoints.length);
            }
          } else {
            row.push(matchingPoints.length);
          }
        }
      }
      zValues.push(row);
    }
    
    // Prepare heatmap data
    const plotData = [{
      x: sortedXValues,
      y: sortedYValues,
      z: zValues,
      type: 'heatmap',
      colorscale: colorScheme,
      showscale: true,
      hovertemplate: `${xAxis}: %{x}<br>${yAxis}: %{y}<br>Value: %{z}<extra></extra>`,
      colorbar: {
        title: zAxis || 'Count',
        titlefont: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize
        }
      }
    }];
    
    const operationLabel = operations.find(op => op.value === groupByOperation)?.label || groupByOperation;
    const valueLabel = zAxis ? `${operationLabel} of ${zAxis}` : 'Count';
    
    const layout = {
      title: {
        text: chartTitle || `Heatmap of ${yAxis} vs ${xAxis} (${valueLabel})`,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 6,
          color: chartConfig.textColor
        }
      },
      subtitle: chartSubtitle ? {
        text: chartSubtitle,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 2,
          color: chartConfig.textColor
        }
      } : null,
      xaxis: { 
        title: {
          text: chartConfig.xAxisTitle || xAxis,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        }
      },
      yaxis: { 
        title: {
          text: chartConfig.yAxisTitle || yAxis,
          font: {
            family: chartConfig.fontFamily,
            size: chartConfig.fontSize + 2,
            color: chartConfig.textColor
          }
        }
      },
      paper_bgcolor: chartConfig.backgroundColor,
      plot_bgcolor: chartConfig.backgroundColor,
      font: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize,
        color: chartConfig.textColor
      },
      autosize: true,
      height: chartHeight,
      margin: { l: 80, r: 50, b: 80, t: 80, pad: 4 }
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      scrollZoom: chartConfig.enableZoom,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'heatmap_export',
        height: 800,
        width: 1200,
        scale: 2
      }
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: chartWidth, height: chartHeight }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render network graph using Plotly
  const renderNetworkGraph = () => {
    const { nodes, edges } = generateNetworkData();
    
    if (nodes.length === 0 || edges.length === 0) {
      return (
        <Alert variant="warning">
          <h5>Network Graph Configuration Required</h5>
          <p>Please configure node and edge fields in the Network tab:</p>
          <ol>
            <li>Select a column that contains unique node identifiers</li>
            <li>Select columns that define the source and target of edges</li>
            <li>Optionally, select a weight field for edge strength</li>
          </ol>
        </Alert>
      );
    }
    
    // Create a basic network layout using Plotly's Scatter plot with mode 'text+markers'
    // This is a simplified visualization - for complex networks, specialized libraries would be better
    
    // First, position nodes in a circle (simple layout for demo purposes)
    const nodePositions = {};
    const radius = 1;
    const centerX = 0;
    const centerY = 0;
    
    nodes.forEach((node, i) => {
      const angle = (i / nodes.length) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      nodePositions[node.id] = { x, y };
    });
    
    // Create the node trace
    const nodeTrace = {
      x: nodes.map(node => nodePositions[node.id].x),
      y: nodes.map(node => nodePositions[node.id].y),
      text: nodes.map(node => node.label),
      mode: 'markers+text',
      name: 'Nodes',
      type: 'scatter',
      hoverinfo: 'text',
      textposition: 'bottom center',
      textfont: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize
      },
      marker: {
        size: 15,
        color: customColors[0] || '#1f77b4',
        line: {
          width: 1,
          color: '#888'
        }
      }
    };
    
    // Create edge traces (lines between nodes)
    const edgeTraces = edges.map((edge, i) => {
      const sourcePos = nodePositions[edge.source] || { x: 0, y: 0 };
      const targetPos = nodePositions[edge.target] || { x: 0, y: 0 };
      
      if (!sourcePos || !targetPos) return null;
      
      return {
        x: [sourcePos.x, targetPos.x],
        y: [sourcePos.y, targetPos.y],
        mode: 'lines',
        line: {
          width: edge.value ? Math.min(10, Math.max(1, edge.value)) : 1,
          color: '#888'
        },
        hoverinfo: 'none',
        showlegend: false
      };
    }).filter(Boolean);
    
    const plotData = [
      ...edgeTraces,
      nodeTrace
    ];
    
    const layout = {
      title: {
        text: chartTitle || 'Network Graph',
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 6,
          color: chartConfig.textColor
        }
      },
      subtitle: chartSubtitle ? {
        text: chartSubtitle,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 2,
          color: chartConfig.textColor
        }
      } : null,
      showlegend: false,
      paper_bgcolor: chartConfig.backgroundColor,
      plot_bgcolor: chartConfig.backgroundColor,
      xaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        range: [-1.5, 1.5]
      },
      yaxis: {
        showgrid: false,
        zeroline: false,
        showticklabels: false,
        range: [-1.5, 1.5]
      },
      font: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize,
        color: chartConfig.textColor
      },
      autosize: true,
      height: chartHeight,
      margin: { l: 10, r: 10, b: 10, t: 80, pad: 4 }
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      scrollZoom: chartConfig.enableZoom,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: 'network_graph_export',
        height: 800,
        width: 1200,
        scale: 2
      }
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: chartWidth, height: chartHeight }}
        useResizeHandler={true}
      />
    );
  };
  
  // Render 3D surface using Plotly
  const render3DSurface = () => {
    const { x, y, z } = generate3DData();
    
    if (x.length === 0 || y.length === 0 || z.length === 0) {
      return (
        <Alert variant="warning">
          <h5>3D Surface Configuration Required</h5>
          <p>Please configure X, Y, and Z axes in the 3D tab:</p>
          <ol>
            <li>Select numeric columns for X, Y, and Z axes</li>
            <li>Ensure the data forms a regular grid for best results</li>
          </ol>
        </Alert>
      );
    }
    
    // Create a grid of values for the surface
    // Note: For a proper surface, data should be on a regular grid
    // Here we're using the raw data points which may not form a perfect grid
    
    const plotData = [{
      type: 'scatter3d',
      mode: 'markers',
      x: x,
      y: y,
      z: z,
      marker: {
        size: 5,
        color: z,
        colorscale: colorScheme,
        opacity: 0.8
      }
    }];
    
    const layout = {
      title: {
        text: chartTitle || `3D Surface Plot of ${zAxis}`,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 6,
          color: chartConfig.textColor
        }
      },
      subtitle: chartSubtitle ? {
        text: chartSubtitle,
        font: {
          family: chartConfig.fontFamily,
          size: chartConfig.fontSize + 2,
          color: chartConfig.textColor
        }
      } : null,
      scene: {
        xaxis: {
          title: {
            text: chartConfig.xAxisTitle || xAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize,
              color: chartConfig.textColor
            }
          }
        },
        yaxis: {
          title: {
            text: chartConfig.yAxisTitle || yAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize,
              color: chartConfig.textColor
            }
          }
        },
        zaxis: {
          title: {
            text: chartConfig.zAxisTitle || zAxis,
            font: {
              family: chartConfig.fontFamily,
              size: chartConfig.fontSize,
              color: chartConfig.textColor
            }
          }
        }
      },
      paper_bgcolor: chartConfig.backgroundColor,
      font: {
        family: chartConfig.fontFamily,
        size: chartConfig.fontSize,
        color: chartConfig.textColor
      },
      autosize: true,
      height: chartHeight,
      margin: { l: 10, r: 10, b: 10, t: 80, pad: 4 }
    };
    
    const config = {
      responsive: true,
      displayModeBar: true,
      scrollZoom: chartConfig.enableZoom,
      displaylogo: false,
      toImageButtonOptions: {
        format: 'png',
        filename: '3d_surface_export',
        height: 800,
        width: 1200,
        scale: 2
      }
    };
    
    return (
      <Plot
        ref={plotRef}
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: chartWidth, height: chartHeight }}
        useResizeHandler={true}
      />
    );
  };
  
  // Handle exporting the current chart
  const handleExportChart = (format) => {
    if (!plotRef.current) return;
    
    if (format === 'png' || format === 'svg') {
      // Use Plotly's built-in export functionality
      plotRef.current.toImage({
        format: format,
        height: 800,
        scale: 2
      }).then(dataUrl => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `chart_export.${format}`;
        link.click();
      });
    } else if (format === 'interactive') {
      // Generate HTML with the interactive plot
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Interactive Chart Export</title>
          <script src="https://cdn.plot.ly/plotly-latest.min.js"></script>
          <style>
            body { margin: 0; padding: 20px; font-family: ${chartConfig.fontFamily}; }
            #chart { width: 100%; height: 800px; }
          </style>
        </head>
        <body>
          <div id="chart"></div>
          <script>
            // Chart data and layout
            const data = ${JSON.stringify(plotRef.current.props.data)};
            const layout = ${JSON.stringify(plotRef.current.props.layout)};
            
            // Render the chart
            Plotly.newPlot('chart', data, layout, {responsive: true});
          </script>
        </body>
        </html>
      `;
      
      // Create a Blob with the HTML content
      const blob = new Blob([html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      
      // Create a link and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = 'interactive_chart.html';
      link.click();
      
      // Clean up
      URL.revokeObjectURL(url);
    }
  };
  
  return (
    <Card>
      <Card.Body>
        <Tabs
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="basic" title="Basic">
            <Form>
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Visualization Type:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={vizType}
                    onChange={(e) => setVizType(e.target.value)}
                  >
                    {chartTypes.map((type) => (
                      <option key={type.value} value={type.value} title={type.description}>
                        {type.label}
                      </option>
                    ))}
                  </Form.Select>
                  <Form.Text className="text-muted">
                    {chartTypes.find(t => t.value === vizType)?.description}
                  </Form.Text>
                </Col>
              </Form.Group>
              
              {vizType !== 'Table' && (
                <>
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>
                      X-Axis:
                    </Form.Label>
                    <Col sm={9}>
                      <Form.Select
                        value={xAxis}
                        onChange={(e) => setXAxis(e.target.value)}
                      >
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column} {isNumericColumn(column) ? ' (numeric)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Form.Group>
                  
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>
                      Y-Axis:
                    </Form.Label>
                    <Col sm={9}>
                      <Form.Select
                        value={yAxis}
                        onChange={(e) => setYAxis(e.target.value)}
                      >
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column} {isNumericColumn(column) ? ' (numeric)' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Form.Group>
                  
                  {['3D Surface', 'Heatmap'].includes(vizType) && (
                    <Form.Group as={Row} className="mb-3">
                      <Form.Label column sm={3}>
                        Z-Axis:
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Select
                          value={zAxis}
                          onChange={(e) => setZAxis(e.target.value)}
                        >
                          <option value="">None (use count)</option>
                          {columns.map((column) => (
                            <option key={column} value={column}>
                              {column} {isNumericColumn(column) ? ' (numeric)' : ''}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                    </Form.Group>
                  )}
                  
                  {['Bubble Chart'].includes(vizType) && (
                    <Form.Group as={Row} className="mb-3">
                      <Form.Label column sm={3}>
                        Size Metric:
                      </Form.Label>
                      <Col sm={9}>
                        <Form.Select
                          value={sizeMetric}
                          onChange={(e) => setSizeMetric(e.target.value)}
                        >
                          <option value="">Select a metric</option>
                          {columns.filter(col => isNumericColumn(col)).map((column) => (
                            <option key={column} value={column}>
                              {column}
                            </option>
                          ))}
                        </Form.Select>
                      </Col>
                    </Form.Group>
                  )}
                  
                  {/* Group by field for creating multi-series charts */}
                  <Form.Group as={Row} className="mb-3">
                    <Form.Label column sm={3}>
                      Group By:
                    </Form.Label>
                    <Col sm={9}>
                      <Form.Select
                        value={groupByField}
                        onChange={(e) => setGroupByField(e.target.value)}
                      >
                        <option value="">No grouping</option>
                        {columns.map((column) => (
                          <option key={column} value={column}>
                            {column}
                          </option>
                        ))}
                      </Form.Select>
                    </Col>
                  </Form.Group>
                  
                  {/* Aggregation Method (not used for scatter/bubble) */}
                  {!['Scatter Plot', 'Bubble Chart', '3D Surface', 'Network Graph'].includes(vizType) && (
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
                  )}
                  
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
                </>
              )}
            </Form>
          </Tab>
          
          <Tab eventKey="appearance" title="Style">
            <Form>
              {/* Chart title and subtitle */}
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Chart Title:
                </Form.Label>
                <Col sm={9}>
                  <Form.Control
                    type="text"
                    placeholder="Enter chart title (optional)"
                    value={chartTitle}
                    onChange={(e) => setChartTitle(e.target.value)}
                  />
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Subtitle:
                </Form.Label>
                <Col sm={9}>
                  <Form.Control
                    type="text"
                    placeholder="Enter subtitle (optional)"
                    value={chartSubtitle}
                    onChange={(e) => setChartSubtitle(e.target.value)}
                  />
                </Col>
              </Form.Group>
              
              {/* Colors */}
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Color Scheme:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={colorScheme}
                    onChange={(e) => setColorScheme(e.target.value)}
                  >
                    {colorSchemes.map((scheme) => (
                      <option key={scheme.value} value={scheme.value} title={scheme.description}>
                        {scheme.label}
                      </option>
                    ))}
                  </Form.Select>
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Custom Colors:
                </Form.Label>
                <Col sm={9}>
                  <div className="d-flex gap-2 mb-2">
                    {customColors.map((color, index) => (
                      <div key={index} style={{ position: 'relative' }}>
                        <Form.Control
                          type="color"
                          value={color}
                          onChange={(e) => {
                            const newColors = [...customColors];
                            newColors[index] = e.target.value;
                            setCustomColors(newColors);
                          }}
                          style={{ width: '40px', height: '40px' }}
                        />
                        <Button
                          variant="light"
                          size="sm"
                          style={{
                            position: 'absolute',
                            top: -5,
                            right: -5,
                            borderRadius: '50%',
                            width: '20px',
                            height: '20px',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          onClick={() => {
                            const newColors = [...customColors];
                            newColors.splice(index, 1);
                            setCustomColors(newColors);
                          }}
                        >
                          ×
                        </Button>
                      </div>
                    ))}
                    <Button
                      variant="outline-secondary"
                      onClick={() => setCustomColors([...customColors, '#1f77b4'])}
                    >
                      + Add Color
                    </Button>
                  </div>
                </Col>
              </Form.Group>
              
              {/* Size and dimension */}
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Chart Height:
                </Form.Label>
                <Col sm={9}>
                  <Form.Control
                    type="number"
                    value={chartHeight}
                    onChange={(e) => setChartHeight(parseInt(e.target.value) || 500)}
                    min={200}
                    max={1200}
                  />
                </Col>
              </Form.Group>
              
              {/* Font and appearance */}
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Font Family:
                </Form.Label>
                <Col sm={9}>
                  <Form.Select
                    value={chartConfig.fontFamily}
                    onChange={(e) => setChartConfig({...chartConfig, fontFamily: e.target.value})}
                  >
                    <option value="Arial, sans-serif">Arial</option>
                    <option value="'Helvetica Neue', Helvetica, sans-serif">Helvetica</option>
                    <option value="'Times New Roman', Times, serif">Times New Roman</option>
                    <option value="'Courier New', Courier, monospace">Courier New</option>
                    <option value="Georgia, serif">Georgia</option>
                    <option value="Verdana, sans-serif">Verdana</option>
                    <option value="Tahoma, sans-serif">Tahoma</option>
                  </Form.Select>
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Font Size:
                </Form.Label>
                <Col sm={9}>
                  <Form.Control
                    type="number"
                    value={chartConfig.fontSize}
                    onChange={(e) => setChartConfig({...chartConfig, fontSize: parseInt(e.target.value) || 12})}
                    min={8}
                    max={24}
                  />
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Background Color:
                </Form.Label>
                <Col sm={9}>
                  <Form.Control
                    type="color"
                    value={chartConfig.backgroundColor}
                    onChange={(e) => setChartConfig({...chartConfig, backgroundColor: e.target.value})}
                  />
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Form.Label column sm={3}>
                  Text Color:
                </Form.Label>
                <Col sm={9}>
                  <Form.Control
                    type="color"
                    value={chartConfig.textColor}
                    onChange={(e) => setChartConfig({...chartConfig, textColor: e.target.value})}
                  />
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Col sm={{ span: 9, offset: 3 }}>
                  <Form.Check
                    type="checkbox"
                    id="show-legend"
                    label="Show Legend"
                    checked={showLegend}
                    onChange={(e) => setShowLegend(e.target.checked)}
                  />
                </Col>
              </Form.Group>
              
              <Form.Group as={Row} className="mb-3">
                <Col sm={{ span: 9, offset: 3 }}>
                  <Form.Check
                    type="checkbox"
                    id="show-gridlines"
                    label="Show Grid Lines"
                    checked={chartConfig.gridLines}
                    onChange={(e) => setChartConfig({...chartConfig, gridLines: e.target.checked})}
                  />
                </Col>
              </Form.Group>
            </Form>
          </Tab>
          
          <Tab eventKey="network" title="Network" disabled={vizType !== 'Network Graph'}>
            {vizType === 'Network Graph' && (
              <Form>
                <Alert variant="info">
                  Configure network graph settings by selecting which columns contain node and edge data.
                </Alert>
                
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm={3}>
                    Node Field:
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
                      value={nodeField}
                      onChange={(e) => setNodeField(e.target.value)}
                    >
                      <option value="">Select node identifier column</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Column containing unique identifiers for nodes/entities
                    </Form.Text>
                  </Col>
                </Form.Group>
                
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm={3}>
                    Edge Source Field:
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
                      value={edgeSourceField}
                      onChange={(e) => setEdgeSourceField(e.target.value)}
                    >
                      <option value="">Select source column</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Column containing source node of relationships
                    </Form.Text>
                  </Col>
                </Form.Group>
                
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm={3}>
                    Edge Target Field:
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
                      value={edgeTargetField}
                      onChange={(e) => setEdgeTargetField(e.target.value)}
                    >
                      <option value="">Select target column</option>
                      {columns.map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Column containing target node of relationships
                    </Form.Text>
                  </Col>
                </Form.Group>
                
                <Form.Group as={Row} className="mb-3">
                  <Form.Label column sm={3}>
                    Edge Weight Field:
                  </Form.Label>
                  <Col sm={9}>
                    <Form.Select
                      value={edgeWeightField}
                      onChange={(e) => setEdgeWeightField(e.target.value)}
                    >
                      <option value="">None (equal weights)</option>
                      {columns.filter(col => isNumericColumn(col)).map((column) => (
                        <option key={column} value={column}>
                          {column}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Optional numeric column for edge weight/strength
                    </Form.Text>
                  </Col>
                </Form.Group>
              </Form>
            )}
          </Tab>
          
          <Tab eventKey="export" title="Export">
            <div className="p-3">
              <h5>Export Chart</h5>
              <p>Export your chart in various formats for presentations, reports, or web pages.</p>
              
              <Row className="mt-4">
                <Col sm={4}>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Static PNG image, best for presentations</Tooltip>}
                  >
                    <Button 
                      variant="outline-primary" 
                      className="w-100 mb-2"
                      onClick={() => handleExportChart('png')}
                      disabled={vizType === 'Table' || !plotRef.current}
                    >
                      Export as PNG
                    </Button>
                  </OverlayTrigger>
                </Col>
                
                <Col sm={4}>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Vector SVG image, best for print</Tooltip>}
                  >
                    <Button 
                      variant="outline-primary" 
                      className="w-100 mb-2"
                      onClick={() => handleExportChart('svg')}
                      disabled={vizType === 'Table' || !plotRef.current}
                    >
                      Export as SVG
                    </Button>
                  </OverlayTrigger>
                </Col>
                
                <Col sm={4}>
                  <OverlayTrigger
                    placement="top"
                    overlay={<Tooltip>Interactive HTML that can be opened in a browser</Tooltip>}
                  >
                    <Button 
                      variant="outline-primary" 
                      className="w-100 mb-2"
                      onClick={() => handleExportChart('interactive')}
                      disabled={vizType === 'Table' || !plotRef.current}
                    >
                      Interactive HTML
                    </Button>
                  </OverlayTrigger>
                </Col>
              </Row>
            </div>
          </Tab>
        </Tabs>
        
        <div className="mt-4">
          {renderVisualization()}
        </div>
      </Card.Body>
    </Card>
  );
};

export default Visualization;
