import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import { toCamelCase, toPascalCase } from '../../utils/fileUtils';


const { camelize } = strings;

export default function (options: Schema): Rule {
  return (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    // Get fileNameCase from options
    const fileNameCase = options.fileNameCase || 'pascal';
    console.log(`Domain schematic using fileNameCase: ${fileNameCase}`);
    
    // Format name based on config
    const formatName = (name: string) => {
      return fileNameCase === 'camel' ? toCamelCase(name) : toPascalCase(name);
    };

    const domainName = camelize(options.name);
    const modelName = formatName(options.name);
    const basePath = options.path || '.';
    const srcRoot = path.join(basePath, 'src');

    console.log(`Using name: ${options.name}`);
    console.log(`Using formatted name: ${modelName}`);
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
        const modelDir = path.join(srcRoot, domainName, 'models');
        createDir(modelDir);
        
        const modelFile = path.join(modelDir, `${modelName}.ts`);
        const modelContent = `// Define your domain model properties and methods here
export class ${modelName} {
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
        const serviceDir = path.join(srcRoot, domainName, 'services');
        createDir(serviceDir);
        
        const serviceNameBase = options.serviceName || `${modelName}Service`;
        const serviceName = formatName(serviceNameBase);
        
        const adapterType = options.adapterType || 'repository';
        const portInterfaceName = options.port !== false ? 
          formatName(`${modelName}${adapterType.charAt(0).toUpperCase() + adapterType.slice(1)}Port`) : 
          'any';
        
        const camelCasedPortName = options.port !== false ? camelize(portInterfaceName) : 'anyPort';
        
        const serviceFile = path.join(serviceDir, `${serviceName}.ts`);
        const serviceContent = `import { ${modelName} } from '../models/${modelName}';
${options.port !== false ? `import { ${portInterfaceName} } from '../ports/${portInterfaceName}';` : '// No ports to import'}

// Define your service logic here
export class ${serviceName} {
  constructor(
    ${options.port !== false ? `private readonly ${camelCasedPortName}: ${portInterfaceName}` : '// No port dependencies'}
  ) {}

  // Example service method
  // public async performAction(data: ${modelName}): Promise<ResultType> {
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
        const portDir = path.join(srcRoot, domainName, 'ports');
        createDir(portDir);
        
        const adapterType = options.adapterType || 'repository';
        const portNameBase = options.portName || 
          `${modelName}${adapterType.charAt(0).toUpperCase() + adapterType.slice(1)}Port`;
        const portName = formatName(portNameBase);
        
        const portFile = path.join(portDir, `${portName}.ts`);
        const portContent = `import { ${modelName} } from '../models/${modelName}';

// Define your port interface here
export interface ${portName} {
  // Example methods
  // findById(id: string): Promise<${modelName} | null>;
  // save(data: ${modelName}): Promise<${modelName}>;
}`;
        tree.create(portFile, portContent);
        console.log(`Created port file: ${portFile}`);
        
        // 4. Create the adapter file
        const adapterDir = path.join(srcRoot, 'infra', adapterType);
        createDir(adapterDir);
        
        const adapterNameBase = options.adapterName || 
          `${modelName}${adapterType.charAt(0).toUpperCase() + adapterType.slice(1)}Adapter`;
        const adapterName = formatName(adapterNameBase);
        
        const adapterFile = path.join(adapterDir, `${adapterName}.ts`);
        const adapterContent = `import { ${portName} } from '../../${domainName}/ports/${portName}';
import { ${modelName} } from '../../${domainName}/models/${modelName}';

// Define your adapter implementation here
export class ${adapterName} implements ${portName} {
  constructor() {
    // Initialize adapter (e.g., database connection, API client)
  }

  // Example implementation
  // async findById(id: string): Promise<${modelName} | null> {
  //   // Implementation details
  //   return new ${modelName}(...);
  // }
  //
  // async save(data: ${modelName}): Promise<${modelName}> {
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
