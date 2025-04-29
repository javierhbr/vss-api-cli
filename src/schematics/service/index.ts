import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema as ServiceOptions } from './schema';
import * as path from 'path';

const { classify, camelize } = strings;

export default function (options: ServiceOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }
    if (!options.domain) {
      throw new SchematicsException('Option (domain) is required.');
    }
    
    // Import utility functions for file name formatting
    const { toCamelCase, toPascalCase, toDasherize, toSnakeCase } = require('../../utils/fileUtils');
    
    // Get fileNameCase from options
    const fileNameCase = options.fileNameCase || 'pascal';
    console.log(`Service schematic using fileNameCase: ${fileNameCase}`);
    
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

    const serviceNameRaw = options.name;
    const domainName = camelize(options.domain);
    const basePath = options.path || '.'; // Use provided path or default
    
    // Get configurations
    const config = options._config || { basePath: 'src' };
    const srcRoot = path.join(basePath, config.basePath || 'src'); // Source root from config
    
    // Determine service path and filename
    let serviceFilePath: string;
    let serviceFileName: string;
    
    if (options.serviceFilePath) {
      // Use custom file path if provided
      serviceFilePath = options.serviceFilePath;
      serviceFileName = options.serviceFileName || formatCompoundFileName(serviceNameRaw, 'Service');
    } else {
      // Use default path construction
      const servicePath = path.join(srcRoot, domainName, 'services'); // Target path relative to srcRoot
      serviceFileName = formatCompoundFileName(serviceNameRaw, 'Service'); // Filename with configured case
      serviceFilePath = path.join(servicePath, `${serviceFileName}.ts`);
    }
    
    // Generate service class name (always PascalCase)
    const serviceClassName = `${classify(serviceNameRaw)}Service`; // Class name always in PascalCase

    // Check if domain exists (optional)
    if (config.basePath) {
      const domainCheckPath = path.join(srcRoot, domainName);
      if (!tree.exists(domainCheckPath)) {
          context.logger.warn(`Domain '${domainName}' might not exist or is empty within '${srcRoot}'. Creating service anyway.`);
      }
    }

    // Create service file directly with proper naming case
    const createServiceFile = () => {
      // Create the service directory if it doesn't exist
      const serviceDirPath = path.dirname(serviceFilePath);
      if (!tree.exists(serviceDirPath)) {
        tree.create(`${serviceDirPath}/.gitkeep`, '');
      }
      
      // If the service file already exists, throw an error
      if (tree.exists(serviceFilePath)) {
        throw new SchematicsException(`Service file (${serviceFilePath}) already exists.`);
      }
      
      // Create service file content
      const serviceContent = `// Service implementation for ${serviceNameRaw}
export class ${serviceClassName} {
  constructor() {
    // Initialize dependencies
  }

  // Define your service methods here
  // Example:
  // async findById(id: string): Promise<any> {
  //   // Implementation here
  // }
}
`;
      
      tree.create(serviceFilePath, serviceContent);
      context.logger.info(`\x1b[32mGenerated service ${serviceClassName} in ${serviceFilePath}\x1b[0m`);
    };
    
    // Execute the file creation
    createServiceFile();
    
    return tree;
  };
}