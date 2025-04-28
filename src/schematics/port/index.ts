import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext, filter
} from '@angular-devkit/schematics';
import { PortOptions } from './schema'; // Changed from Schema as PortOptions
import * as path from 'path';

// Removed unused dasherize
const { classify, camelize } = strings;

// Helper function to ensure suffix
function ensureSuffix(name: string, suffix: string): string {
  return name.endsWith(suffix) ? name : name + suffix;
}

export default function (options: PortOptions): Rule {
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
    console.log(`Port schematic using fileNameCase: ${fileNameCase}`);
    
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

    const portNameRaw = options.name; // e.g., UserFinder
    const domainName = camelize(options.domain); // e.g., user
    const adapterType = options.adapterType ?? 'repository';
    
    // Handle custom output directory
    const basePath = options.path || '';

    // Determine the final port interface name, ensuring 'Port' suffix
    // Always use PascalCase for class/interface names
    let finalPortName: string;
    
    if (options.portInterfaceName) {
      finalPortName = ensureSuffix(classify(options.portInterfaceName), 'Port');
    } else {
      finalPortName = `${classify(portNameRaw)}Port`; // Default naming for interface
    }

    // Generate filename with appropriate case
    const portFileName = formatCompoundFileName(portNameRaw, adapterType + 'Port');
    
    // Generate adapter interface name (always PascalCase) and filename (cased according to config)
    const adapterClassName = `${classify(portNameRaw)}${classify(adapterType)}Adapter`;
    const adapterFileName = formatCompoundFileName(portNameRaw, adapterType + 'Adapter');

    const domainPath = path.join(basePath, `src/${domainName}`);
    const infraPath = path.join(basePath, `src/infra/${adapterType}`);
    
    // Create files directly instead of using templates to have better control of filenames
    const createPortFile = (tree: Tree) => {
      const portDirPath = path.join(domainPath, 'ports');
      const portFilePath = path.join(portDirPath, `${portFileName}.ts`);
      
      // Create port directory if it doesn't exist
      if (!tree.exists(portDirPath)) {
        tree.create(`${portDirPath}/.gitkeep`, '');
      }
      
      // Create the port interface file
      const portContent = `
// Port interface for ${portNameRaw}
export interface ${finalPortName} {
  // Define your port methods here
}
`;
      tree.create(portFilePath, portContent.trim());
      
      context.logger.info(`\x1b[32mGenerated port interface ${finalPortName} in ${portFilePath}\x1b[0m`);
      return tree;
    };
    
    // Create adapter implementation
    const createAdapterFile = (tree: Tree) => {
      const adapterDirPath = path.join(infraPath);
      const adapterFilePath = path.join(adapterDirPath, `${adapterFileName}.ts`);
      
      // Create adapter directory if it doesn't exist
      if (!tree.exists(adapterDirPath)) {
        tree.create(`${adapterDirPath}/.gitkeep`, '');
      }
      
      // Create the adapter implementation file
      const adapterContent = `import { ${finalPortName} } from '../../${domainName}/ports/${portFileName}';

// Adapter implementation for ${finalPortName}
export class ${adapterClassName} implements ${finalPortName} {
  constructor() {
    // Initialize adapter (e.g., database connection, API client)
  }
  
  // Implement all methods from the port interface
}
`;
      
      tree.create(adapterFilePath, adapterContent.trim());
      context.logger.info(`\x1b[32mGenerated adapter implementation ${adapterClassName} in ${adapterFilePath}\x1b[0m`);
      return tree;
    };
    
    return chain([
      createPortFile,
      createAdapterFile
    ]);
  };
}
