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
  
  try {
    // More verbose logging and error handling
    console.log('Endpoint:', endpoint);
    console.log('Query:', query);

    // Use axios with more comprehensive configuration
    const response = await axios({
      method: 'post',
      url: endpoint,
      data: new URLSearchParams({ query }),
      headers: {
        'Accept': [
          'application/sparql-results+json', 
          'application/json', 
          'text/json'
        ],
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'SPARQL Analytics React Client/1.0',
        // Additional headers for troubleshooting
        'X-Requested-With': 'XMLHttpRequest'
      },
      // Longer timeout
      timeout: 45000, // 45 seconds
      
      // Additional axios configuration for diagnostics
      validateStatus: function (status) {
        // Treat all status codes as successful to get more info
        return status >= 200 && status < 600;
      }
    });

    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000; // Convert to seconds

    // Log full response for diagnostics
    console.log('Full Response:', response);

    // More robust response handling
    if (response.data && response.data.results && response.data.results.bindings) {
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
        executionTime,
        rawResponse: response
      };
    } else {
      // No results, but not necessarily an error
      return {
        success: true,
        columns: [],
        data: [],
        error: 'No results found',
        executionTime,
        rawResponse: response
      };
    }
  } catch (error) {
    const endTime = performance.now();
    const executionTime = (endTime - startTime) / 1000;

    // Very detailed error logging
    console.error('Complete Error Object:', error);
    
    // Comprehensive error handling
    if (error.response) {
      // The request was made and the server responded with a status code
      console.error('Response Error Details:', {
        status: error.response.status,
        headers: error.response.headers,
        data: error.response.data
      });

      return {
        success: false,
        columns: [],
        data: [],
        error: `Server Error (${error.response.status}): ${JSON.stringify(error.response.data)}`,
        executionTime,
        rawError: error.response
      };
    } else if (error.request) {
      // The request was made but no response was received
      console.error('Request Error Details:', error.request);

      return {
        success: false,
        columns: [],
        data: [],
        error: `No response received. Network issues or server unavailable. Details: ${error.message}`,
        executionTime,
        rawError: error.request
      };
    } else {
      // Something happened in setting up the request
      console.error('Setup Error Details:', error.message);

      return {
        success: false,
        columns: [],
        data: [],
        error: `Request setup error: ${error.message}`,
        executionTime,
        rawError: error
      };
    }
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
