import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import { normalizePath } from '../utils/configUtils';

// Importing strings directly from Angular DevKit to ensure compatibility
const { classify, dasherize, camelize, underscore } = strings;

// Helper to process directory templates
function processTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key] || '');
}

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
      if (!name) return '';
      
      switch (fileNameCase) {
        case 'camel':
          return camelize(name);
        case 'kebab':
          return dasherize(name);
        case 'snake':
          return underscore(name);
        case 'pascal':
        default:
          return classify(name);
      }
    };
    
    // Format name for class declarations - always PascalCase
    const formatClassName = (name: string): string => {
      return classify(name || '');
    };
    
    const domainName = camelize(options.name);
    const modelName = formatName(options.name);
    const classModelName = formatClassName(options.name); // For the class declaration
    
    // Set defaults for options
    options.model = options.model !== false; // Default true
    options.service = options.service !== false; // Default true
    options.port = options.port !== false; // Default true
    options.adapterType = options.adapterType || 'repository';
    
    // Format names for service, port and adapter
    const serviceName = formatName(options.serviceName || options.name);
    const portName = formatName(options.portName || options.name);
    const adapterName = formatName(options.adapterName || options.name);
    
    // Set up default config structure
    const defaultConfig = {
      directories: {
        base: '{{domainName}}',
        model: '{{domainName}}/models',
        service: '{{domainName}}/services',
        port: '{{domainName}}/ports'
      },
      filePatterns: {
        modelFile: '{{pascalName}}.ts',
        serviceFile: '{{pascalName}}Service.ts',
        portFile: '{{pascalName}}{{adapterType}}Port.ts',
        adapterFile: '{{pascalName}}{{adapterType}}Adapter.ts'
      },
      basePath: 'src'
    };
    
    // Ensure we have a valid config object with all the required properties
    const userConfig = (options as any)._config || {};
    const config = {
      ...defaultConfig,
      ...userConfig,
      directories: {
        ...defaultConfig.directories,
        ...(userConfig.directories || {})
      },
      filePatterns: {
        ...defaultConfig.filePatterns,
        ...(userConfig.filePatterns || {})
      }
    };
    
    // Ensure srcRoot is a relative path without leading slash
    let configBasePath = config.basePath || 'src';
    if (configBasePath.startsWith('/')) {
      configBasePath = configBasePath.substring(1);
    }
    
    const srcRoot = normalizePath(configBasePath); // Just use the relative path directly

    console.log(`Using name: ${options.name}`);
    console.log(`Using formatted filename: ${modelName}`);
    console.log(`Using class name: ${classModelName}`);
    console.log(`Using src root: ${srcRoot}`);

    // Create all directories using the tree but not .gitkeep files
    // which can cause path conflicts with system directories
    return (tree: Tree) => {
      // Helper function to create a directory without .gitkeep files
      const createDir = (dirPath: string) => {
        // Make sure path is relative (no leading slash)
        const normalizedPath = dirPath.startsWith('/') ? dirPath.substring(1) : dirPath;
        // Directories are implicitly created when files are added
        console.log(`Ensuring directory: ${normalizedPath}`);
        return normalizedPath;
      };
      
      // Helper to normalize paths
      const normalizePath = (filePath: string): string => {
        return filePath.startsWith('/') ? filePath.substring(1) : filePath;
      };
      
      // 1. Create the model file
      if (options.model !== false) {
        let modelFile: string;
        
        // Use custom file path if provided, otherwise build from config
        if (options.modelFilePath) {
          modelFile = normalizePath(options.modelFilePath);
          createDir(path.dirname(modelFile));
        } else {
          // Determine model directory from config
          const modelDir = processTemplate(config.directories?.model || `${domainName}/models`, 
            { domainName, adapterType: options.adapterType || 'repository' });
          const dir = path.join(normalizePath(srcRoot), modelDir);
          const normalizedDir = createDir(dir);
          
          // Determine model file name from config
          const modelPattern = config.filePatterns?.modelFile || '{{pascalName}}.ts';
          const fileName = processTemplate(modelPattern, 
            { pascalName: classModelName, dashName: dasherize(modelName) });
          
          modelFile = path.join(normalizedDir, fileName);
        }
        
        // Create the model file with basic domain entity structure
        const modelContent = `/**
 * Domain model for ${classModelName}
 */
export class ${classModelName} {
  // Define your model properties here
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
        let serviceFile: string;
        
        // Use compound name formatting for service file
        const serviceBaseName = options.serviceName || options.name;
        const serviceSuffix = 'Service';
        // We don't use serviceFileName directly, it's just for debug purposes
        // const serviceFileName = formatCompoundFileName(serviceBaseName, serviceSuffix);
        const serviceClassName = formatClassName(serviceBaseName + serviceSuffix);
        
        // Use custom file path if provided, otherwise build from config
        if (options.serviceFilePath) {
          serviceFile = normalizePath(options.serviceFilePath);
          createDir(path.dirname(serviceFile));
        } else {
          // Determine service directory from config
          const serviceDir = processTemplate(config.directories?.service || `${domainName}/services`, 
            { domainName, adapterType: options.adapterType || 'repository' });
          const dir = path.join(normalizePath(srcRoot), serviceDir);
          const normalizedDir = createDir(dir);
          
          // Determine service file name from config
          const servicePattern = config.filePatterns?.serviceFile || '{{pascalName}}Service.ts';
          const fileName = processTemplate(servicePattern, 
            { pascalName: classify(serviceName) });
          
          serviceFile = path.join(normalizedDir, fileName);
        }
        
        // Create the service file with basic service structure
        const serviceContent = `/**
 * Domain service for ${classModelName}
 */
import { ${classModelName} } from '../models/${dasherize(modelName)}';

export class ${serviceClassName} {
  constructor(
    // Inject ports/adapters here
    // private readonly ${camelize(options.name)}Repository: I${classify(options.name)}Repository,
  ) {}

  // Define your service methods here
  // Example:
  // public async findById(id: string): Promise<${classModelName}> {
  //   return this.${camelize(options.name)}Repository.findById(id);
  // }

  // public async create(${camelize(options.name)}: ${classModelName}): Promise<${classModelName}> {
  //   return this.${camelize(options.name)}Repository.save(${camelize(options.name)});
  // }
}`;
        tree.create(serviceFile, serviceContent);
        console.log(`Created service file: ${serviceFile}`);
      }
      
      // 3. Create the port file (repository interface)
      if (options.port !== false) {
        let portFile: string;
        
        // Use compound name formatting for port file
        const portBaseName = options.portName || options.name;
        // We calculate the port class name directly with the adapter type
        const portClassName = `I${formatClassName(portBaseName)}${classify(options.adapterType || 'repository')}Port`;
        
        // Use custom file path if provided, otherwise build from config
        if (options.portFilePath) {
          portFile = normalizePath(options.portFilePath);
          createDir(path.dirname(portFile));
        } else {
          // Determine port directory from config
          const portDir = processTemplate(config.directories?.port || `${domainName}/ports`, 
            { domainName, adapterType: options.adapterType || 'repository' });
          const dir = path.join(normalizePath(srcRoot), portDir);
          const normalizedDir = createDir(dir);
          
          // Determine port file name from config
          const portPattern = config.filePatterns?.portFile || 
            `{{pascalName}}${classify(options.adapterType || 'repository')}Port.ts`;
          const fileName = processTemplate(portPattern, 
            { pascalName: classify(portName), adapterType: options.adapterType || 'repository' });
          
          portFile = path.join(normalizedDir, fileName);
        }
        
        // Create the port file with repository interface
        const portContent = `/**
 * Port interface for ${classify(options.adapterType || 'repository')} operations
 */
import { ${classModelName} } from '../models/${dasherize(modelName)}';

export interface ${portClassName} {
  // Define your repository methods here
  // findById(id: string): Promise<${classModelName}>;
  // save(${camelize(options.name)}: ${classModelName}): Promise<${classModelName}>;
}`;
        tree.create(portFile, portContent);
        console.log(`Created port file: ${portFile}`);
      }
      
      // 4. Create an adapter implementation
      let adapterFile: string;
      
      // Use compound name formatting for adapter file
      const adapterBaseName = options.adapterName || options.name;
      // Calculate adapter class name directly
      const adapterClassName = `${formatClassName(adapterBaseName)}${classify(options.adapterType || 'repository')}Adapter`;
      
      // Use custom file path if provided, otherwise build from config
      if (options.adapterFilePath) {
        adapterFile = normalizePath(options.adapterFilePath);
        createDir(path.dirname(adapterFile));
      } else {
        // Determine adapter directory from config
        const adapterDir = processTemplate(config.directories?.adapter?.base || `infra/${options.adapterType || 'repository'}`, 
          { domainName, adapterType: options.adapterType || 'repository' });
        const dir = path.join(normalizePath(srcRoot), adapterDir);
        const normalizedDir = createDir(dir);
        
        // Determine adapter file name from config
        const adapterPattern = config.filePatterns?.adapterFile || 
          `{{pascalName}}${classify(options.adapterType || 'repository')}Adapter.ts`;
        const fileName = processTemplate(adapterPattern, 
          { pascalName: classify(adapterName), adapterType: options.adapterType || 'repository' });
        
        adapterFile = path.join(normalizedDir, fileName);
      }
      
      // Create the adapter file with repository implementation
      const adapterContent = `/**
 * Adapter implementation for ${classify(options.adapterType || 'repository')} operations
 */
import { ${classModelName} } from '../../${domainName}/models/${dasherize(modelName)}';
import { I${classify(options.name)}${classify(options.adapterType || 'repository')}Port } from '../../${domainName}/ports/${dasherize(options.name + (options.adapterType || 'repository'))}-port';

export class ${adapterClassName} implements I${classify(options.name)}${classify(options.adapterType || 'repository')}Port {
  constructor(
    // Inject infrastructure dependencies here
    // private readonly dataSource: DataSource,
  ) {}

  // Implement the port interface methods here
  // Example:
  // async findById(id: string): Promise<${classModelName}> {
  //   // Fetch from database or other storage
  //   const entity = await this.dataSource.findOne(id);
  //   // Map from infrastructure entity to domain model
  //   return new ${classModelName}(entity.id, entity.name);
  // }

  // async save(${camelize(options.name)}: ${classModelName}): Promise<${classModelName}> {
  //   // Map from domain model to infrastructure entity
  //   const entity = { id: ${camelize(options.name)}.id, name: ${camelize(options.name)}.name };
  //   // Save to database
  //   const saved = await this.dataSource.save(entity);
  //   // Map back to domain model
  //   return new ${classModelName}(saved.id, saved.name);
  // }
}`;
      tree.create(adapterFile, adapterContent);
      console.log(`Created adapter file: ${adapterFile}`);
      
      return tree;
    };
  };
}
