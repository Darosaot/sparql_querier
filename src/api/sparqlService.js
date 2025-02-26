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
        timeout: 20000 // 20 seconds timeout
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
