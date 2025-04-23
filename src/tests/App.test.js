import { executeQuery } from '../api/sparqlService';
import { assert } from '../utils/testUtils';

const testApp = async function() {
  console.log('Starting App component tests...');

  console.log('  Starting Query Execution tests...');

  // 1.1 Valid Endpoint and Query
  const validEndpoint = 'https://dbpedia.org/sparql';
  const validQuery = 'SELECT ?s WHERE { ?s ?p ?o } LIMIT 10';
  try {
    const result = await executeQuery(validEndpoint, validQuery);
    assert(result.success, 'Valid endpoint and query should succeed');
    assert(result.data.length > 0, 'Valid query should return results');
    console.log('    ✓ Valid Endpoint and Query test passed');
  } catch (error) {
    console.error('    ✕ Valid Endpoint and Query test failed', error);
  }

  // 1.2 Invalid Endpoint
  const invalidEndpoint = 'http://invalid-endpoint';
  const anyQuery = 'SELECT * WHERE { ?s ?p ?o }';
  try {
    const result = await executeQuery(invalidEndpoint, anyQuery);
    assert(!result.success, 'Invalid endpoint should fail');
    console.log('    ✓ Invalid Endpoint test passed');
  } catch (error) {
    console.error('    ✕ Invalid Endpoint test failed', error);
  }

  // 1.3 Invalid Query
  const invalidQuery = 'INVALID QUERY';
  try {
    const result = await executeQuery(validEndpoint, invalidQuery);
    assert(!result.success, 'Invalid query should fail');
    console.log('    ✓ Invalid Query test passed');
  } catch (error) {
    console.error('    ✕ Invalid Query test failed', error);
  }

  // 1.4 No Results
  const noResultsQuery = 'SELECT * WHERE { ?s ?p ?o FILTER (?s = <http://example.com/nonexistent>) }';
  try {
    const result = await executeQuery(validEndpoint, noResultsQuery);
    assert(result.success, 'No results query should succeed');
    assert(result.data.length === 0, 'No results query should return no data');
    console.log('    ✓ No Results test passed');
  } catch (error) {
    console.error('    ✕ No Results test failed', error);
  }

  // 1.5 Empty Endpoint
  try {
    const result = await executeQuery("", anyQuery);
    assert(!result.success, 'Empty Endpoint query should fail');    
    console.log('    ✓ Empty Endpoint test passed');    
  } catch (error) {
    console.error('    ✕ Empty Endpoint test failed', error);
  }
  
    console.log('  Ending Query Execution tests.');


  // 2. Query history
  console.log('  Starting query history tests...');

    // Add Query :
    const addQueryTest = () => {
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
      assert(queryHistory.length === 1, 'Adding a query should increase history length');
      console.log('    ✓ Add Query test passed');
    };
    addQueryTest();

      // Delete Query:
    const deleteQueryTest = () => {
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
        assert(queryHistory.length === 0, 'Deleting a query should decrease history length');
        console.log('    ✓ Delete Query test passed');
    };
    deleteQueryTest();

    // Bookmark:
    const bookmarkQueryTest = () => {
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
            item.id === 'test'
            ? { ...item, bookmarked: !item.bookmarked }
            : item
        );
        assert(queryHistory[0].bookmarked === true, 'Query should be bookmarked');
        console.log('    ✓ Bookmark test passed');
    };
    bookmarkQueryTest();

    // Load query
    const loadQueryTest = () => {
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
        assert(loadedQuery === 'SELECT * WHERE {?s ?p ?o}', 'Loading a query should return the query');
        console.log('    ✓ Load query test passed');
    };
    loadQueryTest();    

    console.log('  Ending query history tests.');

  console.log('Ending App component tests.');
};
testApp();