import { assert } from '../utils/testUtils';
import { formatSparqlQuery } from '../components/SparqlInput';

// Test runner function
function testSparqlInput() {
  // Basic Formatting
  let formattedQuery = formatSparqlQuery('SELECT*WHERE{?s?p?o}');
  assert(formattedQuery === 'SELECT\n *\n\nWHERE\n{\n  ?s\n  ?p\n  ?o\n}\n', 'Basic formatting failed');
}
testSparqlInput();
