import regression from 'regression';
import * as ss from 'simple-statistics';
import _ from 'lodash';

/**
 * Converts SPARQL results to a more usable format for data analysis
 * 
 * @param {Array} data - The data rows
 * @param {Array} columns - Column names
 * @returns {Array} - Array of objects with column names as keys
 */
export const processData = (data, columns) => {
  return data.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      // Try to convert to numeric if possible
      const value = row[index];
      obj[col] = !isNaN(value) && value !== '' ? parseFloat(value) : value;
    });
    return obj;
  });
};

/**
 * Perform linear regression analysis
 * 
 * @param {Array} data - The data rows
 * @param {Array} columns - Column names
 * @param {string} dependentVar - The dependent variable
 * @param {Array} independentVars - The independent variables
 * @returns {Object} - Regression results, plot data, and statistics
 */
export const performRegression = (data, columns, dependentVar, independentVars) => {
  try {
    // Convert data to objects format
    const processedData = processData(data, columns);
    
    // Check if we have enough data for regression
    if (processedData.length < 2) {
      return {
        success: false,
        error: "Not enough data points for regression analysis."
      };
    }
    
    // For simplicity, we'll focus on single-variable regression for visualization
    // For multi-variable, we'd need more complex visualization
    const independentVar = independentVars[0];
    
    // Extract X and Y values, filtering out non-numeric or missing values
    const validData = processedData.filter(row => 
      !isNaN(row[dependentVar]) && 
      !isNaN(row[independentVar]) &&
      row[dependentVar] !== null && 
      row[independentVar] !== null
    );
    
    if (validData.length < 2) {
      return {
        success: false,
        error: "Not enough valid numeric data points for regression analysis."
      };
    }
    
    // Format data for regression library
    const points = validData.map(row => [row[independentVar], row[dependentVar]]);
    
    // Perform the regression
    const result = regression.linear(points);
    
    // Calculate statistics
    const xValues = validData.map(row => row[independentVar]);
    const yValues = validData.map(row => row[dependentVar]);
    
    // Get coefficient of determination (R²)
    const rSquared = result.r2;
    
    // Get slope and intercept
    const [intercept, slope] = [result.equation[1], result.equation[0]];
    
    // Calculate predicted Y values
    const predictedY = validData.map(row => slope * row[independentVar] + intercept);
    
    // Calculate standard error
    const squaredResiduals = yValues.map((actual, i) => 
      Math.pow(actual - predictedY[i], 2)
    );
    const sumSquaredResiduals = squaredResiduals.reduce((sum, val) => sum + val, 0);
    const standardError = Math.sqrt(sumSquaredResiduals / (validData.length - 2));
    
    // Calculate p-value
    // This is simplified - in a real implementation you would use a proper t-test
    const tStat = slope / (standardError / Math.sqrt(ss.sumSimple(xValues.map(x => Math.pow(x - ss.mean(xValues), 2)))));
    
    // Calculate degrees of freedom
    const degreesOfFreedom = validData.length - 2;
    
    // Prepare plot data for visualization
    const scatterData = validData.map(row => ({
      x: row[independentVar],
      y: row[dependentVar]
    }));
    
    // Generate line data for the regression line
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const lineData = [
      { x: minX, y: slope * minX + intercept },
      { x: maxX, y: slope * maxX + intercept }
    ];
    
    // Format regression summary similar to statsmodels in Python
    const summary = {
      equation: `${dependentVar} = ${slope.toFixed(4)} * ${independentVar} + ${intercept.toFixed(4)}`,
      r2: rSquared,
      standardError,
      observations: validData.length,
      degreesOfFreedom,
      coefficients: {
        intercept: {
          value: intercept,
          standardError: standardError / Math.sqrt(validData.length)
        },
        slope: {
          value: slope,
          standardError: standardError / Math.sqrt(ss.sumSimple(xValues.map(x => Math.pow(x - ss.mean(xValues), 2))))
        }
      }
    };
    
    return {
      success: true,
      summary,
      scatterData,
      lineData,
      error: null
    };
  } catch (error) {
    return {
      success: false,
      error: `Regression analysis failed: ${error.message}`
    };
  }
};
