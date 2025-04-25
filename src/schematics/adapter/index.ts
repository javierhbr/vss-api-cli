import {
  Rule,
  SchematicContext,
  Tree
} from '@angular-devkit/schematics';
import { strings } from '@angular-devkit/core';
import { AdapterSchema } from './schema';

export default function (options: AdapterSchema): Rule {
  return (tree: Tree, context: SchematicContext) => {
    // Normalize adapter name and options
    const adapterName = strings.classify(options.name);
    const adapterType = strings.classify(options.adapterType);
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

    // Create the adapter file directly
    const adapterFilename = `${strings.dasherize(adapterName)}${strings.classify(options.adapterType)}Adapter.ts`;
    const adapterPath = `${adapterDir}/${adapterFilename}`;
    
    // Check if adapter file already exists
    if (tree.exists(adapterPath)) {
      context.logger.warn(`\x1b[33mAdapter file already exists: ${adapterPath}\x1b[0m`);
      context.logger.info('\x1b[36mYou can use a different name or path.\x1b[0m');
      return tree;
    }
    
    const adapterContent = `import { ${portName} } from '../../${domain}/ports/${portName}';

export class ${adapterName}${adapterType}Adapter implements ${portName} {
  constructor() {}

  // Implement all methods required by the ${portName} interface
  // Example implementation methods:
  /*
  async findById(id: string): Promise<any> {
    // Implementation details...
  }
  
  async save(entity: any): Promise<any> {
    // Implementation details...
  }
  */
}
`;

    // Create the directory if it doesn't exist
    const dir = adapterDir.split('/');
    let currentPath = '';
    
    // Safely create directories
    try {
      for (const segment of dir) {
        currentPath = currentPath ? `${currentPath}/${segment}` : segment;
        if (!tree.exists(currentPath)) {
          // Use mkdir instead of creating .gitkeep files
          tree.create(currentPath + '/.gitkeep', '');
        }
      }
    } catch (error) {
      // Directory already exists, continue
    }

    // Create the adapter file
    try {
      tree.create(adapterPath, adapterContent);
      context.logger.info(`\x1b[32mGenerated adapter ${adapterName}${adapterType}Adapter in ${adapterPath}\x1b[0m`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      context.logger.error(`\x1b[31mCouldn't create adapter file: ${errorMessage}\x1b[0m`);
    }

    return tree;
  };
}