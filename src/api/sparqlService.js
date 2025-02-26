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
  
  // Common headers for both methods
  const commonHeaders = {
    'Accept': 'application/sparql-results+json',
    'User-Agent': 'SPARQL Analytics React Client/1.0'
  };

  // Try GET method first, then fallback to POST
  const methods = ['get', 'post'];
  
  for (const method of methods) {
    try {
      let response;
      
      if (method === 'get') {
        // GET method requires query to be URL encoded
        response = await axios.get(endpoint, {
          params: { query },
          headers: commonHeaders
        });
      } else {
        // POST method
        response = await axios.post(endpoint, 
          new URLSearchParams({ query }),
          {
            headers: {
              ...commonHeaders,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );
      }
      
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
          method, // Return which method worked
          executionTime
        };
      } else {
        return {
          success: true,
          columns: response.data.head?.vars || [],
          data: response.data.results?.bindings || [],
          error: null,
          method, // Return which method worked
          executionTime
        };
      }
    } catch (error) {
      // If first method fails, continue to next method
      if (method === 'post') {
        const endTime = performance.now();
        const executionTime = (endTime - startTime) / 1000;
        
        console.error("Query execution error:", error);
        
        // More detailed error handling
        if (error.response) {
          return {
            success: false,
            columns: [],
            data: [],
            error: `Server responded with ${error.response.status}: ${JSON.stringify(error.response.data)}`,
            executionTime
          };
        } else if (error.request) {
          return {
            success: false,
            columns: [],
            data: [],
            error: 'No response received from the server. Check network connection or endpoint availability.',
            executionTime
          };
        } else {
          return {
            success: false,
            columns: [],
            data: [],
            error: `Request setup error: ${error.message}`,
            executionTime
          };
        }
      }
      // Continue to next method if current method fails
      continue;
    }
  }
  
  // If all methods fail
  throw new Error('Unable to execute query with any method');
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
