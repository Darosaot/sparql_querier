// src/api/sparqlService.js - Updated with enhanced validation

import axios from 'axios';

/**
 * Executes a SPARQL query against a specified endpoint
 * First tries direct communication, then falls back to Netlify Function proxy if needed
 * 
 * @param {string} endpoint - The SPARQL endpoint URL
 * @param {string} query - The SPARQL query
 * @returns {Promise} - Promise resolving to the query results
 */
export const executeQuery = async (endpoint, query) => {
  const startTime = performance.now();
  
  try {
    // First try direct request to the endpoint (some SPARQL endpoints support CORS)
    console.log('Trying direct request to the SPARQL endpoint');
    
    const response = await axios.post(endpoint, 
      new URLSearchParams({
        query: query
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 2000000 // 2000 seconds timeout
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
      
      return {
        success: true,
        columns,
        data,
        error: null,
        executionTime
      };
    } else {
      return {
        success: true,
        columns: response.data.head?.vars || [],
        data: response.data.results?.bindings || [],
        error: null,
        executionTime
      };
    }
  } catch (error) {
    // If direct request fails, try using the Netlify proxy
    try {
      console.log('Direct request failed, trying Netlify proxy');
      
      // Try using a relative URL to the Netlify function
      const proxyUrl = '/.netlify/functions/sparql-proxy';
      
      const proxyResponse = await axios.post(proxyUrl, {
        endpoint: endpoint,
        query: query
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
          executionTime
        };
      } else {
        return {
          success: true,
          columns: proxyResponse.data.head?.vars || [],
          data: proxyResponse.data.results?.bindings || [],
          error: null,
          executionTime
        };
      }
    } catch (proxyError) {
      const endTime = performance.now();
      const executionTime = (endTime - startTime) / 1000;
      
      return {
        success: false,
        columns: [],
        data: [],
        error: `Failed to query the SPARQL endpoint: ${error.message}. Proxy attempt also failed: ${proxyError.message}`,
        executionTime
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
  if (!query || query.trim() === '') {
    return false;
  }
  
  const upperQuery = query.toUpperCase();
  
  // Check for query type
  const hasQueryType = /\b(SELECT|ASK|CONSTRUCT|DESCRIBE)\b/i.test(query);
  if (!hasQueryType) {
    return false;
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
  
  // Check for basic triplet structure in WHERE clause
  if (upperQuery.includes('WHERE')) {
    const whereMatch = query.match(/WHERE\s*\{([^}]*)\}/i);
    if (whereMatch) {
      const whereClause = whereMatch[1].trim();
      if (whereClause === '') {
        return false; // Empty WHERE clause
      }
    }
  }
  
  return true;
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
        timeout: 5000
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
        timeout: 5000
      }
    );
    
    return {
      success: true,
      capabilities: {
        supportsAsk: true,
        supportsAggregates: aggregateTest.status === 200,
        supportsFederatedQueries: false // Would need more testing
      }
    };
  } catch (error) {
    return {
      success: false,
      capabilities: {
        supportsAsk: false,
        supportsAggregates: false,
        supportsFederatedQueries: false
      },
      error: error.message
    };
  }
};
