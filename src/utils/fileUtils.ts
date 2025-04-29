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
 * Converts a string to snake_case.
 * Example: "UserPayment" becomes "user_payment"
 */
export function toSnakeCase(str: string): string {
    // First convert to kebab-case
    const kebabCase = toDasherize(str);
    // Then replace hyphens with underscores
    return kebabCase.replace(/-/g, '_');
}

/**
 * Apply file naming case based on configuration
 * @param name The name to transform
 * @param casing The case style to use
 */
export function applyFileNameCase(name: string, casing: 'pascal' | 'camel' | 'kebab' | 'snake'): string {
    switch (casing) {
        case 'pascal':
            return toPascalCase(name);
        case 'camel':
            return toCamelCase(name);
        case 'kebab':
            return toDasherize(name);
        case 'snake':
            return toSnakeCase(name);
        default:
            return toPascalCase(name); // Default to PascalCase
    }
}

/**
 * Process and generate file paths based on configuration
 * @param componentType The type of component (handler, domain, service, etc.)
 * @param fileType The type of file (e.g. handlerFile, modelFile, etc.)
 * @param config The loaded configuration
 * @param templateVars The variables to replace in the templates
 */
export function applyFilePatterns(
    componentType: string, 
    fileType: string,
    config: any, 
    templateVars: Record<string, string>,
    basePath: string = '.'
): { filePath: string, fileName: string } {
    // Get the file pattern for this component type and file
    const filePatterns = config.filePatterns?.[componentType] || {};
    const directories = config.directories?.[componentType] || {};
    
    // Get the file pattern or use a default
    let filePattern: string;
    switch (fileType) {
        case 'handlerFile':
            filePattern = filePatterns.handlerFile || '{{dashName}}.handler.ts';
            break;
        case 'schemaFile':
            filePattern = filePatterns.schemaFile || '{{pascalName}}Schema.ts';
            break;
        case 'dtoFile':
            filePattern = filePatterns.dtoFile || '{{dashName}}.dto.ts';
            break;
        case 'serviceFile':
            filePattern = filePatterns.serviceFile || '{{pascalName}}Service.ts';
            break;
        case 'modelFile':
            filePattern = filePatterns.modelFile || '{{pascalName}}.ts';
            break;
        case 'portFile':
            filePattern = filePatterns.portFile || '{{pascalName}}Port.ts';
            break;
        case 'adapterFile':
            filePattern = filePatterns.adapterFile || '{{pascalName}}Adapter.ts';
            break;
        default:
            filePattern = `{{pascalName}}${fileType.charAt(0).toUpperCase() + fileType.slice(1)}.ts`;
    }
    
    // Get the directory for this file type or use a default
    let dirPath: string;
    switch (fileType) {
        case 'handlerFile':
            dirPath = directories.base || 'handlers';
            break;
        case 'schemaFile':
        case 'dtoFile':
            dirPath = directories.schema || 'handlers/schemas';
            break;
        case 'serviceFile':
            dirPath = directories.service || '{{domainName}}/services';
            break;
        case 'modelFile':
            dirPath = directories.model || '{{domainName}}/models';
            break;
        case 'portFile':
            dirPath = directories.port || '{{domainName}}/ports';
            break;
        case 'adapterFile':
            if (componentType === 'adapter') {
                dirPath = directories.base || 'infra/{{adapterType}}';
            } else {
                dirPath = directories.adapter || '{{domainName}}/adapters';
            }
            break;
        default:
            dirPath = directories.base || `${componentType}s`;
    }
    
    // Apply template variables to directory path
    const processedDirPath = dirPath.replace(/\{\{([^}]+)\}\}/g, (_, key) => templateVars[key] || '');
    
    // Apply template variables to file pattern
    const processedFileName = filePattern.replace(/\{\{([^}]+)\}\}/g, (_, key) => templateVars[key] || '');
    
    // Apply file name case if needed
    let finalFileName = processedFileName;
    if (config.fileNameCase && config.fileNameCase !== 'pascal') {
        // Extract the name part and extension
        const lastDotIndex = processedFileName.lastIndexOf('.');
        if (lastDotIndex !== -1) {
            const namePart = processedFileName.substring(0, lastDotIndex);
            const extension = processedFileName.substring(lastDotIndex);
            
            // Apply case transformation only to the name part
            finalFileName = applyFileNameCase(namePart, config.fileNameCase) + extension;
        }
    }
    
    // Construct the full path
    const fullPath = path.join(basePath, config.basePath, processedDirPath, finalFileName);
    
    return {
        fileName: finalFileName,
        filePath: fullPath
    };
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
