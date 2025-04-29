import {
  Rule,
  SchematicContext,
  Tree
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { AdapterSchema } from './schema';
import * as path from 'path';

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
    
    // Get configurations
    const config = options._config || { basePath: 'src' };
    
    // Set up output path
    let basePath = options.path || '.';
    
    // Determine adapter file path
    let adapterPath: string;
    let adapterFileName: string;
    
    if (options.adapterFilePath) {
      // Use custom file path if provided
      adapterPath = options.adapterFilePath;
      adapterFileName = options.adapterFileName || formatCompoundFileName(options.name, `${options.adapterType}Adapter`);
    } else {
      // Use default path construction
      const srcRoot = (basePath === '.' ? '' : basePath + '/') + (config.basePath || 'src');
      const adapterDir = `${srcRoot}/infra/${options.adapterType}`;
      adapterFileName = formatCompoundFileName(options.name, `${options.adapterType}Adapter`);
      adapterPath = `${adapterDir}/${adapterFileName}.ts`;
    }
    
    // Get the directory from the file path
    const adapterDir = adapterPath.substring(0, adapterPath.lastIndexOf('/'));
    
    // Check if adapter file already exists
    if (tree.exists(adapterPath)) {
      context.logger.warn(`\x1b[33mAdapter file already exists: ${adapterPath}\x1b[0m`);
      context.logger.info('\x1b[36mYou can use a different name or path.\x1b[0m');
      return tree;
    }
    
    // Calculate relative import path - this is more complex in the adapter case
    // as we need to find the port path from the domain
    let importPath: string;
    if (options.path) {
      // When a path is provided, ensure relative paths work correctly
      const pathPrefix = options.path.endsWith('/') ? options.path : options.path + '/';
      const srcRoot = pathPrefix + (config.basePath || 'src');
      const portPath = `${srcRoot}/${domain}/ports/${portName}`;
      importPath = tree.exists(portPath + '.ts')
        ? path.relative(path.dirname(adapterPath), path.dirname(portPath)).replace(/\\/g, '/') + `/${portName}`
        : `../../${domain}/ports/${portName}`; // Fallback to traditional pattern
    } else {
      // Traditional structure
      importPath = `../../${domain}/ports/${portName}`;
    }
    
    const adapterContent = `import { ${portName} } from '${importPath}';

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