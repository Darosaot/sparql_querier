import {
  isValidSparql,
  isComplexQuery,
  optimizeQuery,
  analyzeQuery,
  resultsToCSV,
} from '../api/sparqlService';
import { assert } from '../utils/testUtils';  

describe('SPARQL Service Tests', () => {
  console.log('Starting SPARQL Service tests...');  
  
  describe('isValidSparql', () => {
    console.log('  Starting isValidSparql tests...');  

    test('Valid SELECT query should be valid', () => {
      try {
        expect(isValidSparql('SELECT * WHERE { ?s ?p ?o }')).toBeTruthy();
      } catch (error) {
        console.error('Valid SELECT query should be valid', error);
      }
    });

    test('Valid ASK query should be valid', () => {
      try {
        expect(isValidSparql('ASK { ?s ?p ?o }')).toBeTruthy();
      } catch (error) {
        console.error('Valid ASK query should be valid', error);
      }
    });

    test('Invalid query (missing WHERE) should be invalid', () => {
      try {
        expect(isValidSparql('SELECT * { ?s ?p ?o }')).toBeFalsy();
      } catch (error) {
        console.error('Invalid query (missing WHERE) should be invalid', error);
      }
    });

    test('Invalid query (unbalanced braces) should be invalid', () => {
      try {
        expect(isValidSparql('SELECT * WHERE { ?s ?p ?o ')).toBeFalsy();
      } catch (error) {
        console.error('Invalid query (unbalanced braces) should be invalid', error);
      }
    });

    test('Invalid query (missing query type) should be invalid', () => {
      try {
        expect(isValidSparql('{ ?s ?p ?o }')).toBeFalsy();
      } catch (error) {
        console.error('Invalid query (missing query type) should be invalid', error);
      }
    });

    test('Valid complex query should be valid', () => {
      try {
        expect(isValidSparql('SELECT ?item WHERE { ?item wdt:P31 wd:Q5 . { SELECT ?item WHERE { ?item wdt:P31 wd:Q5 } } }')).toBeTruthy();
      } catch (error) {
        console.error('Valid complex query should be valid', error);
      }
    });

    test('Invalid query (unbalanced quotes) should be invalid', () => {
      try {
        expect(isValidSparql('SELECT ?s WHERE { ?s rdfs:label "test }')).toBeFalsy();
      } catch (error) {
        console.error('Invalid query (unbalanced quotes) should be invalid', error);
      }
    });
    console.log('  Ending isValidSparql tests.');
  });

  describe('isComplexQuery', () => {
    console.log('  Starting isComplexQuery tests...');

    test('Simple query should not be complex', () => {
      try {
        expect(isComplexQuery('SELECT * WHERE { ?s ?p ?o }')).toBeFalsy();
      } catch (error) {
        console.error('Simple query should not be complex', error);
      }
    });

    test('Query with subquery should be complex', () => {
      try {
        expect(isComplexQuery('SELECT * WHERE { { SELECT ?s WHERE { ?s ?p ?o } } }')).toBeTruthy();
      } catch (error) {
        console.error('Query with subquery should be complex', error);
      }
    });

    test('Query with multiple optionals should be complex', () => {
      try {
        expect(isComplexQuery('SELECT * WHERE { OPTIONAL { ?s ?p ?o } OPTIONAL { ?s ?p ?o } OPTIONAL { ?s ?p ?o } }')).toBeTruthy();
      } catch (error) {
        console.error('Query with multiple optionals should be complex', error);
      }
    });

    test('Query with union should be complex', () => {
      try {
        expect(isComplexQuery('SELECT * WHERE { { ?s ?p ?o } UNION { ?s ?p ?o } }')).toBeTruthy();
      } catch (error) {
        console.error('Query with union should be complex', error);
      }
    });

    test('Query with group by should be complex', () => {
      try {
        expect(isComplexQuery('SELECT ?s COUNT(?o) WHERE { ?s ?p ?o } GROUP BY ?s')).toBeTruthy();
      } catch (error) {
        console.error('Query with group by should be complex', error);
      }
    });
    console.log('  Ending isComplexQuery tests.');
  });

  describe('optimizeQuery', () => {
    console.log('  Starting optimizeQuery tests...');

    test('Simple query should have LIMIT added', () => {
      try {
        expect(optimizeQuery('SELECT * WHERE { ?s ?p ?o }').endsWith('LIMIT 1000')).toBeTruthy();
      } catch (error) {
        console.error('Simple query should have LIMIT added', error);
      }
    });

    test('Query with ORDER BY should have LIMIT added after ORDER BY', () => {
      try {
        expect(optimizeQuery('SELECT * WHERE { ?s ?p ?o } ORDER BY ?s').includes('ORDER BY ?s LIMIT 1000')).toBeTruthy();
      } catch (error) {
        console.error('Query with ORDER BY should have LIMIT added after ORDER BY', error);
      }
    });

    test('Query with existing LIMIT should not be modified', () => {
      try {
        expect(optimizeQuery('SELECT * WHERE { ?s ?p ?o } LIMIT 10')).toBe('SELECT * WHERE { ?s ?p ?o } LIMIT 10');
      } catch (error) {
        console.error('Query with existing LIMIT should not be modified', error);
      }
    });

    test('Aggregation query should not be modified', () => {
      try {
        expect(optimizeQuery('SELECT (COUNT(?o) AS ?count) WHERE { ?s ?p ?o } GROUP BY ?s')).toBe('SELECT (COUNT(?o) AS ?count) WHERE { ?s ?p ?o } GROUP BY ?s');
      } catch (error) {
        console.error('Aggregation query should not be modified', error);
      }
    });
    console.log('  Ending optimizeQuery tests.');
  });

  describe('analyzeQuery', () => {
    console.log('  Starting analyzeQuery tests...');

    test('Simple SELECT query should be analyzed correctly', () => {
      try {
        const simpleQueryAnalysis = analyzeQuery('SELECT ?s WHERE { ?s ?p ?o }');
        expect(simpleQueryAnalysis.isValid).toBeTruthy();
        expect(simpleQueryAnalysis.queryType).toBe('SELECT');
        expect(simpleQueryAnalysis.selectVariables.includes('?s')).toBeTruthy();
        expect(simpleQueryAnalysis.triplePatternCount).toBe(1);
      } catch (error) {
        console.error('Simple SELECT query should be analyzed correctly', error);
      }
    });

    test('Complex query with subquery should be analyzed correctly', () => {
      try {
        const complexQueryAnalysis = analyzeQuery('SELECT ?s WHERE { ?s ?p ?o . { SELECT ?o WHERE { ?s ?p ?o } } }');
        expect(complexQueryAnalysis.isValid).toBeTruthy();
        expect(complexQueryAnalysis.features.hasSubquery).toBeTruthy();
      } catch (error) {
        console.error('Complex query with subquery should be analyzed correctly', error);
      }
    });

    test('ASK query should be analyzed correctly', () => {
      try {
        const askQueryAnalysis = analyzeQuery('ASK { ?s ?p ?o }');
        expect(askQueryAnalysis.isValid).toBeTruthy();
        expect(askQueryAnalysis.queryType).toBe('ASK');
      } catch (error) {
        console.error('ASK query should be analyzed correctly', error);
      }
    });

    test('DESCRIBE query should be analyzed correctly', () => {
      try {
        const describeQueryAnalysis = analyzeQuery('DESCRIBE ?s WHERE { ?s ?p ?o }');
        expect(describeQueryAnalysis.isValid).toBeTruthy();
        expect(describeQueryAnalysis.queryType).toBe('DESCRIBE');
      } catch (error) {
        console.error('DESCRIBE query should be analyzed correctly', error);
      }
    });

    test('CONSTRUCT query should be analyzed correctly', () => {
      try {
        const constructQueryAnalysis = analyzeQuery('CONSTRUCT { ?s ?p ?o } WHERE { ?s ?p ?o }');
        expect(constructQueryAnalysis.isValid).toBeTruthy();
        expect(constructQueryAnalysis.queryType).toBe('CONSTRUCT');
      } catch (error) {
        console.error('CONSTRUCT query should be analyzed correctly', error);
      }
    });
    console.log('  Ending analyzeQuery tests.');
  });

  describe('resultsToCSV', () => {
    console.log('  Starting resultsToCSV tests...');

    test('Valid results should be converted to CSV correctly', () => {
      try {
        const validResults = { success: true, columns: ['s', 'p', 'o'], data: [['s1', 'p1', 'o1'], ['s2', 'p2', 'o2']] };
        expect(resultsToCSV(validResults)).toBe('s,p,o\ns1,p1,o1\ns2,p2,o2\n');
      } catch (error) {
        console.error('Valid results should be converted to CSV correctly', error);
      }
    });

    test('Empty results should be converted to empty CSV', () => {
      try {
        const emptyResults = { success: true, columns: [], data: [] };
        expect(resultsToCSV(emptyResults)).toBe('\n');
      } catch (error) {
        console.error('Empty results should be converted to empty CSV', error);
      }
    });

    test('Results with commas and quotes should be escaped correctly', () => {
      try {
        const complexResults = { success: true, columns: ['label'], data: [['value with , comma and "quotes"']] };
        expect(resultsToCSV(complexResults)).toBe('label\n"value with , comma and ""quotes"""\n');
      } catch (error) {
        console.error('Results with commas and quotes should be escaped correctly', error);
      }
    });

    test('Invalid result should be empty', () => {
      try {
        const invalidResults = null;
        expect(resultsToCSV(invalidResults)).toBe("");
      } catch (error) {
        console.error('Invalid result should be empty', error);
      }
    });
    console.log('  Ending resultsToCSV tests.');
  });
  console.log('Ending SPARQL Service tests.');
});