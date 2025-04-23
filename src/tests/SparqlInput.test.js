import { assert } from '../utils/testUtils';
import { validateSparqlQuery, formatSparqlQuery, addPrefix, addBasicStructure } from '../components/SparqlInput';
import queryTemplates from '../data/queryTemplates'
  

// Test runner function
export function testSparqlInput() {

  console.log('Starting SparqlInput tests...');

  // 1. SPARQL Query Validation
  console.log('Running SPARQL Query Validation tests...');
  // Valid Queries
  let validationResult = validateSparqlQuery('SELECT * WHERE { ?s ?p ?o }',);
  assert(validationResult.valid === true, 'SELECT query should be valid');

  validationResult = validateSparqlQuery('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }',);
  assert(validationResult.valid === true, 'CONSTRUCT query should be valid');

  validationResult = validateSparqlQuery('ASK WHERE { ?s ?p ?o }',);
  assert(validationResult.valid === true, 'ASK query should be valid');

  validationResult = validateSparqlQuery('DESCRIBE <http://example.com>',);
  assert(validationResult.valid === true, 'DESCRIBE query should be valid');

  // Invalid Queries
  validationResult = validateSparqlQuery('SELECT * { ?s ?p ?o }',);
  assert(validationResult.valid === false, 'SELECT query missing WHERE should be invalid');

  validationResult = validateSparqlQuery('CONSTRUCT { ?s ?p ?o } { ?s ?p ?o }',);
  assert(validationResult.valid === false, 'CONSTRUCT query missing WHERE should be invalid');

  validationResult = validateSparqlQuery('ASK { ?s ?p ?o }',);
  assert(validationResult.valid === false, 'ASK query missing WHERE should be invalid');

  validationResult = validateSparqlQuery('SELECT { ?s ?p ?o WHERE { ?s ?p ?o }',);
  assert(validationResult.valid === false, 'Unbalanced braces should be invalid');

  validationResult = validateSparqlQuery('SELECT * WHERE { ?s ?p "o }',);
  assert(validationResult.valid === false, 'Unclosed double quotes should be invalid');

  validationResult = validateSparqlQuery("SELECT * WHERE { ?s ?p 'o }",);
  assert(validationResult.valid === false, 'Unclosed single quotes should be invalid');

  validationResult = validateSparqlQuery('BLA BLA',);
  assert(validationResult.valid === false, 'Invalid query should be invalid');

  validationResult = validateSparqlQuery('',);
  assert(validationResult.valid === false, 'Empty query should be invalid');

  // Warnings
  validationResult = validateSparqlQuery('SELECT * WHERE { ?s ?p ?o }',);
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
  
let newQuery = addPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', 'SELECT * WHERE { ?s ?p ?o }');
assert(newQuery.startsWith('PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>'), 'Adding prefix rdf failed');

newQuery = addPrefix('rdfs', 'http://www.w3.org/2000/01/rdf-schema#', newQuery);
assert(newQuery.includes('PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>'), 'Adding prefix rdfs failed');

let queryWithDuplicatePrefix = addPrefix('rdf', 'http://www.w3.org/1999/02/22-rdf-syntax-ns#', newQuery,);
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
    let basicQuery = addBasicStructure("");
    assert(basicQuery.includes("SELECT ?subject ?predicate ?object"), "Adding basic structure to an empty query failed.");

    console.log('Template Handling tests completed.');
    console.log('SparqlInput tests finished.');
};
testSparqlInput();