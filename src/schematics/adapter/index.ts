import {
  Rule,
  SchematicContext,
  Tree
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { AdapterSchema } from './schema';

export default function (options: AdapterSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // Import utility functions for file name formatting
    const { toCamelCase, toPascalCase, toDasherize, toSnakeCase } = require('../../utils/fileUtils');
    
    // Get fileNameCase from options
    const fileNameCase = options.fileNameCase || 'pascal';
    console.log(`Adapter schematic using fileNameCase: ${fileNameCase}`);
    
    // Format compound file names
    const formatCompoundFileName = (baseName: string, suffix: string): string => {
      switch (fileNameCase) {
        case 'kebab':
          return `${toDasherize(baseName)}-${toDasherize(suffix)}`;
        case 'snake':
          return `${toSnakeCase(baseName)}_${toSnakeCase(suffix)}`;
        case 'camel':
          return `${toCamelCase(baseName)}${toPascalCase(suffix)}`;
        case 'pascal':
        default:
          return `${toPascalCase(baseName)}${toPascalCase(suffix)}`;
      }
    };
    
    // Normalize adapter name and options - always use PascalCase for class names
    const adapterClassName = strings.classify(options.name);
    const adapterTypeClassName = strings.classify(options.adapterType);
    const portName = options.port;
    const domain = strings.dasherize(options.domain);
    
    // Set up output path
    let basePath = 'src';
    if (options.path) {
      basePath = options.path.startsWith('/') 
        ? options.path.substring(1) 
        : options.path;
    }

    // Determine adapter directory based on adapter type
    const adapterDir = `${basePath}/infra/${options.adapterType}`;

    // Create the adapter file with proper file name case
    const adapterFileName = formatCompoundFileName(options.name, `${options.adapterType}Adapter`);
    const adapterPath = `${adapterDir}/${adapterFileName}.ts`;
    
    // Check if adapter file already exists
    if (tree.exists(adapterPath)) {
      context.logger.warn(`\x1b[33mAdapter file already exists: ${adapterPath}\x1b[0m`);
      context.logger.info('\x1b[36mYou can use a different name or path.\x1b[0m');
      return tree;
    }
    
    const adapterContent = `import { ${portName} } from '../../${domain}/ports/${portName}';

export class ${adapterClassName}${adapterTypeClassName}Adapter implements ${portName} {
  constructor() {
    // Initialize adapter (e.g., database connection, API client)
  }
  
  // Implement all methods from the port interface below
  // ...
}`;

    // Ensure the adapter directory exists
    const createDirectoryIfNotExists = (dirPath: string): void => {
      const segments = dirPath.split('/');
      let currentPath = '';
      
      for (const segment of segments) {
        if (!segment) continue;
        
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        if (!tree.exists(currentPath)) {
          tree.create(`${currentPath}/.gitkeep`, '');
        }
      }
    };
    
    // Create directory and file
    createDirectoryIfNotExists(adapterDir);
    tree.create(adapterPath, adapterContent);
    
    context.logger.info(`\x1b[32mGenerated adapter ${adapterClassName}${adapterTypeClassName}Adapter in ${adapterPath}\x1b[0m`);
    
    return tree;
  };
}