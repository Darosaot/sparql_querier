import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Convert query results to a CSV string
 * 
 * @param {Array} data - Array of data rows
 * @param {Array} columns - Array of column names
 * @returns {string} - CSV formatted string
 */
export const convertToCSV = (data, columns) => {
  // Create array with header row and data rows
  const rows = [columns, ...data];
  
  // Use PapaParse to convert array to CSV
  return Papa.unparse(rows);
};

/**
 * Export query results to CSV file
 * 
 * @param {Array} data - Array of data rows
 * @param {Array} columns - Array of column names
 */
export const exportToCSV = (data, columns) => {
  const csv = convertToCSV(data, columns);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, 'query_results.csv');
};

/**
 * Export query results to JSON file
 * 
 * @param {Array} data - Array of data rows
 * @param {Array} columns - Array of column names
 */
export const exportToJSON = (data, columns) => {
  // Transform array data to array of objects with column names
  const jsonData = data.map(row => {
    const obj = {};
    columns.forEach((col, index) => {
      obj[col] = row[index];
    });
    return obj;
  });
  
  const json = JSON.stringify(jsonData, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  saveAs(blob, 'query_results.json');
};

/**
 * Export query results to Excel file
 * 
 * @param {Array} data - Array of data rows
 * @param {Array} columns - Array of column names
 */
export const exportToExcel = (data, columns) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();
  
  // Convert data to worksheet format (include headers)
  const ws_data = [columns, ...data];
  const ws = XLSX.utils.aoa_to_sheet(ws_data);
  
  // Add worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Query Results');
  
  // Generate Excel file and trigger download
  XLSX.writeFile(wb, 'query_results.xlsx');
};
