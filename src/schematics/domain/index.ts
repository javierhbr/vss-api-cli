import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import { toCamelCase, toDasherize, toPascalCase, toSnakeCase } from '@/utils/fileUtils';

// Helper to process directory templates
function processTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key] || '');
}

const { camelize } = strings;

export default function (options: Schema): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    // Get fileNameCase from options or config
    const fileNameCase = options.fileNameCase || 'pascal';
    console.log(`Domain schematic using fileNameCase: ${fileNameCase}`);
    
    // Format name based on fileNameCase config
    const formatName = (name: string): string => {
      switch (fileNameCase) {
        case 'camel':
          return toCamelCase(name);
        case 'kebab':
          return toDasherize(name);
        case 'snake':
          return toSnakeCase(name);
        case 'pascal':
        default:
          return toPascalCase(name);
      }
    };
    
    // Format compound names (like serviceName, portName) for file names
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

    // Always use PascalCase for class/interface names regardless of file naming convention
    const formatClassName = (name: string): string => {
      return toPascalCase(name);
    };

    const domainName = camelize(options.name);
    const modelName = formatName(options.name);
    const classModelName = formatClassName(options.name); // For the class declaration
    const basePath = options.path || '.';
    // Use configured basePath for source root
    const config = (options as any)._config;
    const srcRoot = path.join(basePath, config.basePath || 'src');

    console.log(`Using name: ${options.name}`);
    console.log(`Using formatted filename: ${modelName}`);
    console.log(`Using class name: ${classModelName}`);
    console.log(`Using src root: ${srcRoot}`);

    // Create all directories using the tree but not .gitkeep files
    // which can cause path conflicts with system directories
    return (tree: Tree) => {
      // Helper function to create a directory without .gitkeep files
      const createDir = (dirPath: string) => {
        // Directories are implicitly created when files are added
        // We don't need to do anything special
        console.log(`Ensuring directory: ${dirPath}`);
      };
      
      // 1. Create the model file
      if (options.model !== false) {
        // Determine model directory from config
        const modelDirRel = processTemplate(config.directories.model, { domainName });
        const modelDir = path.join(srcRoot, modelDirRel);
        createDir(modelDir);
        
        const modelFile = path.join(modelDir, `${modelName}.ts`);
        const modelContent = `// Define your domain model properties and methods here
export class ${classModelName} {
  // Example property
  // readonly id: string;

  constructor(/* constructor parameters */) {
    // Initialize properties
  }

  // Example method
  // public someBusinessLogic(): void {
  //   // ...
  // }
}`;
        tree.create(modelFile, modelContent);
        console.log(`Created model file: ${modelFile}`);
      }
      
      // 2. Create the service file
      if (options.service !== false) {
        // Determine service directory from config
        const serviceDirRel = processTemplate(config.directories.service, { domainName });
        const serviceDir = path.join(srcRoot, serviceDirRel);
        createDir(serviceDir);
        
        // Use compound name formatting for service file
        const serviceBaseName = options.serviceName || options.name;
        const serviceSuffix = 'Service';
        const serviceFileName = formatCompoundFileName(serviceBaseName, serviceSuffix);
        const serviceClassName = formatClassName(serviceBaseName + serviceSuffix);
        
        const adapterType = options.adapterType || 'repository';
        
        // Format the port name according to convention
        const portBaseName = options.name;
        const portSuffix = `${adapterType.charAt(0).toUpperCase() + adapterType.slice(1)}Port`;
        const portFileName = formatCompoundFileName(portBaseName, portSuffix);
        const portClassName = formatClassName(portBaseName + portSuffix);
        
        const camelCasedPortName = camelize(portClassName);
        
        const serviceFile = path.join(serviceDir, `${serviceFileName}.ts`);
        const serviceContent = `import { ${classModelName} } from '../models/${modelName}';
${options.port !== false ? `import { ${portClassName} } from '../ports/${portFileName}';` : '// No ports to import'}

// Define your service logic here
export class ${serviceClassName} {
  constructor(
    ${options.port !== false ? `private readonly ${camelCasedPortName}: ${portClassName}` : '// No port dependencies'}
  ) {}

  // Example service method
  // public async performAction(data: ${classModelName}): Promise<ResultType> {
  //   // Use injected ports and models
  //   // await this.${camelCasedPortName}.somePortMethod(data.id);
  //   return /* result */;
  // }
}`;
        tree.create(serviceFile, serviceContent);
        console.log(`Created service file: ${serviceFile}`);
      }
      
      // 3. Create the port file
      if (options.port !== false && options.adapterType !== 'none') {
        // Determine port directory from config
        const portDirRel = processTemplate(config.directories.port, { domainName });
        const portDir = path.join(srcRoot, portDirRel);
        createDir(portDir);
        
        const adapterType = options.adapterType || 'repository';
        
        // Format port name according to convention
        const portBaseName = options.portName || options.name;
        const portSuffix = `${adapterType.charAt(0).toUpperCase() + adapterType.slice(1)}Port`;
        const portFileName = formatCompoundFileName(portBaseName, portSuffix);
        const portClassName = formatClassName(portBaseName + portSuffix);
        
        const portFile = path.join(portDir, `${portFileName}.ts`);
        const portContent = `import { ${classModelName} } from '../models/${modelName}';

// Define your port interface here
export interface ${portClassName} {
  // Example methods
  // findById(id: string): Promise<${classModelName} | null>;
  // save(data: ${classModelName}): Promise<${classModelName}>;
}`;
        tree.create(portFile, portContent);
        console.log(`Created port file: ${portFile}`);
        
        // 4. Create the adapter file
        // Determine adapter directory from config
        const adapterDirRel = processTemplate(config.directories.adapter.base, { adapterType, domainName });
        const adapterDir = path.join(srcRoot, adapterDirRel);
        createDir(adapterDir);
        
        // Format adapter name according to convention
        const adapterBaseName = options.adapterName || options.name;
        const adapterSuffix = `${adapterType.charAt(0).toUpperCase() + adapterType.slice(1)}Adapter`;
        const adapterFileName = formatCompoundFileName(adapterBaseName, adapterSuffix);
        const adapterClassName = formatClassName(adapterBaseName + adapterSuffix);
        
        const adapterFile = path.join(adapterDir, `${adapterFileName}.ts`);
        const adapterContent = `import { ${portClassName} } from '../../${domainName}/ports/${portFileName}';
import { ${classModelName} } from '../../${domainName}/models/${modelName}';

// Define your adapter implementation here
export class ${adapterClassName} implements ${portClassName} {
  constructor() {
    // Initialize adapter (e.g., database connection, API client)
  }

  // Example implementation
  // async findById(id: string): Promise<${classModelName} | null> {
  //   // Implementation details
  //   return new ${classModelName}(...);
  // }
  //
  // async save(data: ${classModelName}): Promise<${classModelName}> {
  //   // Implementation details
  //   return data;
  // }
}`;
        tree.create(adapterFile, adapterContent);
        console.log(`Created adapter file: ${adapterFile}`);
      }
      
      return tree;
    };
  };
}
