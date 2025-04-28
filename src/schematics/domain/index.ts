import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';

const { classify, camelize } = strings;

export default function (options: Schema): Rule {
  return async (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    const domainName = camelize(options.name);
    const modelNameRaw = classify(options.name); // Often the model name is derived from domain
    const adapterType = options.adapterType ?? 'repository';
    const basePath = options.path || '.'; // Use provided path or default
    const srcRoot = path.join(basePath, 'src'); // Define the source root

    const rules: Rule[] = [];

    // --- Model Generation ---
    if (options.model !== false) {
      const modelPath = path.join(srcRoot, domainName, 'models');
      const modelTemplateSource = apply(url('./files/model'), [
        applyTemplates({
          ...strings,
          name: modelNameRaw,
          modelName: modelNameRaw, // Adding modelName here to match template reference
        }),
        move(modelPath),
      ]);
      rules.push(mergeWith(modelTemplateSource));
    }

    // --- Port & Adapter Generation ---
    // Generate the port name and adapter name earlier so they can be used in the service too
    const portInterfaceName = options.port !== false ? `${modelNameRaw}${classify(adapterType)}Port` : 'any';
    const adapterName = `${modelNameRaw}${classify(adapterType)}Adapter`;
    const camelCasedPortName = options.port !== false ? camelize(portInterfaceName) : 'anyPort';

    // --- Service Generation ---
    if (options.service !== false) {
      const servicePath = path.join(srcRoot, domainName, 'services');
      const serviceName = `${modelNameRaw}Service`;
      
      // Define the port-related variables
      const portImports = options.port !== false 
        ? `import { ${portInterfaceName} } from '../ports/${portInterfaceName}';` 
        : '// No ports to import';
      const portDependencies = options.port !== false 
        ? `private readonly ${camelCasedPortName}: ${portInterfaceName}` 
        : '// No port dependencies';
      const modelImport = `import { ${modelNameRaw} } from '../models/${modelNameRaw}';`;
      
      const serviceTemplateSource = apply(url('./files/service'), [
        applyTemplates({
          ...strings,
          name: modelNameRaw,
          serviceName: serviceName,
          domainName: domainName,
          modelName: modelNameRaw,
          portInterfaceName: portInterfaceName,
          camelCasedPortName: camelCasedPortName,
          // Add the missing variables to the template context
          portImports: portImports,
          portDependencies: portDependencies,
          modelImport: modelImport
        }),
        move(servicePath),
      ]);
      rules.push(mergeWith(serviceTemplateSource));
    }

    // --- Port & Adapter Generation ---
    if (options.port !== false && adapterType !== 'none') {
      const portPath = path.join(srcRoot, domainName, 'ports');
      const adapterPath = path.join(srcRoot, 'infra', adapterType);

      // Port
      const portTemplateSource = apply(url('./files/port'), [
        applyTemplates({
          ...strings,
          portInterfaceName: portInterfaceName, // Use the generated port name
          name: modelNameRaw,
          modelName: modelNameRaw // Adding modelName here for consistency
        }),
        move(portPath),
      ]);
      rules.push(mergeWith(portTemplateSource));

      // Adapter
      const adapterTemplateSource = apply(url('./files/adapter'), [
        applyTemplates({
          ...strings,
          adapterName: adapterName,
          portInterfaceName: portInterfaceName,
          name: modelNameRaw,
          modelName: modelNameRaw, // Adding modelName here for consistency
          domainName: domainName
        }),
        move(adapterPath),
      ]);
      rules.push(mergeWith(adapterTemplateSource));
    }

    return chain(rules);
  };
}
