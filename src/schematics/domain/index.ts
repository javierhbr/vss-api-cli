import { strings } from '@angular-devkit/core';
import {
  Rule, SchematicsException, apply, applyTemplates, chain,
  mergeWith, move, url, Tree, SchematicContext
} from '@angular-devkit/schematics';
import { Schema } from './schema';
import * as path from 'path';
import { loadConfig } from '../../utils/configLoader';
import { toCamelCase, toPascalCase } from '../../utils/fileUtils';
import * as fs from 'fs';

const { camelize } = strings;

// Debug helper function to write logs to a file
function debugLog(message: string) {
  const logFile = path.join(process.cwd(), 'schematic-debug.log');
  fs.appendFileSync(logFile, message + '\n', { encoding: 'utf8' });
}

export default function (options: Schema): Rule {
  return async (_tree: Tree, _context: SchematicContext) => {
    if (!options.name) {
      throw new SchematicsException('Option (name) is required.');
    }

    // Get fileNameCase from options (passed from runSchematic) or load from config
    let fileNameCase = options.fileNameCase;
    if (!fileNameCase) {
      const config = loadConfig(options.path || '.');
      fileNameCase = config.fileNameCase || 'pascal';
    }
    
    console.log(`Domain schematic using fileNameCase: ${fileNameCase}`);
    console.log('Options received:', JSON.stringify(options, null, 2));
    
    // Write debug info to file
    debugLog(`Domain schematic executing with options: ${JSON.stringify(options, null, 2)}`);
    debugLog(`Using fileNameCase: ${fileNameCase}`);
    
    // Format name based on config
    const formatName = (name: string) => {
      return fileNameCase === 'camel' ? toCamelCase(name) : toPascalCase(name);
    };

    const domainName = camelize(options.name);
    
    // Use the custom model name if provided, otherwise use formatted domain name
    const modelNameBase = options.modelName || options.name;
    const modelNameRaw = formatName(modelNameBase);
    
    const adapterType = options.adapterType ?? 'repository';
    const basePath = options.path || '.'; // Use provided path or default
    const srcRoot = path.join(basePath, 'src'); // Define the source root

    debugLog(`Source root: ${srcRoot}`);
    debugLog(`Domain name: ${domainName}`);
    debugLog(`Model name: ${modelNameRaw}`);

    // Ensure the source directory exists
    try {
      fs.mkdirSync(srcRoot, { recursive: true });
      debugLog(`Created src directory at ${srcRoot}`);
    } catch (err) {
      debugLog(`Error creating src directory: ${err}`);
    }

    const rules: Rule[] = [];

    // --- Model Generation ---
    if (options.model !== false) {
      const modelPath = path.join(srcRoot, domainName, 'models');
      debugLog(`Model path: ${modelPath}`);
      
      // Use either the name or modelName template based on fileNameCase
      let templatePath = './files/model';
      
      // Custom rename function to handle file name format before moving
      const renameFile = (filePath: string) => {
        debugLog(`Renaming file: ${filePath}`);
        // Replace the template file name with the correctly cased model name
        if (filePath.includes('__name@classify__.ts')) {
          const newPath = filePath.replace('__name@classify__.ts', `${modelNameRaw}.ts`);
          debugLog(`Renamed to: ${newPath} (from classify)`);
          return newPath;
        }
        if (filePath.includes('__name__.ts')) {
          const newPath = filePath.replace('__name__.ts', `${modelNameRaw}.ts`);
          debugLog(`Renamed to: ${newPath} (from name)`);
          return newPath;
        }
        debugLog(`No rename needed for: ${filePath}`);
        return filePath;
      };
      
      // Create model directory structure manually
      try {
        fs.mkdirSync(path.join(srcRoot, domainName), { recursive: true });
        fs.mkdirSync(path.join(srcRoot, domainName, 'models'), { recursive: true });
        debugLog(`Created model directory structure: ${path.join(srcRoot, domainName, 'models')}`);
      } catch (err) {
        debugLog(`Error creating model directory: ${err}`);
      }
      
      const modelTemplateSource = apply(url(templatePath), [
        applyTemplates({
          ...strings,
          name: modelNameRaw,
          modelName: modelNameRaw, // Adding modelName here to match template reference
        }),
        // Add a custom rename function to handle file naming
        (tree, _) => {
          // Custom rename logic
          tree.visit((filePath, entry) => {
            debugLog(`Visiting file in tree: ${filePath}`);
            const newPath = renameFile(filePath);
            if (newPath !== filePath) {
              debugLog(`Creating renamed file: ${newPath}`);
              tree.create(newPath, entry ? entry.content : Buffer.from(''));
              tree.delete(filePath);
              debugLog(`Deleted original file: ${filePath}`);
            }
          });
          return tree;
        },
        move(modelPath),
      ]);
      
      debugLog(`Adding model rule to chain`);
      rules.push(mergeWith(modelTemplateSource));
    }

    // --- Port & Adapter Generation ---
    // Generate the port name and adapter name earlier so they can be used in the service too
    const capitalizedAdapterType = adapterType.charAt(0).toUpperCase() + adapterType.slice(1);
    
    // Use custom port name if provided, otherwise derive it with proper casing
    const portNameBase = options.portName || `${modelNameRaw}${capitalizedAdapterType}Port`;
    const portInterfaceName = options.port !== false ? formatName(portNameBase) : 'any';
    
    // Use custom adapter name if provided, otherwise derive it with proper casing
    const adapterNameBase = options.adapterName || `${modelNameRaw}${capitalizedAdapterType}Adapter`;
    const adapterName = formatName(adapterNameBase);
    
    const camelCasedPortName = options.port !== false ? camelize(portInterfaceName) : 'anyPort';

    // --- Service Generation ---
    if (options.service !== false) {
      const servicePath = path.join(srcRoot, domainName, 'services');
      
      // Use custom service name if provided, otherwise derive it with proper casing
      const serviceNameBase = options.serviceName || `${modelNameRaw}Service`;
      const serviceName = formatName(serviceNameBase);
      
      // Define the port-related variables
      const portImports = options.port !== false 
        ? `import { ${portInterfaceName} } from '../ports/${portInterfaceName}';` 
        : '// No ports to import';
      const portDependencies = options.port !== false 
        ? `private readonly ${camelCasedPortName}: ${portInterfaceName}` 
        : '// No port dependencies';
      const modelImport = `import { ${modelNameRaw} } from '../models/${modelNameRaw}';`;
      
      // Custom rename function to handle file name format before moving
      const renameServiceFile = (filePath: string) => {
        debugLog(`Renaming service file: ${filePath}`);
        if (filePath.includes('__serviceName__')) {
          const newPath = filePath.replace('__serviceName__', serviceName);
          debugLog(`Renamed service to: ${newPath}`);
          return newPath;
        }
        debugLog(`No service rename needed for: ${filePath}`);
        return filePath;
      };
      
      const serviceTemplateSource = apply(url('./files/service'), [
        applyTemplates({
          ...strings,
          name: modelNameRaw,
          serviceName: serviceName,
          domainName: domainName,
          modelName: modelNameRaw,
          portInterfaceName: portInterfaceName,
          camelCasedPortName: camelCasedPortName,
          // Add the missing variables to the template context
          portImports: portImports,
          portDependencies: portDependencies,
          modelImport: modelImport
        }),
        // Add a custom rename function to handle file naming
        (tree, _) => {
          tree.visit((filePath, entry) => {
            const newPath = renameServiceFile(filePath);
            if (newPath !== filePath) {
              tree.create(newPath, entry ? entry.content : Buffer.from(''));
              tree.delete(filePath);
            }
          });
          return tree;
        },
        move(servicePath),
      ]);
      rules.push(mergeWith(serviceTemplateSource));
    }

    // --- Port & Adapter Generation ---
    if (options.port !== false && adapterType !== 'none') {
      const portPath = path.join(srcRoot, domainName, 'ports');
      const adapterPath = path.join(srcRoot, 'infra', adapterType);

      // Custom rename functions for port and adapter files
      const renamePortFile = (filePath: string) => {
        if (filePath.includes('__portInterfaceName__')) {
          return filePath.replace('__portInterfaceName__', portInterfaceName);
        }
        return filePath;
      };
      
      const renameAdapterFile = (filePath: string) => {
        if (filePath.includes('__adapterName__')) {
          return filePath.replace('__adapterName__', adapterName);
        }
        return filePath;
      };

      // Port
      const portTemplateSource = apply(url('./files/port'), [
        applyTemplates({
          ...strings,
          portInterfaceName: portInterfaceName, // Use the generated port name
          name: modelNameRaw,
          modelName: modelNameRaw // Adding modelName here for consistency
        }),
        // Add a custom rename function to handle file naming
        (tree, _) => {
          tree.visit((filePath, entry) => {
            const newPath = renamePortFile(filePath);
            if (newPath !== filePath) {
              tree.create(newPath, entry ? entry.content : Buffer.from(''));
              tree.delete(filePath);
            }
          });
          return tree;
        },
        move(portPath),
      ]);
      rules.push(mergeWith(portTemplateSource));

      // Adapter
      const adapterTemplateSource = apply(url('./files/adapter'), [
        applyTemplates({
          ...strings,
          adapterName: adapterName,
          portInterfaceName: portInterfaceName,
          name: modelNameRaw,
          modelName: modelNameRaw, // Adding modelName here for consistency
          domainName: domainName
        }),
        // Add a custom rename function to handle file naming
        (tree, _) => {
          tree.visit((filePath, entry) => {
            const newPath = renameAdapterFile(filePath);
            if (newPath !== filePath) {
              tree.create(newPath, entry ? entry.content : Buffer.from(''));
              tree.delete(filePath);
            }
          });
          return tree;
        },
        move(adapterPath),
      ]);
      rules.push(mergeWith(adapterTemplateSource));
    }

    debugLog(`Returning rule chain with ${rules.length} rules`);
    return chain(rules);
  };
}
