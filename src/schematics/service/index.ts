import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema as ServiceOptions } from './schema';
import * as path from 'path';

const { classify, camelize } = strings;

export default function (options: ServiceOptions): Rule {
  return async (tree: Tree, context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }
    if (!options.domain) {
      throw new SchematicsException('Option (domain) is required.');
    }

    const serviceNameRaw = options.name;
    const domainName = camelize(options.domain);
    const basePath = options.path || '.'; // Use provided path or default
    const srcRoot = path.join(basePath, 'src'); // Define the source root
    const servicePath = path.join(srcRoot, domainName, 'services'); // Target path relative to srcRoot

    const serviceName = `${classify(serviceNameRaw)}Service`;

    const templateSource = apply(url('./files'), [
      applyTemplates({
        ...strings,
        name: serviceNameRaw,
        serviceName: serviceName,
        domainName: domainName,
        // Add other template variables if needed
      }),
      move(servicePath), // Move to the correct path under srcRoot
    ]);

    // Check if domain exists (optional)
    const domainCheckPath = path.join(srcRoot, domainName);
    if (!tree.exists(domainCheckPath)) {
        context.logger.warn(`Domain '${domainName}' might not exist or is empty within '${srcRoot}'. Creating service anyway.`);
    }

    return chain([
      mergeWith(templateSource)
    ]);
  };
}