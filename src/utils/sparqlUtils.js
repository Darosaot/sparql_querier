// src/utils/sparqlUtils.js

/**
 * Comprehensive SPARQL query validator
 * 
 * @param {string} query - SPARQL query to validate
 * @returns {Object} - Validation result with valid flag, error message, and warnings
 */
export const validateSparqlQuery = (query) => {
  if (!query || query.trim() === '') {
    return { valid: false, error: 'Query cannot be empty' };
  }

  const warnings = [];
  const upperQuery = query.toUpperCase();
  
  // Check query type and required clauses
  if (upperQuery.includes('SELECT')) {
    if (!upperQuery.includes('WHERE')) {
      return { valid: false, error: 'SELECT query must include a WHERE clause' };
    }
  } else if (upperQuery.includes('CONSTRUCT')) {
    if (!upperQuery.includes('WHERE')) {
      return { valid: false, error: 'CONSTRUCT query must include a WHERE clause' };
    }
  } else if (upperQuery.includes('ASK')) {
    if (!upperQuery.includes('WHERE')) {
      return { valid: false, error: 'ASK query must include a WHERE clause' };
    }
  } else if (upperQuery.includes('DESCRIBE')) {
    // DESCRIBE can be used without WHERE but it's less common
    if (!upperQuery.includes('WHERE')) {
      warnings.push('DESCRIBE query without WHERE clause might return large amounts of data');
    }
  } else {
    return { valid: false, error: 'Query must start with SELECT, CONSTRUCT, ASK, or DESCRIBE' };
  }
  
  // Check for balanced braces
  const openBraces = (query.match(/\{/g) || []).length;
  const closeBraces = (query.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    return { 
      valid: false, 
      error: `Unbalanced braces: ${openBraces} opening and ${closeBraces} closing braces` 
    };
  }
  
  // Check for unclosed quotes
  const doubleQuotes = (query.match(/"/g) || []).length;
  if (doubleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unclosed double quotes in query' };
  }
  
  const singleQuotes = (query.match(/'/g) || []).length;
  if (singleQuotes % 2 !== 0) {
    return { valid: false, error: 'Unclosed single quotes in query' };
  }
  
  // Check for missing prefixes but using prefixed names
  const prefixedNameRegex = /\b[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+\b/g;
  const prefixedNames = query.match(prefixedNameRegex) || [];
  const prefixDeclarations = query.match(/PREFIX\s+([a-zA-Z0-9_-]+):/gi) || [];
  
  if (prefixedNames.length > 0 && prefixDeclarations.length === 0) {
    warnings.push('Query uses prefixed names but has no PREFIX declarations');
  }
  
  // Check for prefixed names without corresponding PREFIX declarations
  if (prefixedNames.length > 0 && prefixDeclarations.length > 0) {
    const declaredPrefixes = prefixDeclarations.map(p => 
      p.replace(/PREFIX\s+/i, '').replace(/:$/, '').trim()
    );
    
    const usedPrefixes = new Set(
      prefixedNames.map(name => name.split(':')[0])
    );
    
    for (const prefix of usedPrefixes) {
      if (!declaredPrefixes.includes(prefix)) {
        warnings.push(`Prefix "${prefix}:" is used but not declared`);
      }
    }
  }
  
  // Check for performance warnings
  if (!upperQuery.includes('LIMIT') && 
      (upperQuery.includes('SELECT') || upperQuery.includes('CONSTRUCT'))) {
    warnings.push('Query does not have a LIMIT clause, which might return large result sets');
  }
  
  // Check for incorrect FILTER placement
  if (upperQuery.includes('FILTER') && 
      query.match(/FILTER\s*\(\s*\)\s*\./gi)) {
    return { valid: false, error: 'Incorrect FILTER syntax: empty filter condition' };
  }
  
  // Check for too many OPTIONAL patterns (performance concern)
  const optionalCount = (upperQuery.match(/OPTIONAL/g) || []).length;
  if (optionalCount > 3) {
    warnings.push(`Query uses ${optionalCount} OPTIONAL patterns which might impact performance`);
  }
  
  // Check for missing dot separators between triple patterns
  const whereMatch = query.match(/WHERE\s*\{([^}]*)\}/i);
  if (whereMatch) {
    const whereClause = whereMatch[1];
    const triples = whereClause.split(/\s*\.\s*/).filter(t => t.trim() && !t.trim().startsWith('#'));
    
    if (triples.length > 1) {
      // Check if the triples are separated by dots
      const dotCount = (whereClause.match(/\s\.\s/g) || []).length;
      if (dotCount < triples.length - 1) {
        warnings.push('WHERE clause may be missing dot separators between triple patterns');
      }
    }
  }
  
  return { valid: true, warnings };
};

/**
 * Format a SPARQL query with consistent indentation
 * 
 * @param {string} query - SPARQL query to format
 * @returns {string} - Formatted query
 */
export const formatSparqlQuery = (query) => {
  if (!query) return '';
  
  // Split the query into lines
  const lines = query.split('\n');
  let formattedLines = [];
  let indentLevel = 0;
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].trim();
    
    // Skip empty lines
    if (!line) {
      formattedLines.push('');
      continue;
    }
    
    // Handle comments
    if (line.startsWith('#')) {
      formattedLines.push('  '.repeat(indentLevel) + line);
      continue;
    }
    
    // Adjust indent for lines with closing braces
    if (line.includes('}')) {
      const closeBraceIndex = line.indexOf('}');
      const beforeBrace = line.substring(0, closeBraceIndex).trim();
      
      if (beforeBrace) {
        // If there's content before the brace, keep it at current indent
        formattedLines.push('  '.repeat(indentLevel) + beforeBrace);
        indentLevel = Math.max(0, indentLevel - 1);
        const afterBrace = line.substring(closeBraceIndex).trim();
        formattedLines.push('  '.repeat(indentLevel) + afterBrace);
      } else {
        // Just a brace, decrease indent
        indentLevel = Math.max(0, indentLevel - 1);
        formattedLines.push('  '.repeat(indentLevel) + line);
      }
      continue;
    }
    
    // Detect and format main SPARQL keywords
    const keywords = [
      'PREFIX', 'SELECT', 'DISTINCT', 'CONSTRUCT', 'ASK', 'DESCRIBE', 
      'FROM', 'WHERE', 'FILTER', 'OPTIONAL', 'UNION', 'MINUS', 'GRAPH', 
      'SERVICE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET'
    ];
    
    let isKeywordLine = false;
    for (const keyword of keywords) {
      if (line.toUpperCase().startsWith(keyword)) {
        if (keyword === 'PREFIX') {
          // PREFIX declarations get no indent
          formattedLines.push(line);
        } else if (keyword === 'WHERE') {
          // WHERE goes at the current indent level, but the brace increases indent
          formattedLines.push('  '.repeat(indentLevel) + line);
          if (line.includes('{')) {
            indentLevel++;
          }
        } else {
          formattedLines.push('  '.repeat(indentLevel) + line);
        }
        isKeywordLine = true;
        break;
      }
    }
    
    if (!isKeywordLine) {
      // Handle opening braces that increase indent
      if (line.includes('{') && !line.includes('}')) {
        formattedLines.push('  '.repeat(indentLevel) + line);
        indentLevel++;
      } else {
        // Regular line
        formattedLines.push('  '.repeat(indentLevel) + line);
      }
    }
  }
  
  return formattedLines.join('\n');
};

/**
 * Extract all prefixes from a SPARQL query
 * 
 * @param {string} query - SPARQL query
 * @returns {Object} - Map of prefix to URI
 */
export const extractPrefixes = (query) => {
  const prefixes = {};
  const prefixRegex = /PREFIX\s+([a-zA-Z0-9_-]+):\s*<([^>]+)>/gi;
  let match;
  
  while ((match = prefixRegex.exec(query)) !== null) {
    prefixes[match[1]] = match[2];
  }
  
  return prefixes;
};

/**
 * Extract all variables from a SPARQL query
 * 
 * @param {string} query - SPARQL query
 * @returns {Array} - List of variables (with ? prefix)
 */
export const extractVariables = (query) => {
  const variables = new Set();
  const variableRegex = /\?([a-zA-Z0-9_]+)/g;
  let match;
  
  while ((match = variableRegex.exec(query)) !== null) {
    variables.add(`?${match[1]}`);
  }
  
  return Array.from(variables);
};

/**
 * Suggest relevant prefixes based on URIs used in the query
 * 
 * @param {string} query - SPARQL query
 * @returns {Array} - List of suggested prefixes
 */
export const suggestPrefixes = (query) => {
  const suggestions = [];
  const uriRegex = /<(http[^>]+)>/g;
  let match;
  
  // Extract all URIs used in the query
  const uris = new Set();
  while ((match = uriRegex.exec(query)) !== null) {
    uris.add(match[1]);
  }
  
  // Common namespace to prefix mappings
  const commonNamespaces = {
    'http://www.w3.org/1999/02/22-rdf-syntax-ns#': 'rdf',
    'http://www.w3.org/2000/01/rdf-schema#': 'rdfs',
    'http://www.w3.org/2002/07/owl#': 'owl',
    'http://www.w3.org/2001/XMLSchema#': 'xsd',
    'http://xmlns.com/foaf/0.1/': 'foaf',
    'http://purl.org/dc/elements/1.1/': 'dc',
    'http://purl.org/dc/terms/': 'dct',
    'http://www.w3.org/2004/02/skos/core#': 'skos',
    'http://data.europa.eu/a4g/ontology#': 'epo',
    'http://www.w3.org/ns/locn#': 'locn',
    'http://dbpedia.org/ontology/': 'dbo',
    'http://dbpedia.org/property/': 'dbp',
    'http://dbpedia.org/resource/': 'dbr',
    'http://www.wikidata.org/entity/': 'wd',
    'http://www.wikidata.org/prop/direct/': 'wdt'
  };
  
  // Check each URI for known namespace patterns
  for (const uri of uris) {
    for (const [namespace, prefix] of Object.entries(commonNamespaces)) {
      if (uri.startsWith(namespace)) {
        // Don't suggest if the prefix is already in the query
        if (!query.match(new RegExp(`PREFIX\\s+${prefix}:`, 'i'))) {
          suggestions.push({
            prefix,
            uri: namespace,
            declaration: `PREFIX ${prefix}: <${namespace}>`
          });
        }
        break;
      }
    }
  }
  
  return suggestions;
};

/**
 * Check if a query might cause performance issues
 * 
 * @param {string} query - SPARQL query
 * @returns {Array} - List of performance warnings
 */
export const checkPerformance = (query) => {
  const warnings = [];
  const upperQuery = query.toUpperCase();
  
  // Check for missing LIMIT clause in SELECT or CONSTRUCT queries
  if ((upperQuery.includes('SELECT') || upperQuery.includes('CONSTRUCT')) && 
      !upperQuery.includes('LIMIT')) {
    warnings.push('Missing LIMIT clause may return too many results');
  }
  
  // Check for many OPTIONAL clauses
  const optionalCount = (upperQuery.match(/OPTIONAL/g) || []).length;
  if (optionalCount > 3) {
    warnings.push(`Query uses ${optionalCount} OPTIONAL patterns which might impact performance`);
  }
  
  // Check for potential cartesian products
  if (upperQuery.includes('WHERE') && 
      !upperQuery.includes('JOIN')) {
    // Basic heuristic: If we have multiple triple patterns but few shared variables, might be cartesian
    const whereMatch = query.match(/WHERE\s*\{([^}]*)\}/i);
    if (whereMatch) {
      const whereClause = whereMatch[1];
      const triples = whereClause.split(/\s*\.\s*/)
        .filter(t => t.trim() && !t.trim().startsWith('#') && !t.includes('FILTER'));
      
      if (triples.length > 2) {
        const allVars = [];
        
        // Extract variables from each triple
        triples.forEach(triple => {
          const tripleVars = (triple.match(/\?[a-zA-Z0-9_]+/g) || []);
          allVars.push(...tripleVars);
        });
        
        // Count occurrences of each variable
        const varCounts = {};
        allVars.forEach(v => {
          varCounts[v] = (varCounts[v] || 0) + 1;
        });
        
        // If any triples are disconnected (no shared variables), might cause cartesian
        const unsharedVars = Object.keys(varCounts).filter(v => varCounts[v] === 1);
        if (unsharedVars.length > triples.length / 2) {
          warnings.push('Query has potentially disconnected triple patterns which might cause a cartesian product');
        }
      }
    }
  }
  
  // Check for projection of all variables (SELECT *)
  if (upperQuery.includes('SELECT *')) {
    warnings.push('SELECT * might return more variables than needed, consider selecting specific variables');
  }
  
  return warnings;
};

/**
 * Add a missing structure to an incomplete SPARQL query
 * 
 * @param {string} query - SPARQL query to complete
 * @returns {string} - Completed query
 */
export const addMissingStructure = (query) => {
  if (!query || query.trim() === '') {
    // Return a basic query template
    return `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?subject ?predicate ?object
WHERE {
  ?subject ?predicate ?object .
  
  # Add your conditions here
  
} LIMIT 100`;
  }
  
  let modifiedQuery = query;
  
  // Check if we have a PREFIX declaration
  if (!modifiedQuery.match(/PREFIX\s+[a-zA-Z0-9_-]+:/i)) {
    modifiedQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

${modifiedQuery}`;
  }
  
  // Check if we have a query type (SELECT, ASK, etc.)
  if (!modifiedQuery.match(/\b(SELECT|ASK|DESCRIBE|CONSTRUCT)\b/i)) {
    modifiedQuery = `${modifiedQuery.trim()}

SELECT ?subject ?predicate ?object`;
  }
  
  // Check if we have a WHERE clause
  if (!modifiedQuery.match(/\bWHERE\s*\{/i)) {
    modifiedQuery = `${modifiedQuery.trim()}

WHERE {
  ?subject ?predicate ?object .
  
  # Add your conditions here
  
}`;
  }
  
  // Ensure we have a LIMIT for safety
  if (modifiedQuery.match(/\b(SELECT|CONSTRUCT)\b/i) && 
      !modifiedQuery.match(/\bLIMIT\s+\d+/i)) {
    modifiedQuery = `${modifiedQuery.trim()}
LIMIT 100`;
  }
  
  return modifiedQuery;
}
