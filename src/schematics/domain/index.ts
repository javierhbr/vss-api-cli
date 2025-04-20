import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext, Source, 
  MergeStrategy
} from '@angular-devkit/schematics';
import { Schema as DomainOptions } from './schema';
import * as path from 'path';
import * as fs from 'fs-extra';

const { classify, camelize } = strings;

// Helper to generate a specific part (model, port, adapter, service)
function generatePart(options: DomainOptions, part: 'model' | 'port' | 'adapter' | 'service', context: SchematicContext): Source {
  const domainName = camelize(options.name);
  const pascalName = classify(options.name);
  
  // NEW APPROACH: Handle the output directory path explicitly
  const outputPath = options.path || '.';
  
  // Ensure the output directory exists
  if (options.path) {
    const dirPath = path.resolve(process.cwd(), options.path);
    if (!fs.existsSync(dirPath)) {
      context.logger.info(`Creating output directory: ${dirPath}`);
      fs.mkdirpSync(dirPath);
    }
  }
  
  // Always place files under 'src' within the output path
  const srcPath = path.join(outputPath, 'src');
  const domainPath = path.join(srcPath, domainName);
  const adapterType = options.adapterType ?? 'repository';

  // Get custom component names or use defaults
  const customModelName = options.modelName ? classify(options.modelName) : pascalName;
  const customServiceName = options.serviceName ? classify(options.serviceName) : `${pascalName}Service`;
  const customPortName = options.portName ? classify(options.portName) : `${pascalName}${classify(adapterType)}Port`;
  const customAdapterName = options.adapterName ? classify(options.adapterName) : `${pascalName}${classify(adapterType)}Adapter`;

  let templatePath = '';
  let targetPath = '';
  let templateOptions: Record<string, any> = { ...strings, name: options.name };

  switch (part) {
    case 'model':
      templatePath = './files/model';
      targetPath = path.join(domainPath, 'models');
      templateOptions = { ...templateOptions, modelName: customModelName };
      break;
    case 'port':
      templatePath = './files/port';
      targetPath = path.join(domainPath, 'ports');
      templateOptions = { 
        ...templateOptions, 
        portName: customPortName, 
        portInterfaceName: customPortName // Using the custom port name
      };
      break;
    case 'adapter':
      templatePath = './files/adapter';
      // Place adapters under src/infra
      targetPath = path.join(srcPath, 'infra', adapterType);
      templateOptions = { 
        ...templateOptions, 
        adapterName: customAdapterName, 
        portName: customPortName, 
        domainName: domainName 
      };
      break;
    case 'service':
      const servicePortName = customPortName.replace(/Port$/, ''); // Remove 'Port' suffix if present
      const servicePortVariableName = camelize(servicePortName);
      templatePath = './files/service';
      targetPath = path.join(domainPath, 'services');
      templateOptions = {
        ...templateOptions,
        serviceName: customServiceName,
        portImports: options.port && adapterType !== 'none' ? `import { ${customPortName} } from '../ports/${customPortName}';` : '',
        portDependencies: options.port && adapterType !== 'none' ? `private readonly ${servicePortVariableName}Port: ${customPortName}` : '',
        modelImport: options.model ? `import { ${customModelName} } from '../models/${customModelName}';` : '',
        modelName: options.model ? customModelName : 'any',
        portName: options.port && adapterType !== 'none' ? `${servicePortVariableName}Port` : 'examplePort',
      };
      break;
    default:
      throw new SchematicsException(`Unknown domain part: ${part}`);
  }

  // Enhanced debug logging for file generation
  context.logger.info(`Generating ${part} files in: ${targetPath}`);

  return apply(url(templatePath), [
    applyTemplates(templateOptions),
    move(targetPath),
  ]);
}

export default function (options: DomainOptions): Rule {
  return (_tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    // Debug log for incoming options
    context.logger.info(`Domain schematic options: ${JSON.stringify(options)}`);
    
    const rules: Rule[] = [];

    // Determine which components to create based on options or defaults
    const createModel = options.model ?? true;
    const createService = options.service ?? true;
    const createPort = options.port ?? true;
    const adapterType = options.adapterType ?? 'repository';
    const createAdapter = createPort && adapterType !== 'none';

    if (createModel) {
      // Apply Overwrite strategy
      rules.push(mergeWith(generatePart(options, 'model', context), MergeStrategy.Overwrite)); 
    }
    if (createPort) {
      // Apply Overwrite strategy
      rules.push(mergeWith(generatePart(options, 'port', context), MergeStrategy.Overwrite)); 
    }
    if (createAdapter) {
      // Apply Overwrite strategy
      rules.push(mergeWith(generatePart(options, 'adapter', context), MergeStrategy.Overwrite)); 
    }
    if (createService) {
      // Apply Overwrite strategy
      rules.push(mergeWith(generatePart(options, 'service', context), MergeStrategy.Overwrite)); 
      // Optional: Auto-wire (log message for now)
      context.logger.info(`Consider wiring '${classify(options.name)}Service' in your dependency injection setup.`);
    }

    return chain(rules);
  };
}
