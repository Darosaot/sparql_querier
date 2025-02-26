import axios from 'axios';

/**
 * Executes a SPARQL query against a specified endpoint using a CORS proxy
 * 
 * @param {string} endpoint - The SPARQL endpoint URL
 * @param {string} query - The SPARQL query
 * @returns {Promise} - Promise resolving to the query results
 */
export const executeQuery = async (endpoint, query) => {
  const startTime = performance.now();
  
  // List of CORS proxies to try
  const corsPxoies = [
    'https://cors-anywhere.herokuapp.com/',
    'https://api.allorigins.win/raw?url=',
    'https://crossorigin.me/',
    'https://cors-proxy.htmldriven.com/?url='
  ];

  // Try each CORS proxy
  for (const proxyUrl of corsPxoies) {
    try {
      // Construct the proxied URL
      const proxiedEndpoint = proxyUrl + encodeURIComponent(endpoint);
      
      console.log(`Trying CORS proxy: ${proxyUrl}`);
      
      const response = await axios.post(proxiedEndpoint, 
        new URLSearchParams({
          query: query
        }),
        {
          headers: {
            'Accept': 'application/sparql-results+json',
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'SPARQL Analytics React Client/1.0',
            // Some proxies require this header
            'X-Requested-With': 'XMLHttpRequest'
          },
          timeout: 30000 // 30 seconds timeout
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
          proxy: proxyUrl,
          executionTime
        };
      } else {
        return {
          success: true,
          columns: response.data.head?.vars || [],
          data: response.data.results?.bindings || [],
          error: null,
          proxy: proxyUrl,
          executionTime
        };
      }
    } catch (error) {
      console.error(`CORS proxy ${proxyUrl} failed:`, error.message);
      
      // If this is the last proxy, return an error
      if (proxyUrl === corsPxoies[corsPxoies.length - 1]) {
        const endTime = performance.now();
        const executionTime = (endTime - startTime) / 1000;
        
        return {
          success: false,
          columns: [],
          data: [],
          error: `All CORS proxies failed. Last error: ${error.message}`,
          executionTime
        };
      }
      
      // Continue to next proxy
      continue;
    }
  }
  
  // Fallback error (shouldn't normally be reached)
  throw new Error('Unable to execute query with any CORS proxy');
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
