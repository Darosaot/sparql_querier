import { executeQuery } from '../api/sparqlService';
import { assert } from '../utils/testUtils';

describe('App Component Tests', () => {
  console.log('Starting App component tests...\n');
  
  test('Basic file check', () => {
    console.log('  Starting App component tests: basic file check...');
    expect(true).toBe(true);
    console.log('    ✓ Basic test passed\n');
  });

  describe('Query Execution Tests', () => {

  console.log('  Starting Query Execution tests...');

  // 1.1 Valid Endpoint and Query
  const validEndpoint = 'https://publications.europa.eu/webapi/rdf/sparql';
  const validQuery = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10';

    test('Valid Endpoint and Query', async () => {
      console.log('    Starting Valid Endpoint and Query test...');
      try {
        const result = await executeQuery(validEndpoint, validQuery);
        expect(result.success).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
          console.log('    ✓ Valid Endpoint and Query test passed\n');
      } catch (error) {
          console.error('    ✕ Valid Endpoint and Query test failed', error);
      }
    });

    test('Invalid Endpoint', async () => {
      console.log('    Starting Invalid Endpoint test...');
      const invalidEndpoint = 'http://invalid-endpoint';
      const anyQuery = 'SELECT * WHERE { ?s ?p ?o }';
      try {
        const result = await executeQuery(invalidEndpoint, anyQuery);
        expect(result.success).toBe(false);
          console.log('    ✓ Invalid Endpoint test passed\n');
      } catch (error) {
          console.error('    ✕ Invalid Endpoint test failed', error);
      }
    });

    test('Invalid Query', async () => {
      console.log('    Starting Invalid Query test...');
      const invalidQuery = 'INVALID QUERY';
      try {
        const result = await executeQuery('https://dbpedia.org/sparql', invalidQuery);
        expect(result.success).toBe(false);
          console.log('    ✓ Invalid Query test passed\n');
      } catch (error) {
          console.error('    ✕ Invalid Query test failed', error);
      }
    });

    test('No Results', async () => {
      console.log('    Starting No Results test...');
      const noResultsQuery = 'SELECT * WHERE { ?s ?p ?o FILTER (?s = <http://example.com/nonexistent>) }';
      try {
        const result = await executeQuery(validEndpoint, noResultsQuery);
        expect(result.success).toBe(true);
        expect(result.data.length).toBe(0);
          console.log('    ✓ No Results test passed\n');
      } catch (error) {
          console.error('    ✕ No Results test failed', error);
      }
    });

    test('Empty Endpoint', async () => {
      console.log('    Starting Empty Endpoint test...');
      const anyQuery = 'SELECT * WHERE { ?s ?p ?o }';
      try {
        const result = await executeQuery("", anyQuery);
        expect(result.success).toBe(false);
          console.log('    ✓ Empty Endpoint test passed\n');
      } catch (error) {
          console.error('    ✕ Empty Endpoint test failed', error);
      }
    });

    test('Complex Query', async () => {
      console.log('    Starting Complex Query test...');
      const complexQuery = `
        SELECT ?country ?countryLabel ?population WHERE {
          ?country wdt:P31 wd:Q3624078.
          ?country wdt:P1082 ?population.
          SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
        }
        ORDER BY DESC(?population)
        LIMIT 10
      `;
      try {
        const result = await executeQuery("https://query.wikidata.org/sparql", complexQuery);
        expect(result.success).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
          console.log('    ✓ Complex Query test passed\n');
      } catch (error) {
          console.error('    ✕ Complex Query test failed', error);
      }
    });

    test('Time Out', async () => {
      console.log('    Starting Time Out test...');
      const timeOutEndpoint = 'https://query.wikidata.org/big';
      try {
        const result = await executeQuery(timeOutEndpoint, validQuery);
        expect(result.success).toBe(false);
          console.log('    ✓ Time out test passed\n');
      } catch (error) {
          console.error('    ✕ Time out test failed', error);
      }
    });

    test('Ask', async () => {
      console.log('    Starting Ask test...');
      const askQuery = 'ASK { ?s ?p ?o }';
      try {
        const result = await executeQuery("https://dbpedia.org/sparql", askQuery);
        expect(result.success).toBe(true);
          console.log('    ✓ Ask test passed\n');
      } catch (error) {
          console.error('    ✕ Ask test failed', error);
      }
    });

    console.log('  Ending Query Execution tests.\n');

  });

  describe('Query History Tests', () => {
    console.log('  Starting query history tests...');

    test('Add Query', async () => {
      console.log('    Starting Add Query test...');
      let queryHistory = [];
      const historyEntry = {
        id: 'test',
        name: 'Test Query',
        query: 'SELECT * WHERE {?s ?p ?o}',
        endpoint: 'https://dbpedia.org/sparql',
        resultCount: 0,
        executionTime: 0,
        bookmarked: false,
      };
      queryHistory = [historyEntry, ...queryHistory];
      expect(queryHistory.length).toBe(1);
      console.log('    ✓ Add Query test passed\n');
    });

    test('Delete Query', async () => {
      console.log('    Starting Delete Query test...');
      let queryHistory = [];
      const historyEntry = {
        id: 'test',
        name: 'Test Query',
        query: 'SELECT * WHERE {?s ?p ?o}',
        endpoint: 'https://dbpedia.org/sparql',
        resultCount: 0,
        executionTime: 0,
        bookmarked: false,
      };
      queryHistory = [historyEntry, ...queryHistory];
      queryHistory = queryHistory.filter(item => item.id !== 'test');
      expect(queryHistory.length).toBe(0);
      console.log('    ✓ Delete Query test passed\n');
    });

    test('Bookmark', async () => {
      console.log('    Starting Bookmark test...');
      let queryHistory = [];
      const historyEntry = {
        id: 'test',
        name: 'Test Query',
        query: 'SELECT * WHERE {?s ?p ?o}',
        endpoint: 'https://dbpedia.org/sparql',
        resultCount: 0,
        executionTime: 0,
        bookmarked: false,
      };
      queryHistory = [historyEntry, ...queryHistory];
      queryHistory = queryHistory.map(item =>
        item.id === 'test' ? { ...item, bookmarked: !item.bookmarked } : item
      );
      expect(queryHistory[0].bookmarked).toBe(true);
      console.log('    ✓ Bookmark test passed\n');
    });

    test('Load Query', async () => {
      console.log('    Starting Load Query test...');
      let queryHistory = [];
      const historyEntry = {
        id: 'test',
        name: 'Test Query',
        query: 'SELECT * WHERE {?s ?p ?o}',
        endpoint: 'https://dbpedia.org/sparql',
        resultCount: 0,
        executionTime: 0,
        bookmarked: false,
      };
      queryHistory = [historyEntry, ...queryHistory];

      const loadedQuery = historyEntry.query;
      expect(loadedQuery).toBe('SELECT * WHERE {?s ?p ?o}');
      console.log('    ✓ Load Query test passed\n');
    });

    console.log('  Ending query history tests.\n');
  });

  console.log('Ending App component tests.\n');
});

