const axios = require('axios');

exports.handler = async function(event, context) {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }
  
  try {
    const { endpoint, query } = JSON.parse(event.body);
    
    if (!endpoint || !query) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }
    
    // Forward the request to the actual SPARQL endpoint
    const response = await axios.post(endpoint, 
      new URLSearchParams({
        query: query
      }),
      {
        headers: {
          'Accept': 'application/sparql-results+json',
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'SPARQL Analytics Netlify Function/1.0'
        },
        timeout: 25000 // 25 seconds timeout
      }
    );
    
    // Return the response from the SPARQL endpoint
    return {
      statusCode: 200,
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    // Handle errors
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Error forwarding request to SPARQL endpoint', 
        details: error.message 
      })
    };
  }
};
