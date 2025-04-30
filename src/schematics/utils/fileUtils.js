"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateFileFromTemplate = generateFileFromTemplate;
exports.capitalizeFirstLetter = capitalizeFirstLetter;
exports.lowerCaseFirstLetter = lowerCaseFirstLetter;
exports.toCamelCase = toCamelCase;
exports.toPascalCase = toPascalCase;
exports.toDasherize = toDasherize;
exports.toSnakeCase = toSnakeCase;
exports.applyFileNameCase = applyFileNameCase;
exports.applyFilePatterns = applyFilePatterns;
exports.displayWithPagination = displayWithPagination;
const fs = __importStar(require("fs-extra"));
const path = __importStar(require("path"));
/**
 * Generates a file from a template.
 * @param templatePath Path to the template file.
 * @param targetPath Path where the new file should be created.
 * @param replacements An object with keys as placeholders (e.g., {{name}}) and values as replacements.
 */
function generateFileFromTemplate(templatePath, targetPath, replacements) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            let templateContent = yield fs.readFile(templatePath, 'utf-8');
            // Replace placeholders
            Object.entries(replacements).forEach(([placeholder, value]) => {
                // Use a regex to replace all occurrences globally
                const regex = new RegExp(`{{${placeholder}}}`, 'g');
                templateContent = templateContent.replace(regex, value);
            });
            // Ensure the target directory exists
            yield fs.ensureDir(path.dirname(targetPath));
            // Write the generated content to the target file
            yield fs.writeFile(targetPath, templateContent);
            console.log(`Successfully generated: ${targetPath}`);
        }
        catch (error) {
            console.error(`Error generating file ${targetPath}:`, error.message);
            // Optionally re-throw or handle specific errors
            // throw error;
        }
    });
}
/**
 * Capitalizes the first letter of a string.
 */
function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
/**
 * Lowercases the first letter of a string.
 */
function lowerCaseFirstLetter(string) {
    return string.charAt(0).toLowerCase() + string.slice(1);
}
/**
 * Converts a string to camelCase.
 */
function toCamelCase(str) {
    // Replace hyphens and underscores with spaces, then capitalize words and join
    return str.replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
        .replace(/^./, (c) => c.toLowerCase()); // Ensure first letter is lowercase
}
/**
 * Converts a string to PascalCase.
 */
function toPascalCase(str) {
    const camelCase = toCamelCase(str);
    return capitalizeFirstLetter(camelCase);
}
/**
 * Converts a string to dash-case (kebab-case).
 * Example: "UserPayment" becomes "user-payment"
 */
function toDasherize(str) {
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
function toSnakeCase(str) {
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
function applyFileNameCase(name, casing) {
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
function applyFilePatterns(componentType, fileType, config, templateVars, basePath = '.') {
    var _a, _b;
    // Get the file pattern for this component type and file
    const filePatterns = ((_a = config.filePatterns) === null || _a === void 0 ? void 0 : _a[componentType]) || {};
    const directories = ((_b = config.directories) === null || _b === void 0 ? void 0 : _b[componentType]) || {};
    // Get the file pattern or use a default
    let filePattern;
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
    let dirPath;
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
            }
            else {
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
function displayWithPagination(content_1) {
    return __awaiter(this, arguments, void 0, function* (content, linesPerPage = 20) {
        const lines = content.split('\n');
        let currentPage = 0;
        const totalPages = Math.ceil(lines.length / linesPerPage);
        const displayPage = (pageNum) => {
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
                process.stdin.on('data', (key) => {
                    // Convert Buffer to string if needed
                    const keyStr = key.toString();
                    // Check for SPACE (next page) or Q (quit)
                    if (keyStr === ' ') {
                        currentPage++;
                        if (currentPage < totalPages) {
                            displayPage(currentPage);
                        }
                        else {
                            process.stdin.setRawMode(false);
                            process.stdin.pause();
                            resolve();
                        }
                    }
                    else if (keyStr.toLowerCase() === 'q') {
                        process.stdin.setRawMode(false);
                        process.stdin.pause();
                        resolve();
                    }
                });
            });
        }
    });
}
//# sourceMappingURL=fileUtils.js.map