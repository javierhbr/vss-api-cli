import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url
} from '@angular-devkit/schematics';
import { Schema as ServiceOptions } from './schema';
import * as path from 'path';

export default function (options: ServiceOptions): Rule {
  if (!options.name) {
    throw new SchematicsException('Option (name) is required.');
  }

  const name = options.name;
  const domainName = options.domain || options.name.toLowerCase();
  
  // Properly handle base path - use options.path if provided
  const basePath = options.path || '';
  const targetPath = path.join(basePath, `src/${domainName}/services`);

  const templateSource = apply(url('./files'), [
    applyTemplates({
      ...strings, // Provides dasherize, classify, camelize, etc.
      name: name,
      serviceName: `${strings.classify(name)}Service`,
      modelName: options.model ? strings.classify(name) : 'any',
      modelImport: options.model ? `import { ${strings.classify(name)} } from '../models/${strings.classify(name)}';` : '',
      portImports: options.ports ? `// Import your port interfaces here\n// Example: import { ${strings.classify(name)}Port } from '../ports/${strings.classify(name)}Port';` : '',
      portDependencies: options.ports ? `// Inject your port dependencies here\n    // Example: private readonly ${strings.camelize(name)}Port: ${strings.classify(name)}Port` : '',
    }),
    move(targetPath),
  ]);

  return chain([
    mergeWith(templateSource)
  ]);
}