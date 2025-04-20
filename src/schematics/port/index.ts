import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext, filter
} from '@angular-devkit/schematics';
import { PortOptions } from './schema'; // Changed from Schema as PortOptions
import * as path from 'path';

// Removed unused dasherize
const { classify, camelize } = strings;

export default function (options: PortOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }
    if (!options.domain) {
        throw new SchematicsException('Option (domain) is required.');
    }

    const portNameRaw = options.name; // e.g., UserFinder
    const domainName = camelize(options.domain); // e.g., user
    const adapterType = options.adapterType ?? 'repository';
    
    // Handle custom output directory
    const basePath = options.path || '';

    // Use the custom port interface name if provided, otherwise use the default pattern
    const portName = options.portInterfaceName || `${classify(portNameRaw)}Port`; // e.g., UserFinderPort or custom name
    const adapterName = `${classify(portNameRaw)}Adapter`; // e.g., UserFinderAdapter

    const domainPath = path.join(basePath, `src/${domainName}`);
    const infraPath = path.join(basePath, `src/infra/${adapterType}`);

    // --- Port Interface Generation ---
    const portTemplateSource = apply(url('./files'), [
      // Filter to only include port template file
      filter(path => path.includes('__portName@classify__')),
      applyTemplates({
        ...strings,
        name: portNameRaw, // Pass the raw name for potential use
        portName: portName, // Pass the generated interface name
      }),
      move(path.join(domainPath, 'ports')),
    ]);

    // --- Adapter Implementation Generation ---
    const adapterTemplateSource = apply(url('./files'), [
      // Filter to only include adapter template file
      filter(path => path.includes('__adapterName@classify__')),
      applyTemplates({
        ...strings,
        name: portNameRaw, // Pass the raw name
        adapterName: adapterName,
        portName: portName, // The interface it implements
        domainName: domainName,
      }),
      move(infraPath),
    ]);

    // Check if domain exists (optional, but good practice)
    const domainModelsPath = path.join(domainPath, 'models');
    const domainServicesPath = path.join(domainPath, 'services');
    
    if (!tree.exists(domainModelsPath) && !tree.exists(domainServicesPath)) {
        context.logger.warn(`Domain '${domainName}' might not exist or is empty. Creating port/adapter anyway.`);
    }

    return chain([
      mergeWith(portTemplateSource),
      mergeWith(adapterTemplateSource)
    ]);
  };
}
