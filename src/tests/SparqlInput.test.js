// src/tests/SparqlInput.test.js
import { assert } from '../utils/testUtils';
import { formatSparqlQuery } from '../components/SparqlInput';

// Function to validate basic SPARQL syntax
const validateSparqlQuery = (query) => {
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

  // Check for performance warnings
  if (!upperQuery.includes('LIMIT')) {
    warnings.push('Query does not have a LIMIT clause, which might return large result sets');
  }

  return { valid: true, warnings };
};

// Function to format SPARQL query (basic formatting)
const formatSparqlQuery = (query) => {
    if (!query) return '';
    
    let formatted = query;
    
    // Ensure consistent spacing for keywords
    const keywords = [
      'PREFIX', 'SELECT', 'DISTINCT', 'CONSTRUCT', 'ASK', 'DESCRIBE', 
      'FROM', 'WHERE', 'FILTER', 'OPTIONAL', 'UNION', 'MINUS', 'GRAPH', 
      'SERVICE', 'GROUP BY', 'HAVING', 'ORDER BY', 'LIMIT', 'OFFSET'
    ];
    
    // Ensure line breaks before major keywords
    keywords.forEach(keyword => {
      const regex = new RegExp(`(?<!(PREFIX|[a-z0-9_]))${keyword}\\b`, 'gi');
      formatted = formatted.replace(regex, `\n${keyword}`);
    });
    
    // Handle indentation
    const lines = formatted.split('\n');
    let indentLevel = 0;
    const formattedLines = [];
    
    lines.forEach(line => {
      let trimmedLine = line.trim();
      if (!trimmedLine) {
        formattedLines.push('');
        return;
      }
      
      // Decrease indent for closing brace
      if (trimmedLine.includes('}')) {
        indentLevel = Math.max(0, indentLevel - 1);
      }
      
      // Add appropriate indentation
      formattedLines.push('  '.repeat(indentLevel) + trimmedLine);
      
      // Increase indent for opening brace
      if (trimmedLine.includes('{')) {
        indentLevel++;
      }
    });
    
    return formattedLines.join('\n');
  };



// List of common SPARQL prefixes with tooltips
const commonPrefixes = [
    { prefix: 'rdf', uri: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', description: 'RDF basic vocabulary' },
    { prefix: 'rdfs', uri: 'http://www.w3.org/2000/01/rdf-schema#', description: 'RDF Schema vocabulary' },
    { prefix: 'owl', uri: 'http://www.w3.org/2002/07/owl#', description: 'Web Ontology Language' },
    { prefix: 'xsd', uri: 'http://www.w3.org/2001/XMLSchema#', description: 'XML Schema Datatypes' },
    { prefix: 'foaf', uri: 'http://xmlns.com/foaf/0.1/', description: 'Friend of a Friend vocabulary' },
    { prefix: 'dc', uri: 'http://purl.org/dc/elements/1.1/', description: 'Dublin Core elements' },
    { prefix: 'dct', uri: 'http://purl.org/dc/terms/', description: 'Dublin Core terms' },
    { prefix: 'skos', uri: 'http://www.w3.org/2004/02/skos/core#', description: 'Simple Knowledge Organization System' },
    { prefix: 'epo', uri: 'http://data.europa.eu/a4g/ontology#', description: 'EU Procurement Ontology' }
  ];
  
  // Common endpoint suggestions
  const endpointSuggestions = [
    { url: 'https://dbpedia.org/sparql', description: 'DBpedia - General knowledge from Wikipedia' },
    { url: 'https://query.wikidata.org/sparql', description: 'Wikidata - Structured data from Wikimedia projects' },
    { url: 'https://data.europa.eu/a4g/sparql', description: 'EU TED Data - Public procurement notices' },
    { url: 'http://linkedgeodata.org/sparql', description: 'LinkedGeoData - Spatial data from OpenStreetMap' }
  ];

// List of query templates
const queryTemplates = {
    'All triples': 'SELECT ?s ?p ?o WHERE { ?s ?p ?o }',
    'All classes': 'SELECT DISTINCT ?class WHERE { ?s rdf:type ?class }',
  };

// Test runner function
const testSparqlInput = () => {
  console.log('Starting SparqlInput tests...');

  // 1. SPARQL Query Validation
  console.log('Running SPARQL Query Validation tests...');

  // Valid Queries
  let validationResult = validateSparqlQuery('SELECT * WHERE { ?s ?p ?o }');
  assert(validationResult.valid === true, 'SELECT query should be valid');

  validationResult = validateSparqlQuery('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }');
  assert(validationResult.valid === true, 'CONSTRUCT query should be valid');

  validationResult = validateSparqlQuery('ASK WHERE { ?s ?p ?o }');
  assert(validationResult.valid === true, 'ASK query should be valid');

  validationResult = validateSparqlQuery('DESCRIBE <http://example.com>');
  assert(validationResult.valid === true, 'DESCRIBE query should be valid');

  // Invalid Queries
  validationResult = validateSparqlQuery('SELECT * { ?s ?p ?o }');
  assert(validationResult.valid === false, 'SELECT query missing WHERE should be invalid');

  validationResult = validateSparqlQuery('CONSTRUCT { ?s ?p ?o } { ?s ?p ?o }');
  assert(validationResult.valid === false, 'CONSTRUCT query missing WHERE should be invalid');

  validationResult = validateSparqlQuery('ASK { ?s ?p ?o }');
  assert(validationResult.valid === false, 'ASK query missing WHERE should be invalid');

  validationResult = validateSparqlQuery('SELECT { ?s ?p ?o WHERE { ?s ?p ?o }');
  assert(validationResult.valid === false, 'Unbalanced braces should be invalid');

  validationResult = validateSparqlQuery('SELECT * WHERE { ?s ?p "o }');
  assert(validationResult.valid === false, 'Unclosed double quotes should be invalid');

  validationResult = validateSparqlQuery("SELECT * WHERE { ?s ?p 'o }");
  assert(validationResult.valid === false, 'Unclosed single quotes should be invalid');

  validationResult = validateSparqlQuery('BLA BLA');
  assert(validationResult.valid === false, 'Invalid query should be invalid');

  validationResult = validateSparqlQuery('');
  assert(validationResult.valid === false, 'Empty query should be invalid');

  // Warnings
  validationResult = validateSparqlQuery('SELECT * WHERE { ?s ?p ?o }');
  assert(validationResult.warnings.length > 0, 'Query with no limit should have a warning');

  console.log('SPARQL Query Validation tests completed.');

  // 2. SPARQL Query Formatting
  console.log('Running SPARQL Query Formatting tests...');

  // Basic Formatting
  let formattedQuery = formatSparqlQuery('SELECT*WHERE{?s?p?o}');
  assert(formattedQuery === 'SELECT\n  *\nWHERE\n  {\n    ?s\n    ?p\n    ?o\n  }', 'Basic formatting failed');

  // Keyword Handling
  formattedQuery = formatSparqlQuery('PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>SELECT * WHERE { ?s ?p ?o }');
  assert(formattedQuery.includes('PREFIX'), 'Keyword PREFIX handling failed');
  assert(formattedQuery.includes('SELECT'), 'Keyword SELECT handling failed');
  assert(formattedQuery.includes('WHERE'), 'Keyword WHERE handling failed');

  // Brace Handling
  formattedQuery = formatSparqlQuery('SELECT * WHERE { { ?s ?p ?o }}');
  assert(formattedQuery.includes('{'), 'Brace handling failed');
  assert(formattedQuery.includes('}'), 'Brace handling failed');

  console.log('SPARQL Query Formatting tests completed.');
  // 3. Prefix Handling
  console.log('Running Prefix Handling tests...');

  // Adding Prefixes
const addPrefix = (prefix, uri, query) => {
  if (!query.includes(`PREFIX ${prefix}:`)) {
    const prefixDeclaration = `PREFIX ${prefix}: <${uri}>\n`;
    
    // Add at the beginning or after other prefixes
    const lines = query.split('\n');
    let lastPrefixIndex = -1;
    
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].trim().toUpperCase().startsWith('PREFIX')) {
        lastPrefixIndex = i;
      }
    }
    
    if (lastPrefixIndex >= 0) {
      // Insert after the last prefix
      lines.splice(lastPrefixIndex + 1, 0, prefixDeclaration);
    } else {
      // Insert at the beginning
      lines.unshift(prefixDeclaration);
    }
    
    const updatedQuery = lines.join('\n');
    return updatedQuery;
  }
  return query;
};

let newQuery = addPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'SELECT * WHERE { ?s ?p ?o }');
assert(newQuery.startsWith('PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'), 'Adding prefix rdf failed');

newQuery = addPrefix('rdfs', 'http://www.w3.org/2000/01/rdf-schema#', newQuery);
assert(newQuery.includes('PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>'), 'Adding prefix rdfs failed');

// Duplicate Prefixes
const queryWithDuplicatePrefix = addPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', newQuery);
assert(queryWithDuplicatePrefix === newQuery, 'Adding duplicate prefix failed');

console.log('Prefix Handling tests completed.');

//4. Template Handling
console.log('Running Template Handling tests...');

//Template selection
let templateQuery = queryTemplates['All triples'];
assert(templateQuery === 'SELECT ?s ?p ?o WHERE { ?s ?p ?o }', "Selecting 'All triples' template failed");

  templateQuery = queryTemplates['All classes'];
  assert(templateQuery === 'SELECT DISTINCT ?class WHERE { ?s rdf:type ?class }', "Selecting 'All classes' template failed");

  //Empty query
  const addBasicStructure = (query) => {
      if (!query.trim()) {
          const basicQuery = `PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\n\nSELECT ?subject ?predicate ?object\nWHERE {\n  ?subject ?predicate ?object .\n  \n  # Add your conditions here\n  \n} LIMIT 100`;
          return basicQuery;
      }
      return query;
  }

  let basicQuery = addBasicStructure("");
  assert(basicQuery.includes("SELECT ?subject ?predicate ?object"), "Adding basic structure to an empty query failed.");

  //No limit
  const addLimit = (query) => {
      if (!query.toUpperCase().includes('LIMIT')) {
        let updatedQuery = query.trim();
        updatedQuery += '\nLIMIT 100';
        return updatedQuery;
      }
      return query;
    };

  let limitQuery = addLimit("SELECT * WHERE {?s ?p ?o}");
  assert(limitQuery.toUpperCase().includes('LIMIT 100'), "Adding limit failed");

  console.log('Template Handling tests completed.');
  console.log('SparqlInput tests finished.');
};

testSparqlInput();