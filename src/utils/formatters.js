/**
 * formatters.js
 * Utility functions for formatting values in a consistent way across the application
 */

/**
 * Format a number as GBP currency
 * @param {number} value - The numeric value to format
 * @param {boolean} includeSymbol - Whether to include the currency symbol (£)
 * @returns {string} Formatted currency string
 */
export const formatCurrency = (value, includeSymbol = true) => {
  if (value === null || value === undefined) return includeSymbol ? '£0.00' : '0.00';
  
  // Handle string values that may include currency symbols already
  if (typeof value === 'string') {
    // Extract numeric value from string (remove currency symbols, commas, etc.)
    value = parseFloat(value.replace(/[^0-9.-]+/g, ''));
  }
  
  // Check if the value is a valid number after parsing
  if (isNaN(value)) return includeSymbol ? '£0.00' : '0.00';
  
  // Format with appropriate currency symbol and decimal places
  return new Intl.NumberFormat('en-GB', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: 'GBP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(value);
};

/**
 * Format a number as a percentage
 * @param {number} value - The decimal value to format as percentage (e.g., 0.25 for 25%)
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted percentage string with % symbol
 */
export const formatPercentage = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return '0%';
  
  return new Intl.NumberFormat('en-GB', {
    style: 'percent',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
};

/**
 * Format a number with thousands separators
 * @param {number} value - The numeric value to format
 * @param {number} decimals - Number of decimal places to show
 * @returns {string} Formatted number with thousand separators
 */
export const formatNumber = (value, decimals = 0) => {
  if (value === null || value === undefined || isNaN(value)) return '0';
  
  return new Intl.NumberFormat('en-GB', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(value);
}; 