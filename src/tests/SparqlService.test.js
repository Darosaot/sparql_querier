import {
  isValidSparql,
  isComplexQuery,
  optimizeQuery,
  analyzeQuery,
  resultsToCSV,
} from '../api/sparqlService';
import { assert } from '../utils/testUtils';

const testSparqlService = async function () {
  console.log('Starting SPARQL Service tests...');

  // 1. isValidSparql tests
  console.log('  Starting isValidSparql tests...');

  // 1.1 Valid SELECT query
  assert(
    isValidSparql('SELECT * WHERE { ?s ?p ?o }'),
    'Valid SELECT query should be valid'
  );

  // 1.2 Valid ASK query  
  assert(
    isValidSparql('ASK { ?s ?p ?o }'),
    'Valid ASK query should be valid'
  );

  // 1.3 Invalid query (missing WHERE)
  assert(
    !isValidSparql('SELECT * { ?s ?p ?o }'),
    'Invalid query (missing WHERE) should be invalid'
  );

  // 1.4 Invalid query (unbalanced braces)
  assert(
    !isValidSparql('SELECT * WHERE { ?s ?p ?o '),
    'Invalid query (unbalanced braces) should be invalid'
  );

  // 1.5 Invalid query (missing query type)
  assert(
    !isValidSparql('{ ?s ?p ?o }'),
    'Invalid query (missing query type) should be invalid'
  );
  // 1.6 Valid complex query
  assert(
    isValidSparql(
      'SELECT ?item WHERE { ?item wdt:P31 wd:Q5 . { SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } } }'
    ),
    'Valid complex query should be valid'
  );

  // 1.7 Invalid query (unbalanced quotes)
  assert(
    !isValidSparql('SELECT ?s WHERE { ?s rdfs:label "test }'),
    'Invalid query (unbalanced quotes) should be invalid'
  );
  console.log('  Ending isValidSparql tests.');

  // 2. isComplexQuery tests
  console.log('  Starting isComplexQuery tests...');

  // 2.1 Simple query
  assert(
    !isComplexQuery('SELECT * WHERE { ?s ?p ?o }'),
    'Simple query should not be complex'
  );

  // 2.2 Subquery
  assert(
    isComplexQuery('SELECT * WHERE { { SELECT ?s WHERE { ?s ?p ?o } } }'),
    'Query with subquery should be complex'
  );

  // 2.3 Multiple optionals
  assert(
    isComplexQuery(
      'SELECT * WHERE { OPTIONAL { ?s ?p ?o } OPTIONAL { ?s ?p ?o } OPTIONAL { ?s ?p ?o } }'
    ),
    'Query with multiple optionals should be complex'
  );

  // 2.4 Union query
  assert(
    isComplexQuery('SELECT * WHERE { { ?s ?p ?o } UNION { ?s ?p ?o } }'),
    'Query with union should be complex'
  );

  // 2.5 Group by query
  assert(
    isComplexQuery('SELECT ?s COUNT(?o) WHERE { ?s ?p ?o } GROUP BY ?s'),
    'Query with group by should be complex'
  );
  console.log('  Ending isComplexQuery tests.');

  // 3. optimizeQuery tests
  console.log('  Starting optimizeQuery tests...');

  // 3.1 Simple query (add LIMIT)
  assert(
    optimizeQuery('SELECT * WHERE { ?s ?p ?o }').endsWith('LIMIT 1000'),
    'Simple query should have LIMIT added'
  );

  // 3.2 Query with ORDER BY (add LIMIT after ORDER BY)
  assert(
    optimizeQuery('SELECT * WHERE { ?s ?p ?o } ORDER BY ?s').includes(
      'ORDER BY ?s LIMIT 1000'
    ),
    'Query with ORDER BY should have LIMIT added after ORDER BY'
  );

  // 3.3 Query with existing LIMIT (no change)
  assert(
    optimizeQuery('SELECT * WHERE { ?s ?p ?o } LIMIT 10') ===
      'SELECT * WHERE { ?s ?p ?o } LIMIT 10',
    'Query with existing LIMIT should not be modified'
  );

  // 3.4 Aggregations
  assert(
    optimizeQuery('SELECT (COUNT(?o) AS ?count) WHERE { ?s ?p ?o } GROUP BY ?s') ===
      'SELECT (COUNT(?o) AS ?count) WHERE { ?s ?p ?o } GROUP BY ?s',
    'Aggregation query should not be modified'
  );
  console.log('  Ending optimizeQuery tests.');

  // 4. analyzeQuery tests
  console.log('  Starting analyzeQuery tests...');

  // 4.1 Simple SELECT query
  const simpleQueryAnalysis = analyzeQuery('SELECT ?s WHERE { ?s ?p ?o }');
  assert(
    simpleQueryAnalysis.isValid &&
      simpleQueryAnalysis.queryType === 'SELECT' &&
      simpleQueryAnalysis.selectVariables.includes('?s') &&
      simpleQueryAnalysis.triplePatternCount === 1,
    'Simple SELECT query should be analyzed correctly'
  );

  // 4.2 Complex query with subquery
  const complexQueryAnalysis = analyzeQuery(
    'SELECT ?s WHERE { ?s ?p ?o . { SELECT ?o WHERE { ?s ?p ?o } } }'
  );
  assert(
    complexQueryAnalysis.isValid &&
      complexQueryAnalysis.features.hasSubquery,
    'Complex query with subquery should be analyzed correctly'
  );

  // 4.3 ASK query
  const askQueryAnalysis = analyzeQuery('ASK { ?s ?p ?o }');
  assert(
    askQueryAnalysis.isValid && askQueryAnalysis.queryType === 'ASK',
    'ASK query should be analyzed correctly'
  );

  //4.4 DESCRIBE query
  const describeQueryAnalysis = analyzeQuery('DESCRIBE ?s WHERE { ?s ?p ?o }');
  assert(
    describeQueryAnalysis.isValid && describeQueryAnalysis.queryType === 'DESCRIBE',
    'DESCRIBE query should be analyzed correctly'
  );

  //4.5 CONSTRUCT query
  const constructQueryAnalysis = analyzeQuery('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }');
  assert(
    constructQueryAnalysis.isValid && constructQueryAnalysis.queryType === 'CONSTRUCT',
    'CONSTRUCT query should be analyzed correctly'
  );
  console.log('  Ending analyzeQuery tests.');

  // 5. resultsToCSV tests
  console.log('  Starting resultsToCSV tests...');

  // 5.1 Valid results
  const validResults = {
    success: true,
    columns: ['s', 'p', 'o'],
    data: [
      ['s1', 'p1', 'o1'],
      ['s2', 'p2', 'o2'],
    ],
  };
  assert(
    resultsToCSV(validResults) === 's,p,o\ns1,p1,o1\ns2,p2,o2\n',
    'Valid results should be converted to CSV correctly'
  );

  // 5.2 Empty results
  const emptyResults = { success: true, columns: [], data: [] };
  assert(
    resultsToCSV(emptyResults) === '\n',
    'Empty results should be converted to empty CSV'
  );

  // 5.3 Results with commas and quotes
  const complexResults = {
    success: true,
    columns: ['label'],
    data: [['value with , comma and "quotes"']],
  };
  assert(
    resultsToCSV(complexResults) === 'label\n"value with , comma and ""quotes"""\n',
    'Results with commas and quotes should be escaped correctly'
  );

  //5.4 Invalid Results
  const invalidResults = null;

  assert(resultsToCSV(invalidResults) === "", 'Invalid result should be empty');
  console.log('  Ending resultsToCSV tests.');

  console.log('Ending SPARQL Service tests.');
};

testSparqlService();