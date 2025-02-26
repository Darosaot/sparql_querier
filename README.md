# SPARQL Analytics React

A React-based application for querying SPARQL endpoints and visualizing the results. This application allows users to execute SPARQL queries, visualize the data using different chart types, perform regression analysis, and export the results in various formats.

## Features

- **SPARQL Query Editor**: Execute SPARQL queries against any endpoint
- **Query Templates**: Choose from predefined SPARQL query templates or write your own
- **Data Visualization**: Visualize your query results with tables, line charts, bar charts, and pie charts
- **Regression Analysis**: Perform linear regression analysis on your data
- **Export Options**: Export your results in CSV, JSON, or Excel formats

## Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/sparql-analytics-react.git
   cd sparql-analytics-react
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

4. Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

## Usage

1. Enter a SPARQL endpoint URL in the "SPARQL Endpoint" field (e.g., `https://dbpedia.org/sparql`)
2. Select a query template or write your own SPARQL query
3. Click "Execute Query" to run the query
4. View and interact with the results in the provided visualizations
5. Perform regression analysis on the data if needed
6. Export the results in your preferred format

## Technologies Used

- React 18
- Bootstrap 5 / React-Bootstrap
- Plotly.js for data visualization
- Simple-statistics for regression analysis
- XLSX for Excel export
- Papa Parse for CSV handling
- SPARQL HTTP Client for query execution

## Development

### Available Scripts

- `npm start` - Runs the app in development mode
- `npm test` - Runs the test suite
- `npm run build` - Builds the app for production
- `npm run eject` - Ejects from Create React App

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
