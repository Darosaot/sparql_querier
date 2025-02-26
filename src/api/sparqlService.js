import axios from 'axios';

/**
 * Executes a SPARQL query against a specified endpoint
 * 
 * @param {string} endpoint - The SPARQL endpoint URL
 * @param {string} query - The SPARQL query
 * @returns {Promise} - Promise resolving to the query results
 */
export const executeQuery = async (endpoint, query) => {
  const startTime = performance.now();
  
  // Use a CORS proxy
  const corsProxy = 'https://cors-anywhere.herokuapp.com/';
  const proxiedEndpoint = corsProxy + endpoint;
  
  try {
    // Prepare request parameters
    const params = new URLSearchParams();
    params.append('query', query);
    
    // Execute query with Accept header for JSON results
    const response = await axios.get(proxiedEndpoint, {
      params,
      headers: {
        'Accept': 'application/sparql-results+json',
        'X-Requested-With': 'XMLHttpRequest' // Required by some CORS proxies
      }
    });
    
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000; // Convert to seconds
    
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
        columns: [],
        data: [],
        error: null,
        executionTime
      };
    }
  } catch (error) {
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;
    
    console.error("Query execution failed:", error);
    return {
      success: false,
      columns: [],
      data: [],
      error: error.message || 'Query execution failed',
      executionTime
    };
  }
};

/**
 * Validates if a SPARQL query contains required keywords
 * 
 * @param {string} query - The SPARQL query to validate
 * @returns {boolean} - True if the query is valid
 */
export const isValidSparql = (query) => {
  const requiredKeywords = ['SELECT', 'WHERE', '{', '}'];
  return requiredKeywords.every(keyword => query.includes(keyword));
};
