import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  filter, mergeWith, move, noop, url
} from '@angular-devkit/schematics';
import { Schema as HandlerOptions } from './schema'; // Assuming schema.d.ts will be created
import * as path from 'path';

// Removed unused dasherize
const { classify, camelize } = strings;

export default function (options: HandlerOptions): Rule {
  if (!options.name) {
    throw new SchematicsException('Option (name) is required.');
  }

  const name = options.name;
  // Properly handle base path - use options.path if provided
  const basePath = options.path || '';
  const targetPath = path.join(basePath, 'src/handlers');

  const templateSource = apply(url('./files'), [
    options.schema ? noop() : filter(path => !path.endsWith('Schema.ts.template')), // Filter out schema if not requested
    applyTemplates({
      ...strings, // Provides dasherize, classify, camelize, etc.
      name: name,
      handlerName: camelize(name),
      serviceName: camelize(name), // Assuming service name matches handler name for now
      schemaName: `${camelize(name)}Schema`,
      typeName: `${classify(name)}Payload`,
      domainName: 'unknown', // Placeholder - needs better logic if handler is domain-specific
    }),
    move(targetPath),
  ]);

  return chain([
    mergeWith(templateSource)
  ]);
}
