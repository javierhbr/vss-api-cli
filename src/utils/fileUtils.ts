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
