import axios from 'axios';

/**
 * Executes a SPARQL query against a specified endpoint using POST method
 * 
 * @param {string} endpoint - The SPARQL endpoint URL
 * @param {string} query - The SPARQL query
 * @returns {Promise} - Promise resolving to the query results
 */
export const executeQuery = async (endpoint, query) => {
  const startTime = performance.now();
  
  try {
    // Execute query with POST method
    const response = await axios.post(endpoint, 
      new URLSearchParams({
        query: query
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SPARQL Analytics React Client/1.0'
        }
      }
    );
    
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
    
    console.error("Query execution failed:", error.response ? error.response.data : error.message);
    
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
        error: 'No response received from the server',
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
