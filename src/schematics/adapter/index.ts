import {
  Rule,
  SchematicContext,
  Tree
} from '@angular-devkit/schematics';
import * as path from 'path';
import { strings } from '@angular-devkit/core';
import { AdapterSchema } from './schema';

export default function (options: AdapterSchema): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    // Normalize adapter name
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

    // Generate the adapter file
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

    // Prepare adapter file output path
    const adapterFilePath = path.join(adapterDir, `${strings.dasherize(adapterName)}${adapterType}Adapter.ts`);

    // Check if directory exists, if not create it
    const dirPath = path.dirname(adapterFilePath);
    if (!tree.exists(dirPath)) {
      tree.create(dirPath, '');
    }

    // Create the adapter file
    tree.create(adapterFilePath, adapterContent);

    context.logger.info(`Generated adapter at ${adapterFilePath}`);
    return tree;
  };
}