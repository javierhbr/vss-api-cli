import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  filter, mergeWith, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import { normalizePath } from '../utils/configUtils';

/**
 * Process template variables in config strings
 */
function processTemplate(template: string, vars: Record<string, string>): string {
  if (!template) return '';
  return template.replace(/\{\{([^}]+)\}\}/g, (_, key) => vars[key] || '');
}

export default function (options: Schema): Rule {
  return async (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    const handlerName = options.name;
    
    // Get config from options (injected by runSchematic) or use defaults
    const defaultConfig = {
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

    // Ensure we have a valid config object with all the required properties
    const config = {
      ...defaultConfig,
      ...(options._config || {}),
      filePatterns: {
        ...defaultConfig.filePatterns,
        ...(options._config?.filePatterns || {})
      },
      directories: {
        ...defaultConfig.directories,
        ...(options._config?.directories || {})
      }
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
    // Make sure basePath is relative (remove any leading slash)
    const configBasePath = config.basePath.startsWith('/') ? config.basePath.substring(1) : config.basePath;
    
    // All paths should be constructed as relative paths (no leading slashes)
    const srcRoot = normalizePath(configBasePath);
    const handlerDir = processTemplate(config.directories?.base || 'handlers', templateVars);
    
    // Create relative paths for handlers and schemas
    const handlerPath = path.join(normalizePath(srcRoot), handlerDir);
    
    // For schemas directory, use config or default
    const schemaDir = config.directories?.schema ? 
      processTemplate(config.directories.schema, templateVars) : 
      path.join(handlerDir, 'schemas');
    const dtoSchemasPath = path.join(normalizePath(srcRoot), schemaDir);
    
    console.log(`Handler path: ${handlerPath}`);
    console.log(`DTO/Schema path: ${dtoSchemasPath}`);
    
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
    
    // Make sure we have these properties defined even if undefined in options
    if (options.createRequestDto === undefined) {
      options.createRequestDto = false;
    }
    if (options.createResponseDto === undefined) {
      options.createResponseDto = false;
    }

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
              // Ensure the path is relative (no leading slash)
              const relativePath = options.handlerFilePath.startsWith('/') ? 
                options.handlerFilePath.substring(1) : options.handlerFilePath;
              entry.path = relativePath;
            } else {
              // Ensure handlerPath is relative (no leading slash)
              const relativePath = handlerPath.startsWith('/') ? 
                handlerPath.substring(1) : handlerPath;
              entry.path = path.join(relativePath, handlerFileName);
            }
          } 
          else if (pathWithoutExtension.endsWith('schema.ts')) {
            // Use custom file path if provided, otherwise build from config
            if (options.schemaFilePath) {
              // Ensure the path is relative (no leading slash)
              const relativePath = options.schemaFilePath.startsWith('/') ? 
                options.schemaFilePath.substring(1) : options.schemaFilePath;
              entry.path = relativePath;
            } else {
              // Ensure path is relative (no leading slash)
              const relativePath = dtoSchemasPath.startsWith('/') ? 
                dtoSchemasPath.substring(1) : dtoSchemasPath;
              entry.path = path.join(relativePath, schemaFileName);
            }
          }
          else if (pathWithoutExtension.endsWith('dto.ts')) {
            // Use custom file path if provided, otherwise build from config
            if (options.dtoFilePath) {
              // Ensure the path is relative (no leading slash)
              const relativePath = options.dtoFilePath.startsWith('/') ? 
                options.dtoFilePath.substring(1) : options.dtoFilePath;
              entry.path = relativePath;
            } else {
              // Ensure path is relative (no leading slash)
              const relativePath = dtoSchemasPath.startsWith('/') ? 
                dtoSchemasPath.substring(1) : dtoSchemasPath;
              entry.path = path.join(relativePath, dtoFileName);
            }
          }
          
          return entry;
        }
      ]
    );
    
    // Create handler file with proper naming case
    return chain([
      // Create directories if they don't exist - ensure paths are relative!
      (tree: Tree) => {
        [handlerPath, dtoSchemasPath].forEach(dirPath => {
          // Ensure dirPath is relative (no leading slash)
          const normalizedPath = dirPath.startsWith('/') ? dirPath.substring(1) : dirPath;
          
          // Just log directory creation - don't create .gitkeep files
          if (!tree.exists(normalizedPath)) {
            console.log(`Ensuring directory exists: ${normalizedPath}`);
            // We don't need to create .gitkeep files
            // console.log(`Ensuring directory exists: ${normalizePath(dirPath)}`);
          }
        });
        return tree;
      },
      // Merge the template source to create the files
      mergeWith(templateSource)
    ]);
  };
}
