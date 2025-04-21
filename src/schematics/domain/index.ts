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
        }),
        move(modelPath),
      ]);
      rules.push(mergeWith(modelTemplateSource));
    }

    // --- Service Generation ---
    if (options.service !== false) {
      const servicePath = path.join(srcRoot, domainName, 'services');
      const serviceName = `${modelNameRaw}Service`;
      const serviceTemplateSource = apply(url('./files/service'), [
        applyTemplates({
          ...strings,
          name: modelNameRaw,
          serviceName: serviceName,
          domainName: domainName,
          // Assuming port name follows a pattern if needed
          portName: options.port !== false ? `${modelNameRaw}${classify(adapterType)}Port` : 'any' // Placeholder if port exists
        }),
        move(servicePath),
      ]);
      rules.push(mergeWith(serviceTemplateSource));
    }

    // --- Port & Adapter Generation ---
    if (options.port !== false && adapterType !== 'none') {
      const portName = `${modelNameRaw}${classify(adapterType)}Port`;
      const adapterName = `${modelNameRaw}${classify(adapterType)}Adapter`;
      const portPath = path.join(srcRoot, domainName, 'ports');
      const adapterPath = path.join(srcRoot, 'infra', adapterType);

      // Port
      const portTemplateSource = apply(url('./files/port'), [
        applyTemplates({
          ...strings,
          portInterfaceName: portName, // Use the generated port name
          name: modelNameRaw
        }),
        move(portPath),
      ]);
      rules.push(mergeWith(portTemplateSource));

      // Adapter
      const adapterTemplateSource = apply(url('./files/adapter'), [
        applyTemplates({
          ...strings,
          adapterName: adapterName,
          portInterfaceName: portName,
          name: modelNameRaw,
          domainName: domainName
        }),
        move(adapterPath),
      ]);
      rules.push(mergeWith(adapterTemplateSource));
    }

    return chain(rules);
  };
}
