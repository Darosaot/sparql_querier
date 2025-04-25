import { assert } from '../utils/testUtils';
import { formatSparqlQuery } from '../components/SparqlInput';

describe('SparqlInput Component Tests', () => {
  console.log('Starting SparqlInput component tests...\n');

  console.log('  Starting SparqlInput component tests...\n');

  test('Basic formatting', () => {
    console.log('    Starting Basic formatting test');
    try{
      let formattedQuery = formatSparqlQuery('SELECT*WHERE{?s?p?o}');
      assert(formattedQuery === 'SELECT\n *\n\nWHERE\n{\n  ?s\n  ?p\n  ?o\n}\n', 'Basic formatting failed');
      console.log('      ✓ Basic formatting test passed');
    } catch (error) {
      console.error('      ✕ Basic formatting test failed', error);
    }
    console.log('    Ending Basic formatting test\n');
  });

  console.log('Ending SparqlInput component tests.');
});




