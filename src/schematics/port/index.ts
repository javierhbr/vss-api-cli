import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext, filter
} from '@angular-devkit/schematics';
import { PortOptions } from './schema'; // Changed from Schema as PortOptions
import * as path from 'path';

// Removed unused dasherize
const { classify, camelize } = strings;

// Helper function to ensure suffix
function ensureSuffix(name: string, suffix: string): string {
  return name.endsWith(suffix) ? name : name + suffix;
}

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

    // Determine the final port interface name, ensuring 'Port' suffix
    let finalPortName: string;
    if (options.portInterfaceName) {
      finalPortName = ensureSuffix(classify(options.portInterfaceName), 'Port');
    } else {
      finalPortName = `${classify(portNameRaw)}Port`; // Default naming
    }

    // Generate adapter name including the adapter type
    const adapterName = `${classify(portNameRaw)}${classify(adapterType)}Adapter`; // e.g., UserFinderRepositoryAdapter, LegacyPaymentQueueAdapter

    const domainPath = path.join(basePath, `src/${domainName}`);
    const infraPath = path.join(basePath, `src/infra/${adapterType}`);

    // --- Port Interface Generation ---
    const portTemplateSource = apply(url('./files'), [
      // Filter to only include port template file
      filter(path => path.includes('__portName@classify__')), // Template filename uses placeholder
      applyTemplates({
        ...strings,
        name: portNameRaw, // Pass the raw name for potential use
        portName: finalPortName, // Pass the final generated interface name
      }),
      // Move to the target directory. applyTemplates handles renaming based on filename placeholders.
      move(path.join(domainPath, 'ports')),
    ]);

    // --- Adapter Implementation Generation ---
    const adapterTemplateSource = apply(url('./files'), [
      // Filter to only include adapter template file
      filter(path => path.includes('__adapterName@classify__')), // Template filename uses placeholder
      applyTemplates({
        ...strings,
        name: portNameRaw, // Pass the raw name
        adapterName: adapterName, // Pass the final adapter name
        portName: finalPortName, // The interface it implements
        domainName: domainName,
      }),
       // Move to the target directory. applyTemplates handles renaming based on filename placeholders.
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
