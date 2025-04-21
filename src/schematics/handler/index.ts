import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  filter, mergeWith, move, noop, url, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';

// We don't need to destructure strings here as we're using the entire object in applyTemplates
export default function (options: Schema): Rule {
  return async (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    const handlerName = options.name;
    const basePath = options.path || '.'; // Use provided path or default to current directory
    const srcRoot = path.join(basePath, 'src'); // Define the source root
    const handlerPath = path.join(srcRoot, 'handlers'); // Target path relative to srcRoot

    const templateSource = apply(url('./files'), [
      // Only include schema file if schema option is true
      options.schema === false ? filter(path => !path.endsWith('Schema.ts.template')) : noop(),
      applyTemplates({
        ...strings,
        name: handlerName,
        // Add any other template variables needed
      }),
      move(handlerPath), // Move to the correct path under srcRoot
    ]);

    return chain([
      mergeWith(templateSource)
    ]);
  };
}
