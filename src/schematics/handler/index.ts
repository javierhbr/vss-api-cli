import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  filter, mergeWith, move, noop, url, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Process template variables in config strings
 */
function processTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key] || '');
}

export default function (options: Schema): Rule {
  return async (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    const handlerName = options.name;
    const basePath = options.path || '.'; // Use provided path or default to current directory
    
    // Get config from options (injected by runSchematic) or use defaults
    const config = options._config || {
      filePatterns: {
        handlerFile: '{{dashName}}.handler.ts',
        schemaFile: '{{pascalName}}Schema.ts',
        dtoFile: '{{dashName}}.dto.ts'
      },
      directories: {
        base: 'handlers',
        schema: 'handlers/schemas'
      },
      basePath: 'src'
    };
    
    const { classify, dasherize, camelize } = strings;
    
    // Generate template variables
    const templateVars = {
      name: handlerName,
      pascalName: classify(handlerName),
      dashName: dasherize(handlerName),
      camelName: camelize(handlerName),
      domainName: options.serviceDomain || '',
      serviceName: options.serviceName || '',
      adapterType: ''
    };
    
    // Process directory paths with template vars - handle undefined by providing defaults
    const srcRoot = path.join(basePath, config.basePath);
    const handlerDir = processTemplate(config.directories?.base || 'handlers', templateVars);
    const handlerPath = path.join(srcRoot, handlerDir);
    
    // For schemas directory, use config or default
    const schemaDir = config.directories?.schema ? 
      processTemplate(config.directories.schema, templateVars) : 
      path.join(handlerDir, 'schemas');
    const dtoSchemasPath = path.join(srcRoot, schemaDir);
    
    // Process file names with template vars
    const dtoFileName = config.filePatterns?.dtoFile ? 
      processTemplate(config.filePatterns.dtoFile, templateVars) : 
      `${dasherize(handlerName)}.dto.ts`;
    
    // Check if we need to create Zod DTOs
    const createDtos = options.createRequestDto || options.createResponseDto;

    // Determine if we need to create a schemas directory
    const createSchemasDir = createDtos && !fs.existsSync(path.join(process.cwd(), dtoSchemasPath));

    // Define template source for handler and JSON schema (if requested)
    const handlerTemplateSource = apply(url('./files'), [
      // Only include JSON schema file if schema option is true and no DTOs requested
      options.schema === false ? filter(path => !path.endsWith('Schema.ts.template')) : noop(),
      applyTemplates({
        ...strings,
        name: handlerName,
        serviceDomain: options.serviceDomain || null,
        serviceName: options.serviceName || null,
        createRequestDto: options.createRequestDto || false,
        createResponseDto: options.createResponseDto || false,
        // Add any other template variables needed
      }),
      move(handlerPath), // Move to the correct path under srcRoot
    ]);

    // Rules to execute
    const rules: Rule[] = [
      mergeWith(handlerTemplateSource)
    ];
    
    // If we need to create Zod DTOs
    if (createDtos) {
      // Create a template for the DTO schema file
      const dtoContent = `// Generated Zod schema DTOs for ${handlerName} handler
import { z } from 'zod';

${options.createRequestDto ? `/**
 * Request DTO schema for ${handlerName}
 */
export const ${classify(handlerName)}RequestDto = z.object({
  // TODO: Define your request schema properties here
  // Example:
  // id: z.string().uuid(),
  // name: z.string().min(1).max(100),
});

export type ${classify(handlerName)}RequestDtoType = z.infer<typeof ${classify(handlerName)}RequestDto>;
` : ''}
${options.createResponseDto ? `/**
 * Response DTO schema for ${handlerName}
 */
export const ${classify(handlerName)}ResponseDto = z.object({
  // TODO: Define your response schema properties here
  // Example:
  // id: z.string().uuid(),
  // name: z.string(),
  // createdAt: z.string().datetime(),
});

export type ${classify(handlerName)}ResponseDtoType = z.infer<typeof ${classify(handlerName)}ResponseDto>;
` : ''}`;

      // Create a rule to write the DTO schema file
      const createDtoFile = (tree: Tree) => {
        // Ensure directory exists
        if (createSchemasDir) {
          tree.create(path.join(dtoSchemasPath, '.gitkeep'), '');
        }
        
        // Create the DTO schema file
        tree.create(path.join(dtoSchemasPath, dtoFileName), dtoContent);
        return tree;
      };
      
      rules.push(createDtoFile);
    }

    return chain(rules);
  };
}
