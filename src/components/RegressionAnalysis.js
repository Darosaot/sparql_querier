import React, { useState } from 'react';
import { Card, Form, Button, Row, Col, Alert } from 'react-bootstrap';
import Plot from 'react-plotly.js';
import { performRegression } from '../utils/dataUtils';

const RegressionAnalysis = ({ data, columns }) => {
  const [dependentVar, setDependentVar] = useState(columns[0] || '');
  const [independentVars, setIndependentVars] = useState([]);
  const [regressionResult, setRegressionResult] = useState(null);
  const [error, setError] = useState(null);
  
  // Handle dependent variable selection
  const handleDependentVarChange = (e) => {
    setDependentVar(e.target.value);
  };
  
  // Handle independent variables selection
  const handleIndependentVarsChange = (e) => {
    const options = e.target.options;
    const selectedValues = [];
    
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) {
        selectedValues.push(options[i].value);
      }
    }
    
    setIndependentVars(selectedValues);
  };
  
  // Perform regression analysis
  const handlePerformRegression = () => {
    if (!dependentVar || independentVars.length === 0) {
      setError('Please select both dependent and independent variables');
      return;
    }
    
    const result = performRegression(data, columns, dependentVar, independentVars);
    
    if (result.success) {
      setRegressionResult(result);
      setError(null);
    } else {
      setError(result.error);
      setRegressionResult(null);
    }
  };
  
  // Render regression results
  const renderRegressionResults = () => {
    if (!regressionResult) return null;
    
    const { summary, scatterData, lineData } = regressionResult;
    
    // Create plot data
    const plotData = [
      {
        x: scatterData.map(point => point.x),
        y: scatterData.map(point => point.y),
        mode: 'markers',
        type: 'scatter',
        name: 'Data Points',
        marker: { color: 'blue' }
      },
      {
        x: lineData.map(point => point.x),
        y: lineData.map(point => point.y),
        mode: 'lines',
        type: 'scatter',
        name: 'Regression Line',
        line: { color: 'red' }
      }
    ];
    
    const layout = {
      title: `Regression: ${dependentVar} vs ${independentVars[0]}`,
      xaxis: { title: independentVars[0] },
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
            {independentVars[0]}: {summary.coefficients.slope.value.toFixed(4)} (Standard Error: {summary.coefficients.slope.standardError.toFixed(4)})
          </code>
        </pre>
        
        <h5 className="mt-4">Regression Plot</h5>
        <Plot
          data={plotData}
          layout={layout}
          style={{ width: '100%' }}
          useResizeHandler={true}
        />
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
              Independent Variables (X):
            </Form.Label>
            <Col sm={9}>
              <Form.Select
                multiple
                value={independentVars}
                onChange={handleIndependentVarsChange}
                style={{ height: '150px' }}
              >
                {columns
                  .filter((column) => column !== dependentVar)
                  .map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
              </Form.Select>
              <Form.Text className="text-muted">
                Hold Ctrl (or Cmd on Mac) to select multiple variables
              </Form.Text>
            </Col>
          </Form.Group>
          
          <div className="d-grid gap-2">
            <Button
              variant="primary"
              onClick={handlePerformRegression}
              disabled={!dependentVar || independentVars.length === 0}
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
