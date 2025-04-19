import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema as PortOptions } from './schema'; // Make sure schema.d.ts is generated
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

    const portName = `${classify(portNameRaw)}Port`; // e.g., UserFinderPort
    const adapterName = `${classify(portNameRaw)}Adapter`; // e.g., UserFinderAdapter

    const domainPath = `src/${domainName}`;
    const infraPath = `src/infra/${adapterType}`;

    // --- Port Interface Generation ---
    const portTemplateSource = apply(url('../domain/files/port'), [ // Reuse domain's port template
      applyTemplates({
        ...strings,
        name: portNameRaw, // Pass the raw name for potential use
        portName: portName, // Pass the generated interface name
        portInterfaceName: portName, // Keep consistent with domain schematic template vars
      }),
      move(path.join(domainPath, 'ports')),
    ]);

    // --- Adapter Implementation Generation ---
    const adapterTemplateSource = apply(url('../domain/files/adapter'), [ // Reuse domain's adapter template
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
    if (!tree.exists(path.join(domainPath, 'models')) && !tree.exists(path.join(domainPath, 'services'))) {
        context.logger.warn(`Domain '${domainName}' might not exist or is empty. Creating port/adapter anyway.`);
    }

    return chain([
      mergeWith(portTemplateSource),
      mergeWith(adapterTemplateSource)
    ]);
  };
}
