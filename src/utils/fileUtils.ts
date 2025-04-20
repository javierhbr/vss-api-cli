import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * Generates a file from a template.
 * @param templatePath Path to the template file.
 * @param targetPath Path where the new file should be created.
 * @param replacements An object with keys as placeholders (e.g., {{name}}) and values as replacements.
 */
export async function generateFileFromTemplate(
  templatePath: string,
  targetPath: string,
  replacements: Record<string, string>
): Promise<void> {
  try {
    let templateContent = await fs.readFile(templatePath, 'utf-8');

    // Replace placeholders
    Object.entries(replacements).forEach(([placeholder, value]) => {
      // Use a regex to replace all occurrences globally
      const regex = new RegExp(`{{${placeholder}}}`, 'g');
      templateContent = templateContent.replace(regex, value);
    });

    // Ensure the target directory exists
    await fs.ensureDir(path.dirname(targetPath));

    // Write the generated content to the target file
    await fs.writeFile(targetPath, templateContent);
    console.log(`Successfully generated: ${targetPath}`);

  } catch (error: any) {
    console.error(`Error generating file ${targetPath}:`, error.message);
    // Optionally re-throw or handle specific errors
    // throw error;
  }
}

/**
 * Capitalizes the first letter of a string.
 */
export function capitalizeFirstLetter(string: string): string {
  return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Lowercases the first letter of a string.
 */
export function lowerCaseFirstLetter(string: string): string {
    return string.charAt(0).toLowerCase() + string.slice(1);
}

/**
 * Converts a string to camelCase.
 */
export function toCamelCase(str: string): string {
    // Replace hyphens and underscores with spaces, then capitalize words and join
    return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
              .replace(/^./, (c) => c.toLowerCase()); // Ensure first letter is lowercase
}

/**
 * Converts a string to PascalCase.
 */
export function toPascalCase(str: string): string {
    const camelCase = toCamelCase(str);
    return capitalizeFirstLetter(camelCase);
}

/**
 * Converts a string to dash-case (kebab-case).
 * Example: "UserPayment" becomes "user-payment"
 */
export function toDasherize(str: string): string {
    // First convert to camelCase to handle various input formats
    const camelCase = toCamelCase(str);
    // Then convert camelCase to dash-case
    return camelCase
        .replace(/([a-z])([A-Z])/g, '$1-$2')
        .toLowerCase();
}

/**
 * Display text content with pagination
 * @param content The text content to display
 * @param linesPerPage Number of lines to show per page
 */
export async function displayWithPagination(content: string, linesPerPage: number = 20): Promise<void> {
    const lines = content.split('\n');
    let currentPage = 0;
    const totalPages = Math.ceil(lines.length / linesPerPage);

    const displayPage = (pageNum: number) => {
        console.clear();
        const start = pageNum * linesPerPage;
        const end = Math.min(start + linesPerPage, lines.length);
        
        // Display the current chunk of content
        console.log(lines.slice(start, end).join('\n'));
        
        // Show pagination info
        if (totalPages > 1) {
            console.log('\n\x1b[36m' + '─'.repeat(40) + '\x1b[0m');
            console.log(`\x1b[90mPage ${pageNum + 1}/${totalPages} - Press SPACE to continue, Q to quit\x1b[0m`);
        }
    };

    // Display first page
    displayPage(currentPage);

    // If there's more than one page, handle pagination
    if (totalPages > 1) {
        process.stdin.setRawMode(true);
        process.stdin.resume();
        process.stdin.setEncoding('utf8');

        return new Promise((resolve) => {
            process.stdin.on('data', (key: Buffer | string) => {
                // Convert Buffer to string if needed
                const keyStr = key.toString();
                
                // Check for SPACE (next page) or Q (quit)
                if (keyStr === ' ') {
                    currentPage++;
                    if (currentPage < totalPages) {
                        displayPage(currentPage);
                    } else {
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        resolve();
                    }
                } else if (keyStr.toLowerCase() === 'q') {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    resolve();
                }
            });
        });
    }
}
