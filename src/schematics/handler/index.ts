import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  filter, mergeWith, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';

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
      basePath: 'src',
      fileNameCase: 'pascal'
    };
    
    const { classify, dasherize, camelize } = strings;
    
    // Get file name case from options or config
    const fileNameCase = options.fileNameCase || config.fileNameCase || 'pascal';
    console.log(`Handler schematic using fileNameCase: ${fileNameCase}`);
    
    // Import utility functions for file name formatting
    const { toCamelCase, toPascalCase, toDasherize, toSnakeCase } = require('../../utils/fileUtils');
    
    // Format name based on fileNameCase config
    const formatName = (name: string): string => {
      switch (fileNameCase) {
        case 'camel':
          return toCamelCase(name);
        case 'kebab':
          return toDasherize(name);
        case 'snake':
          return toSnakeCase(name);
        case 'pascal':
        default:
          return toPascalCase(name);
      }
    };
    
    // Generate template variables
    const templateVars = {
      name: handlerName,
      pascalName: classify(handlerName),
      dashName: dasherize(handlerName),
      camelName: camelize(handlerName),
      domainName: options.serviceDomain || '',
      serviceName: options.serviceName || '',
      adapterType: '',
      formattedName: formatName(handlerName) // Add formatted name based on case
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
    
    // Process file names with template vars - format according to fileNameCase
    const handlerFileName = config.filePatterns?.handlerFile ? 
      processTemplate(config.filePatterns.handlerFile, templateVars) : 
      `${formatName(handlerName)}.handler.ts`;
      
    const schemaFileName = config.filePatterns?.schemaFile ?
      processTemplate(config.filePatterns.schemaFile, templateVars) :
      `${formatName(handlerName)}Schema.ts`;
    
    const dtoFileName = config.filePatterns?.dtoFile ? 
      processTemplate(config.filePatterns.dtoFile, templateVars) : 
      `${formatName(handlerName)}.dto.ts`;
    
    // Check if we need to create Zod DTOs
    const createDtos = options.createRequestDto || options.createResponseDto;
    
    // Source templates
    const templateSource = apply(
      // Use the 'files' directory for templates
      require('@angular-devkit/schematics').url('./files'), 
      [
        // Apply template variables (standard Angular schematic way)
        applyTemplates({
          ...strings,
          name: handlerName,
          validator: !options.noValidation, // Whether to include validation
          createRequestDto: options.createRequestDto, // Fix variable name to match template usage
          createResponseDto: options.createResponseDto,
          serviceDomain: options.serviceDomain || null,
          serviceName: options.serviceName || null
        }),
        filter(filePath => {
          // Filter out schema templates if we don't need them
          if (!options.schema && filePath.includes('schema.ts.template')) {
            return false;
          }
          // Filter out dto templates if we don't need them
          if (!createDtos && filePath.includes('dto.ts.template')) {
            return false;
          }
          return true;
        }),
        // Move templates to their target locations and handle naming conventions based on config
        (entry: any) => {
          const pathWithoutExtension = entry.path.replace('.template', '');
          
          if (pathWithoutExtension.endsWith('handler.ts')) {
            // Use custom file path if provided, otherwise build from config
            if (options.handlerFilePath) {
              entry.path = options.handlerFilePath;
            } else {
              entry.path = path.join(handlerPath, handlerFileName);
            }
          } 
          else if (pathWithoutExtension.endsWith('schema.ts')) {
            // Use custom file path if provided, otherwise build from config
            if (options.schemaFilePath) {
              entry.path = options.schemaFilePath;
            } else {
              entry.path = path.join(dtoSchemasPath, schemaFileName);
            }
          }
          else if (pathWithoutExtension.endsWith('dto.ts')) {
            // Use custom file path if provided, otherwise build from config
            if (options.dtoFilePath) {
              entry.path = options.dtoFilePath;
            } else {
              entry.path = path.join(dtoSchemasPath, dtoFileName);
            }
          }
          
          return entry;
        }
      ]
    );
    
    // Create handler file with proper naming case
    return chain([
      // Create directories if they don't exist
      (tree: Tree) => {
        [handlerPath, dtoSchemasPath].forEach(dirPath => {
          if (!tree.exists(dirPath)) {
            tree.create(`${dirPath}/.gitkeep`, '');
          }
        });
        return tree;
      },
      // Merge the template source to create the files
      mergeWith(templateSource)
    ]);
  };
}
