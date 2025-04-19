import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext, Source
} from '@angular-devkit/schematics';
import { Schema as DomainOptions } from './schema'; // Make sure schema.d.ts is generated or manually created
import * as path from 'path';

const { classify, camelize } = strings;

// Helper to generate a specific part (model, port, adapter, service)
function generatePart(options: DomainOptions, part: 'model' | 'port' | 'adapter' | 'service'): Source {
  const domainName = camelize(options.name);
  const pascalName = classify(options.name);
  const domainPath = options.path ?? `src/${domainName}`;
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
      targetPath = path.join('src', 'infra', adapterType);
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

  return apply(url(templatePath), [
    applyTemplates(templateOptions),
    move(targetPath),
  ]);
}

export default function (options: DomainOptions): Rule {
  return async (_tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    const rules: Rule[] = [];

    // Determine which components to create based on options or defaults
    const createModel = options.model ?? true;
    const createService = options.service ?? true;
    const createPort = options.port ?? true;
    const adapterType = options.adapterType ?? 'repository';
    const createAdapter = createPort && adapterType !== 'none';

    if (createModel) {
      rules.push(mergeWith(generatePart(options, 'model')));
    }
    if (createPort) {
        rules.push(mergeWith(generatePart(options, 'port')));
    }
    if (createAdapter) {
        rules.push(mergeWith(generatePart(options, 'adapter')));
    }
    if (createService) {
      rules.push(mergeWith(generatePart(options, 'service')));
      // Optional: Auto-wire (log message for now)
      context.logger.info(`Consider wiring '${classify(options.name)}Service' in your dependency injection setup.`);
    }

    return chain(rules);
  };
}
