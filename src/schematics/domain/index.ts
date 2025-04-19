import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext, Source, SchematicContext as Context
} from '@angular-devkit/schematics';
import { Schema as DomainOptions } from './schema';
import * as path from 'path';
import * as fs from 'fs-extra';

const { classify, camelize } = strings;

// Helper to generate a specific part (model, port, adapter, service)
function generatePart(options: DomainOptions, part: 'model' | 'port' | 'adapter' | 'service', context: Context): Source {
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

  let templatePath = '';
  let targetPath = '';
  let templateOptions: Record<string, any> = { ...strings, name: options.name };

  switch (part) {
    case 'model':
      templatePath = './files/model';
      targetPath = path.join(domainPath, 'models');
      templateOptions = { ...templateOptions, modelName: pascalName };
      break;
    case 'port':
      const portName = `${pascalName}${classify(adapterType)}`;
      const portInterfaceName = `${portName}Port`;
      templatePath = './files/port';
      targetPath = path.join(domainPath, 'ports');
      templateOptions = { ...templateOptions, portName: portInterfaceName, portInterfaceName: portInterfaceName }; // Pass both for flexibility
      break;
    case 'adapter':
      const adapterPortName = `${pascalName}${classify(adapterType)}`;
      const adapterPortInterfaceName = `${adapterPortName}Port`;
      const adapterName = `${adapterPortName}Adapter`;
      templatePath = './files/adapter';
      // Place adapters under src/infra
      targetPath = path.join(srcPath, 'infra', adapterType);
      templateOptions = { ...templateOptions, adapterName: adapterName, portName: adapterPortInterfaceName, domainName: domainName };
      break;
    case 'service':
      const serviceName = `${pascalName}Service`;
      const servicePortName = `${pascalName}${classify(adapterType)}`;
      const servicePortInterfaceName = `${servicePortName}Port`;
      const servicePortVariableName = `${camelize(servicePortName)}Port`;
      templatePath = './files/service';
      targetPath = path.join(domainPath, 'services');
      templateOptions = {
        ...templateOptions,
        serviceName: serviceName,
        portImports: options.port && adapterType !== 'none' ? `import { ${servicePortInterfaceName} } from '../ports/${servicePortInterfaceName}';` : '',
        portDependencies: options.port && adapterType !== 'none' ? `private readonly ${servicePortVariableName}: ${servicePortInterfaceName}` : '',
        modelImport: options.model ? `import { ${pascalName} } from '../models/${pascalName}';` : '',
        modelName: options.model ? pascalName : 'any',
        portName: options.port && adapterType !== 'none' ? servicePortVariableName : 'examplePort',
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
      rules.push(mergeWith(generatePart(options, 'model', context)));
    }
    if (createPort) {
      rules.push(mergeWith(generatePart(options, 'port', context)));
    }
    if (createAdapter) {
      rules.push(mergeWith(generatePart(options, 'adapter', context)));
    }
    if (createService) {
      rules.push(mergeWith(generatePart(options, 'service', context)));
      // Optional: Auto-wire (log message for now)
      context.logger.info(`Consider wiring '${classify(options.name)}Service' in your dependency injection setup.`);
    }

    return chain(rules);
  };
}
