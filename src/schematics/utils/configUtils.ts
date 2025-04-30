/**
 * Configuration utilities for VSS API CLI
 */

/**
 * Normalizes a file path by ensuring it doesn't have a leading slash
 * This helps maintain consistent relative paths across the codebase
 * 
 * @param filePath - The file path to normalize
 * @returns The normalized path without a leading slash
 */
export function normalizePath(filePath: string): string {
  if (!filePath) {
    return '';
  }
  return filePath.startsWith('/') ? filePath.substring(1) : filePath;
}

