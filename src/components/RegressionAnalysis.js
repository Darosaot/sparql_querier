import React, { useState, useEffect } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import * as ss from 'simple-statistics';
import _ from 'lodash';

const RegressionAnalysis = ({ data, columns }) => {
  const [dependentVar, setDependentVar] = useState('');
  const [independentVar, setIndependentVar] = useState('');
  const [regressionResult, setRegressionResult] = useState(null);
  const [error, setError] = useState(null);
  const [categoricalVars, setCategoricalVars] = useState(new Set());
  const [numericVars, setNumericVars] = useState(new Set());
  
  // Initialize default selections when component mounts or data changes
  useEffect(() => {
    if (columns.length > 0 && data.length > 0) {
      // Detect data types for each column
      detectDataTypes();
      
      // Set default selections based on detected types
      if (numericVars.size > 0) {
        const numericColumns = columns.filter(col => numericVars.has(col));
        setDependentVar(numericColumns[0] || '');
        setIndependentVar(numericColumns.length > 1 ? numericColumns[1] : numericColumns[0]);
      }
    }
  }, [data, columns]);
  
  // Detect numeric and categorical variables
  const detectDataTypes = () => {
    const numeric = new Set();
    const categorical = new Set();
    
    columns.forEach(column => {
      const columnIndex = columns.indexOf(column);
      const values = data.map(row => row[columnIndex]);
      
      // Check if column is numeric
      const hasNumericValues = values.some(val => {
        const numVal = Number(val);
        return !isNaN(numVal) && typeof val !== 'boolean';
      });
      
      // If at least some values are numeric and not boolean, consider it numeric
      if (hasNumericValues) {
        numeric.add(column);
      } else {
        categorical.add(column);
      }
    });
    
    setNumericVars(numeric);
    setCategoricalVars(categorical);
  };
  
  // Handle dependent variable selection
  const handleDependentVarChange = (e) => {
    setDependentVar(e.target.value);
  };
  
  // Handle independent variable selection
  const handleIndependentVarChange = (e) => {
    setIndependentVar(e.target.value);
  };
  
  // Perform regression analysis
  const handlePerformRegression = () => {
    if (!dependentVar || !independentVar) {
      setError('Please select both dependent and independent variables');
      return;
    }
    
    try {
      // Get column indices
      const dependentIndex = columns.indexOf(dependentVar);
      const independentIndex = columns.indexOf(independentVar);
      
      if (dependentIndex === -1 || independentIndex === -1) {
        setError('Column not found');
        return;
      }
      
      // Extract values from the selected columns
      let yValues = data.map(row => {
        const val = row[dependentIndex];
        return typeof val === 'string' ? Number(val) : val;
      });
      
      let xValues = data.map(row => {
        const val = row[independentIndex];
        return val;
      });
      
      // Check if independent variable is categorical
      const isIndependentCategorical = categoricalVars.has(independentVar);
      
      // Create processed data for regression
      let processedData = [];
      
      if (isIndependentCategorical) {
        // For categorical independent variables, we need to encode them
        const uniqueCategories = _.uniq(xValues.filter(x => x !== null && x !== ''));
        
        // Create a mapping of categories to numeric values
        const categoryMapping = {};
        uniqueCategories.forEach((cat, index) => {
          categoryMapping[cat] = index;
        });
        
        // Replace categorical values with their numeric encoding
        const encodedXValues = xValues.map(x => 
          (x !== null && x !== '') ? categoryMapping[x] : NaN
        );
        
        // Filter out any NaN values in both x and y
        for (let i = 0; i < data.length; i++) {
          const x = encodedXValues[i];
          const y = yValues[i];
          
          if (!isNaN(x) && !isNaN(y)) {
            processedData.push({ x, y, originalX: xValues[i] });
          }
        }
      } else {
        // For numeric independent variables, just convert to numbers
        for (let i = 0; i < data.length; i++) {
          const x = typeof xValues[i] === 'string' ? Number(xValues[i]) : xValues[i];
          const y = yValues[i];
          
          if (!isNaN(x) && !isNaN(y)) {
            processedData.push({ x, y });
          }
        }
      }
      
      // Check if we have enough data points
      if (processedData.length < 2) {
        setError('Not enough valid numeric data points for regression analysis. Need at least 2 points with valid values for both variables.');
        setRegressionResult(null);
        return;
      }
      
      // Perform linear regression
      const xForRegression = processedData.map(point => point.x);
      const yForRegression = processedData.map(point => point.y);
      
      // Calculate regression using simple-statistics
      const linearRegression = ss.linearRegression(
        xForRegression.map((x, i) => [x, yForRegression[i]])
      );
      
      const slope = linearRegression.m;
      const intercept = linearRegression.b;
      
      // Calculate r-squared
      const predictedY = xForRegression.map(x => slope * x + intercept);
      const meanY = ss.mean(yForRegression);
      
      const ssTotal = yForRegression.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
      const ssResidual = yForRegression.reduce((sum, y, i) => sum + Math.pow(y - predictedY[i], 2), 0);
      const rSquared = 1 - (ssResidual / ssTotal);
      
      // Calculate standard error
      const standardError = Math.sqrt(ssResidual / (processedData.length - 2));
      
      // Generate plot data
      const minX = Math.min(...xForRegression);
      const maxX = Math.max(...xForRegression);
      
      const lineData = [
        { x: minX, y: slope * minX + intercept },
        { x: maxX, y: slope * maxX + intercept }
      ];
      
      // Create the result object
      const result = {
        success: true,
        summary: {
          equation: `${dependentVar} = ${slope.toFixed(4)} * ${independentVar} + ${intercept.toFixed(4)}`,
          r2: rSquared,
          standardError,
          observations: processedData.length,
          degreesOfFreedom: processedData.length - 2,
          coefficients: {
            intercept: {
              value: intercept,
              standardError: standardError / Math.sqrt(processedData.length)
            },
            slope: {
              value: slope,
              standardError: standardError / Math.sqrt(ss.sumSimple(xForRegression.map(x => Math.pow(x - ss.mean(xForRegression), 2))))
            }
          }
        },
        scatterData: processedData,
        lineData,
        isCategorical: isIndependentCategorical
      };
      
      setRegressionResult(result);
      setError(null);
    } catch (err) {
      setError(`Error performing regression: ${err.message}`);
      setRegressionResult(null);
    }
  };
  
  // Render regression results
  const renderRegressionResults = () => {
    if (!regressionResult) return null;
    
    const { summary, scatterData, lineData, isCategorical } = regressionResult;
    
    // Create plot data
    const plotData = [
      {
        x: scatterData.map(point => isCategorical ? point.originalX : point.x),
        y: scatterData.map(point => point.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Data Points',
        marker: { color: 'blue' }
      }
    ];
    
    // Only add regression line for non-categorical variables
    if (!isCategorical) {
      plotData.push({
        x: lineData.map(point => point.x),
        y: lineData.map(point => point.y),
        mode: 'lines',
        type: 'scatter',
        name: 'Regression Line',
        line: { color: 'red' }
      });
    }
    
    const layout = {
      title: `Regression: ${dependentVar} vs ${independentVar}`,
      xaxis: { 
        title: independentVar,
        type: isCategorical ? 'category' : 'linear'
      },
      yaxis: { title: dependentVar },
      autosize: true,
      height: 500
    };
    
    return (
      <div className="mt-4">
        <h5>Regression Statistics</h5>
        <pre className="bg-light p-3 rounded">
          <code>
            Regression Equation: {summary.equation}{'\n'}
            R-squared: {summary.r2.toFixed(4)}{'\n'}
            Standard Error: {summary.standardError.toFixed(4)}{'\n'}
            Observations: {summary.observations}{'\n'}
            Degrees of Freedom: {summary.degreesOfFreedom}{'\n\n'}
            Coefficients:{'\n'}
            Intercept: {summary.coefficients.intercept.value.toFixed(4)} (Standard Error: {summary.coefficients.intercept.standardError.toFixed(4)}){'\n'}
            {independentVar}: {summary.coefficients.slope.value.toFixed(4)} (Standard Error: {summary.coefficients.slope.standardError.toFixed(4)})
          </code>
        </pre>
        
        <h5 className="mt-4">Regression Plot</h5>
        <Plot
          data={plotData}
          layout={layout}
          style={{ width: '100%' }}
          useResizeHandler={true}
        />
        
        {isCategorical && (
          <Alert variant="info" className="mt-3">
            <strong>Note:</strong> You&apos;ve selected a categorical variable ({independentVar}) for regression. 
            The regression model has been fitted by encoding categorical values as numbers, but this may not 
            be statistically meaningful. Consider this as an exploratory analysis.
          </Alert>
        )}
      </div>
    );
  };
  
  return (
    <Card>
      <Card.Body>
        <Form>
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Dependent Variable (Y):
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={dependentVar}
                onChange={handleDependentVarChange}
              >
                <option value="">Select a variable</option>
                {columns.map((column) => (
                  <option 
                    key={column} 
                    value={column}
                    disabled={!numericVars.has(column)}
                  >
                    {column} {!numericVars.has(column) ? '(non-numeric)' : ''}
                  </option>
                ))}
              </Form.Select>
              <Form.Text className="text-muted">
                The dependent variable must be numeric.
              </Form.Text>
            </Col>
          </Form.Group>
          
          <Form.Group as={Row} className="mb-3">
            <Form.Label column sm={3}>
              Independent Variable (X):
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                value={independentVar}
                onChange={handleIndependentVarChange}
              >
                <option value="">Select a variable</option>
                {columns
                  .filter((column) => column !== dependentVar)
                  .map((column) => (
                    <option 
                      key={column} 
                      value={column}
                    >
                      {column} {categoricalVars.has(column) ? '(categorical)' : ''}
                    </option>
                  ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Both numeric and categorical variables can be used, but results may vary.
              </Form.Text>
            </Col>
          </Form.Group>
          
          <div className="d-grid gap-2">
            <Button
              variant="primary"
              onClick={handlePerformRegression}
              disabled={!dependentVar || !independentVar}
            >
              Perform Linear Regression
            </Button>
          </div>
        </Form>
        
        {error && (
          <Alert variant="danger" className="mt-3">
            {error}
          </Alert>
        )}
        
        {renderRegressionResults()}
      </Card.Body>
    </Card>
  );
};

export default RegressionAnalysis;
