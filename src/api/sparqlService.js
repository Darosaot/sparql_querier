// src/api/sparqlService.js - Updated with enhanced error handling, timeouts, and query monitoring

import axios from 'axios';

/**
 * Default and maximum timeout settings for queries
 */
const TIMEOUT_SETTINGS = {
  DEFAULT: 120000,    // 2 minutes
  COMPLEX: 300000,    // 5 minutes
  MAXIMUM: 600000     // 10 minutes (absolute max)
};

/**
 * Executes a SPARQL query against a specified endpoint
 * First tries direct communication, then falls back to Netlify Function proxy if needed
 * 
 * @param {string} endpoint - The SPARQL endpoint URL
 * @param {string} query - The SPARQL query
 * @param {Object} options - Optional settings for execution
 * @returns {Promise} - Promise resolving to the query results
 */
export const executeQuery = async (endpoint, query, options = {}) => {
  const startTime = performance.now();
  
  // Determine appropriate timeout based on query complexity
  const queryComplexity = isComplexQuery(query);
  const timeout = options.timeout || 
                 (queryComplexity ? TIMEOUT_SETTINGS.COMPLEX : TIMEOUT_SETTINGS.DEFAULT);
  
  console.log(`Query complexity: ${queryComplexity ? 'Complex' : 'Standard'}, using timeout: ${timeout/1000}s`);
  
  try {
    // Create a cancellation token source
    const source = axios.CancelToken.source();
    // First try direct request to the endpoint (some SPARQL endpoints support CORS)
    console.log('Trying direct request to the SPARQL endpoint');
    
    // Use a longer timeout for complex queries
    const response = await axios.post(endpoint, 
      new URLSearchParams({
        query: query
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SPARQLAnalyticsApp/1.0'
        },
        timeout: timeout,
        cancelToken: source.token
      }
    );
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;
    
    // Process SPARQL results
    if (response.data.results && response.data.results.bindings) {
      const bindings = response.data.results.bindings;
      const columns = response.data.head.vars;
      
      // Transform SPARQL JSON results to array format
      const data = bindings.map(row => 
        columns.map(col => (col in row ? row[col].value : ""))
      );
      
      console.log(`Query executed successfully in ${executionTime.toFixed(2)}s with ${data.length} results`);
      
      return {
        success: true,
        columns,
        data,
        error: null,
        executionTime,
        rawResponse: response.data // Include the raw response for advanced use cases
      };
    } else if (response.data.boolean !== undefined) {
      // Handle ASK query results
      return {
        success: true,
        columns: ['result'],
        data: [[response.data.boolean.toString()]],
        error: null,
        executionTime,
        rawResponse: response.data
      };
    } else if (response.data.results && !response.data.results.bindings) {
      // Empty result set
      return {
        success: true,
        columns: response.data.head?.vars || [],
        data: [],
        error: null,
        executionTime,
        rawResponse: response.data
      };
    } else {
      // Other types of valid responses
      return {
        success: true,
        columns: response.data.head?.vars || [],
        data: response.data.results?.bindings || [],
        error: null,
        executionTime,
        rawResponse: response.data
      };
    }
  } catch (directError) {
    console.error('Direct request failed:', directError);
    
    // If direct request fails, try using the Netlify proxy
    try {
      console.log('Direct request failed, trying Netlify proxy');
      
      // Try using a relative URL to the Netlify function
      const proxyUrl = '/.netlify/functions/sparql-proxy';
      
      const proxyResponse = await axios.post(proxyUrl, {
        
        endpoint: endpoint,
        query: query
      }, {
        timeout: timeout, // Same timeout for proxy
        cancelToken: source.token
      });
      
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000;
      
      if (proxyResponse.data.results && proxyResponse.data.results.bindings) {
        const bindings = proxyResponse.data.results.bindings;
        const columns = proxyResponse.data.head.vars;
        
        const data = bindings.map(row => 
          columns.map(col => (col in row ? row[col].value : ""))
        );
        
        return {
          success: true,
          columns,
          data,
          error: null,
          executionTime,
          rawResponse: proxyResponse.data
        };
      } else if (proxyResponse.data.boolean !== undefined) {
        // Handle ASK query results
        return {
          success: true,
          columns: ['result'],
          data: [[proxyResponse.data.boolean.toString()]],
          error: null,
          executionTime,
          rawResponse: proxyResponse.data
        };
      } else if (proxyResponse.data.results && !proxyResponse.data.results.bindings) {
        // Empty result set
        return {
          success: true,
          columns: proxyResponse.data.head?.vars || [],
          data: [],
          error: null,
          executionTime,
          rawResponse: proxyResponse.data
        };
      } else {
        // Other types of valid responses
        return {
          success: true,
          columns: proxyResponse.data.head?.vars || [],
          data: proxyResponse.data.results?.bindings || [],
          error: null,
          executionTime,
          rawResponse: proxyResponse.data
        };
      }
    } catch (proxyError) {
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000;
      
      // Extract the most useful error message
      let errorMessage = '';
      let errorDetails = null;
      
      if (directError.response) {
        // The server responded with a status code outside the 2xx range
        errorMessage = `Server error (${directError.response.status}): ${directError.response.data?.message || directError.message}`;
        errorDetails = {
          status: directError.response.status,
          statusText: directError.response.statusText,
          data: directError.response.data
        };
      } else if (directError.request) {
        // The request was made but no response was received
        if (directError.code === 'ECONNABORTED') {
          errorMessage = `Query timed out after ${timeout/1000} seconds. This may be because the query is too complex or returns too many results.`;
          // Suggest increasing timeout
          errorDetails = {
            code: directError.code,
            type: 'timeout',
            suggestedAction: 'Consider simplifying your query or adding more specific filters.'
          };
        } else {
          errorMessage = 'No response received from the endpoint. It may be unreachable or not supporting CORS.';
          errorDetails = {
            code: directError.code,
            type: 'network'
          };
        }
      } else {
        // Something happened in setting up the request
        errorMessage = directError.message;
        errorDetails = {
          type: 'request_setup'
        };
      }
      
      const proxyErrorMessage = proxyError.response 
        ? `Proxy error (${proxyError.response.status}): ${proxyError.response.data?.error || proxyError.message}`
        : proxyError.message;
      
      return {
        success: false,
        columns: [],
        data: [],
        error: `Failed to query the SPARQL endpoint: ${errorMessage}. Proxy attempt also failed: ${proxyErrorMessage}`,
        executionTime,
        errorDetails: {
          direct: errorDetails,
          proxy: {
            message: proxyErrorMessage,
            code: proxyError.code
          }
        }
      };
    }
  }
};

/**
 * Enhanced validation function for SPARQL queries
 * Checks for required keywords and structure
 * 
 * @param {string} query - The SPARQL query to validate
 * @returns {boolean} - True if the query is valid
 */
export const isValidSparql = (query) => {
  try {
    if (!query || query.trim() === '') {
      return false;
    }
    
    const upperQuery = query.toUpperCase();
    
    // Check for query type (more permissive for complex queries)
    const hasQueryType = /\b(SELECT|ASK|CONSTRUCT|DESCRIBE)\b/i.test(query);
    if (!hasQueryType) {
      return false;
    }
    
    // For complex queries with subqueries, we'll be more lenient
    if (upperQuery.includes('SELECT') && upperQuery.includes('WHERE') && 
        upperQuery.includes('{') && upperQuery.includes('}')) {
      return true;
    }
    
    // Check for WHERE clause (required for SELECT, ASK, CONSTRUCT)
    if (/\b(SELECT|ASK|CONSTRUCT)\b/i.test(query) && !upperQuery.includes('WHERE')) {
      return false;
    }
    
    // Check for balanced braces
    const openBraces = (query.match(/\{/g) || []).length;
    const closeBraces = (query.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      return false;
    }
    
    // Check for unclosed quotes
    const doubleQuotes = (query.match(/"/g) || []).length;
    if (doubleQuotes % 2 !== 0) {
      return false;
    }
    
    const singleQuotes = (query.match(/'/g) || []).length;
    if (singleQuotes % 2 !== 0) {
      return false;
    }
    
    return true;
  } catch (error) {
    console.error("Error validating SPARQL query:", error);
    // If there's an error in validation, we'll return true to allow the query to proceed
    // This is better than blocking potentially valid but complex queries
    return true;
  }
};

/**
 * Get information about SPARQL endpoint capabilities
 * Attempts to determine supported features by querying the endpoint
 * 
 * @param {string} endpoint - The SPARQL endpoint URL
 * @returns {Promise} - Promise resolving to endpoint capabilities
 */
export const getEndpointCapabilities = async (endpoint) => {
  try {
    // Test if the endpoint supports ASK queries
    const askTest = await axios.post(endpoint,
      new URLSearchParams({
        query: 'ASK { ?s ?p ?o . }'
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    // Test if the endpoint supports aggregates (COUNT)
    const aggregateTest = await axios.post(endpoint,
      new URLSearchParams({
        query: 'SELECT (COUNT(*) AS ?count) WHERE { ?s ?p ?o . } LIMIT 1'
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    // Test if the endpoint supports subqueries
    const subqueryTest = await axios.post(endpoint,
      new URLSearchParams({
        query: 'SELECT ?s WHERE { ?s ?p ?o . { SELECT ?o WHERE { ?s ?p ?o } LIMIT 1 } } LIMIT 1'
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    // Test if the endpoint supports BIND expressions
    const bindTest = await axios.post(endpoint,
      new URLSearchParams({
        query: 'SELECT ?s ?val WHERE { ?s ?p ?o . BIND(CONCAT("value:", ?o) AS ?val) } LIMIT 1'
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    // Test if the endpoint supports GROUP BY
    const groupByTest = await axios.post(endpoint,
      new URLSearchParams({
        query: 'SELECT ?p (COUNT(?o) AS ?count) WHERE { ?s ?p ?o . } GROUP BY ?p LIMIT 5'
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      }
    );
    
    return {
      success: true,
      capabilities: {
        supportsAsk: askTest.status === 200,
        supportsAggregates: aggregateTest.status === 200,
        supportsSubqueries: subqueryTest.status === 200,
        supportsBind: bindTest.status === 200,
        supportsGroupBy: groupByTest.status === 200,
        supportsFederatedQueries: false // Would need more testing
      }
    };
  } catch (error) {
    return {
      success: false,
      capabilities: {
        supportsAsk: false,
        supportsAggregates: false,
        supportsSubqueries: false,
        supportsBind: false,
        supportsGroupBy: false,
        supportsFederatedQueries: false
      },
      error: error.message
    };
  }
};

/**
 * Checks if a query is likely to be complex based on certain heuristics
 * Used to determine if standard validation should be skipped and longer timeouts should be used
 * 
 * @param {string} query - The SPARQL query to analyze
 * @returns {boolean} - True if the query is likely complex
 */
export const isComplexQuery = (query) => {
  if (!query) return false;
  
  const upperQuery = query.toUpperCase();
  
  // Check for various indicators of complex queries
  const hasSubquery = upperQuery.includes('SELECT') && 
                      upperQuery.lastIndexOf('SELECT') !== upperQuery.indexOf('SELECT');
  
  const hasMultipleOptionals = (upperQuery.match(/OPTIONAL/g) || []).length > 2;
  
  const hasUnion = upperQuery.includes('UNION');
  
  const hasGroupBy = upperQuery.includes('GROUP BY');
  
  const hasAggregate = /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(upperQuery);
  
  const hasBind = upperQuery.includes('BIND(');
  
  const hasNestedBlocks = (upperQuery.match(/\{/g) || []).length > 3;
  
  // If query has more than 20 lines, consider it complex
  const lineCount = (query.match(/\n/g) || []).length + 1;
  const isLongQuery = lineCount > 20;
  
  // Check for complex FILTER expressions
  const hasComplexFilters = upperQuery.includes('FILTER') && 
                           (upperQuery.match(/FILTER/g) || []).length > 2;
  
  return hasSubquery || 
         hasMultipleOptionals || 
         hasUnion || 
         hasGroupBy || 
         hasAggregate || 
         hasBind || 
         hasNestedBlocks || 
         isLongQuery ||
         hasComplexFilters;
};

/**
 * Attempts to optimize a SPARQL query for better performance
 * Applies various heuristics to modify the query
 * 
 * @param {string} query - The original SPARQL query
 * @returns {string} - The optimized query
 */
export const optimizeQuery = (query) => {
  if (!query) return query;
  
  let optimizedQuery = query;
  
  // Add LIMIT if missing and not aggregating
  if (!optimizedQuery.toUpperCase().includes('LIMIT') && 
      !optimizedQuery.toUpperCase().includes('GROUP BY') &&
      !optimizedQuery.toUpperCase().includes('COUNT(') &&
      !optimizedQuery.toUpperCase().includes('SUM(') &&
      !optimizedQuery.toUpperCase().includes('AVG(') &&
      !optimizedQuery.toUpperCase().includes('MIN(') &&
      !optimizedQuery.toUpperCase().includes('MAX(')) {
    
    // Find where to add the LIMIT
    if (optimizedQuery.toUpperCase().includes('ORDER BY')) {
      // Add after ORDER BY
      optimizedQuery = optimizedQuery.replace(/ORDER BY.+?$/is, match => `${match} LIMIT 1000`);
    } else {
      // Add at the end
      optimizedQuery = `${optimizedQuery.trim()} LIMIT 1000`;
    }
  }
  
  // Suggest adding more specific filters or indexes
  // (This is just a placeholder for a more sophisticated optimizer)
  
  return optimizedQuery;
};

/**
 * Analyzes a SPARQL query in detail and provides hints
 * 
 * @param {string} query - The SPARQL query to analyze
 * @returns {Object} - Detailed analysis of the query
 */
export const analyzeQuery = (query) => {
  if (!query) return { isValid: false, message: 'Empty query' };
  
  try {
    const upperQuery = query.toUpperCase();
    const queryType = upperQuery.includes('SELECT') ? 'SELECT' :
                    upperQuery.includes('ASK') ? 'ASK' :
                    upperQuery.includes('CONSTRUCT') ? 'CONSTRUCT' :
                    upperQuery.includes('DESCRIBE') ? 'DESCRIBE' : 'UNKNOWN';
    
    // Extract variables that are projected in the result
    const selectVars = [];
    if (queryType === 'SELECT') {
      const selectMatch = query.match(/SELECT\s+(.+?)\s+WHERE/is);
      if (selectMatch) {
        const selectClause = selectMatch[1];
        // Handle SELECT * case
        if (selectClause.includes('*')) {
          selectVars.push('*');
        } else {
          // Extract individual variables
          const varMatches = selectClause.match(/\?[a-zA-Z0-9_]+/g);
          if (varMatches) {
            selectVars.push(...varMatches);
          }
        }
      }
    }
    
    // Count triple patterns
    const whereMatch = query.match(/WHERE\s*\{([\s\S]*)\}/i);
    let tripleCount = 0;
    if (whereMatch) {
      const whereClause = whereMatch[1];
      // Count triple patterns (this is a simplistic approximation)
      tripleCount = (whereClause.match(/\.\s*(?!\})/g) || []).length + 1;
    }
    
    // Detect features used
    const features = {
      hasUnion: upperQuery.includes('UNION'),
      hasOptional: upperQuery.includes('OPTIONAL'),
      hasFilter: upperQuery.includes('FILTER'),
      hasGroupBy: upperQuery.includes('GROUP BY'),
      hasOrderBy: upperQuery.includes('ORDER BY'),
      hasLimit: upperQuery.includes('LIMIT'),
      hasOffset: upperQuery.includes('OFFSET'),
      hasSubquery: upperQuery.includes('SELECT') && 
                 upperQuery.lastIndexOf('SELECT') !== upperQuery.indexOf('SELECT'),
      hasAggregate: /\b(COUNT|SUM|AVG|MIN|MAX)\s*\(/i.test(upperQuery),
      hasBind: upperQuery.includes('BIND('),
      hasService: upperQuery.includes('SERVICE'),
      hasValues: upperQuery.includes('VALUES'),
      hasMinus: upperQuery.includes('MINUS'),
      hasGraph: upperQuery.includes('GRAPH')
    };
    
    // Assess complexity
    const complexityScore = Object.values(features).filter(Boolean).length +
                          (tripleCount / 5) + 
                          ((query.match(/\n/g) || []).length / 10);
    
    const complexityLevel = complexityScore < 3 ? 'Simple' : 
                          complexityScore < 6 ? 'Moderate' :
                          complexityScore < 10 ? 'Complex' : 'Very Complex';
    
    // Performance considerations
    const performanceConsiderations = [];
    
    if (features.hasSubquery && !features.hasLimit) {
      performanceConsiderations.push('Query has subqueries without LIMIT which may cause performance issues');
    }
    
    if (tripleCount > 10 && !features.hasLimit) {
      performanceConsiderations.push('Query has many triple patterns and no LIMIT clause');
    }
    
    if (features.hasOptional && !features.hasLimit) {
      performanceConsiderations.push('OPTIONAL patterns without LIMIT may return large result sets');
    }
    
    if (selectVars.includes('*') && tripleCount > 5) {
      performanceConsiderations.push('Using SELECT * with many triple patterns can return more data than needed');
    }
    
    return {
      isValid: true,
      queryType,
      selectVariables: selectVars,
      triplePatternCount: tripleCount,
      features,
      complexity: {
        score: complexityScore,
        level: complexityLevel
      },
      performanceConsiderations,
      estimatedTimeout: complexityScore < 5 ? TIMEOUT_SETTINGS.DEFAULT : 
                      complexityScore < 10 ? TIMEOUT_SETTINGS.COMPLEX : 
                      TIMEOUT_SETTINGS.MAXIMUM
    };
  } catch (error) {
    console.error("Error analyzing query:", error);
    return {
      isValid: false,
      message: 'Error analyzing query: ' + error.message,
      suggestedAction: 'Check the query syntax'
    };
  }
};

/**
 * Converts SPARQL query results to CSV format
 * 
 * @param {Object} results - Query results returned by executeQuery
 * @returns {string} - CSV formatted string
 */
export const resultsToCSV = (results) => {
  if (!results || !results.success || !results.columns || !results.data) {
    return '';
  }
  
  // Header row
  let csv = results.columns.join(',') + '\n';
  
  // Data rows
  for (const row of results.data) {
    // Escape values that contain commas
    const escapedRow = row.map(value => {
      // Handle null or undefined
      if (value === null || value === undefined) {
        return '';
      }
      
      const stringValue = String(value);
      // Escape quotes and wrap in quotes if contains commas
      if (stringValue.includes(',') || stringValue.includes('"')) {
        return '"' + stringValue.replace(/"/g, '""') + '"';
      }
      return stringValue;
    });
    
    csv += escapedRow.join(',') + '\n';
  }
  
  return csv;
};