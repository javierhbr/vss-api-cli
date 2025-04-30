import { Command } from 'commander';
import inquirer from 'inquirer';
import { toCamelCase, toPascalCase, toDasherize, capitalizeFirstLetter, displayWithPagination, applyFilePatterns } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';
import { loadConfig } from '../utils/configLoader';
import * as path from 'path';

/**
 * Generate a preview tree of files that will be created
 * @param options Domain options including name, path, and components to create
 * @returns A formatted string representing the file tree
 */
function generateFilePreview(options: {
  name: string;
  path?: string;
  model?: boolean;
  service?: boolean;
  port?: boolean;
  modelName?: string;
  serviceName?: string;
  portName?: string;
  adapterType?: string;
  adapterName?: string;
}): string {
  const {
    name,
    path: out = '',
    model = true,
    service = true,
    port = true,
    modelName,
    serviceName,
    portName,
    adapterType = 'repository',
    adapterName,
  } = options;
  
  // Setup domain name and config
  const domainName = toCamelCase(name);
  const pascalName = toPascalCase(name);
  const dashName = toDasherize(name);
  const config = loadConfig(out);
  
  // Final names based on provided custom names or defaults
  const finalModelName = modelName || pascalName;
  const finalServiceName = serviceName || `${pascalName}Service`;
  const finalPortName = portName || `${pascalName}${capitalizeFirstLetter(adapterType)}Port`;
  const finalAdapterName = adapterName || `${pascalName}${capitalizeFirstLetter(adapterType)}Adapter`;
  
  // Template variables for file pattern processing
  const templateVars = {
    name,
    pascalName,
    dashName,
    camelName: domainName,
    domainName,
    adapterType,
    serviceName: finalServiceName
  };
  
  // Apply file patterns from config using our new utility
  const modelFileInfo = model ? applyFilePatterns('domain', 'modelFile', config, {...templateVars, name: finalModelName}, out) : null;
  const serviceFileInfo = service ? applyFilePatterns('domain', 'serviceFile', config, {...templateVars, name: finalServiceName}, out) : null;
  const portFileInfo = port ? applyFilePatterns('domain', 'portFile', config, {...templateVars, name: finalPortName}, out) : null;
  const adapterFileInfo = (port && adapterType !== 'none') ? 
    applyFilePatterns('adapter', 'adapterFile', config, {...templateVars, name: finalAdapterName}, out) : null;
  
  // Extract paths for display
  const srcPath = path.join(out || '.', config.basePath);
  
  // Start building preview output
  let pv = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  
  // Show domain files
  if (model || service || port) {
    // Extract domain directory structure
    const domainDirPath = path.dirname(model ? modelFileInfo!.filePath : service ? serviceFileInfo!.filePath : portFileInfo!.filePath)
      .replace(srcPath + '/', '')
      .split('/')[0]; // Get top level domain directory
      
    pv += `\x1b[36m${srcPath}/\x1b[0m\n`;
    pv += `\x1b[36m├── ${domainDirPath}/\x1b[0m\n`;
    
    // Show model file
    if (model && modelFileInfo) {
      const modelDir = path.dirname(modelFileInfo.filePath).replace(srcPath + '/', '').split('/');
      modelDir.shift(); // Remove domain name
      pv += `\x1b[36m│   ├── ${modelDir.join('/')}/\x1b[0m\n`;
      pv += `\x1b[32m│   │   └── ${modelFileInfo.fileName}\x1b[0m \x1b[90m- Domain model\x1b[0m\n`;
    }
    
    // Show port file
    if (port && portFileInfo) {
      const portDir = path.dirname(portFileInfo.filePath).replace(srcPath + '/', '').split('/');
      portDir.shift(); // Remove domain name
      pv += `\x1b[36m│   ├── ${portDir.join('/')}/\x1b[0m\n`;
      pv += `\x1b[32m│   │   └── ${portFileInfo.fileName}\x1b[0m \x1b[90m- Port interface\x1b[0m\n`;
    }
    
    // Show service file
    if (service && serviceFileInfo) {
      const serviceDir = path.dirname(serviceFileInfo.filePath).replace(srcPath + '/', '').split('/');
      serviceDir.shift(); // Remove domain name
      pv += `\x1b[36m│   └── ${serviceDir.join('/')}/\x1b[0m\n`;
      pv += `\x1b[32m│       └── ${serviceFileInfo.fileName}\x1b[0m \x1b[90m- Domain service implementation\x1b[0m\n`;
    }
  }
  
  // Show adapter implementation
  if (port && adapterType !== 'none' && adapterFileInfo) {
    const adapterDirParts = path.dirname(adapterFileInfo.filePath).replace(srcPath + '/', '').split('/');
    
    pv += `\x1b[36m└── ${adapterDirParts[0]}/\x1b[0m\n`;
    if (adapterDirParts.length > 1) {
      pv += `\x1b[36m    └── ${adapterDirParts[1]}/\x1b[0m\n`;
      if (adapterDirParts.length > 2) {
        const remainingDirs = adapterDirParts.slice(2).join('/');
        pv += `\x1b[36m        └── ${remainingDirs}/\x1b[0m\n`;
      }
    }
    pv += `\x1b[32m        └── ${adapterFileInfo.fileName}\x1b[0m \x1b[90m- Adapter implementation\x1b[0m\n`;
  }
  
  return pv;
}

export function createDomainCommand(): Command {
    const command = new Command('create:domain')
        .alias('cd')
        .description(`Scaffold a new domain with models, services, and ports.`)
        .argument('<domainName>', 'Name of the domain (e.g., user, product)')
        // Add both positive and negative boolean flags for model, service, and port
        .option('--model', 'Include domain model generation')
        .option('--no-model', 'Skip domain model generation')
        .option('--service', 'Include domain service generation')
        .option('--no-service', 'Skip domain service generation')
        .option('--port', 'Include port interface generation')
        .option('--no-port', 'Skip port interface generation')
        .option('-p, --path <outputPath>', 'Specify a custom output path for the domain')
        .option('-y, --yes', 'Skip prompts and use default options')
        .option('--adapter-type <type>', 'Type of adapter to implement the port (repository, rest, graphql, none)', 'repository')
        .option('--model-name <name>', 'Custom name for the model')
        .option('--service-name <name>', 'Custom name for the service')
        .option('--port-name <name>', 'Custom name for the port interface')
        .option('--adapter-name <name>', 'Custom name for the adapter implementation')
        .action(async (inputDomainName, cmdOptions) => {
            try { // Add top-level try block for the action
                const camelName = toCamelCase(inputDomainName);
                const initialPascalName = toPascalCase(camelName);
                
                let answers;
                
                // Confirm domain name first, unless --yes flag is explicitly set
                let finalDomainName = inputDomainName;
                
                // Ensure cmdOptions.yes is explicitly set to true, not just truthy
                const skipPrompts = cmdOptions.yes === true;
                
                if (!skipPrompts) {
                    const nameConfirmation = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmName',
                            message: `Domain will be created with name: "${finalDomainName}" (${initialPascalName})${cmdOptions.path ? ` in path: "${cmdOptions.path}"` : ''}. Is this correct?`,
                            default: true,
                        },
                        {
                            type: 'input',
                            name: 'newName',
                            message: 'Enter a new domain name:',
                            when: (ans) => !ans.confirmName,
                            validate: (input) => {
                                if (!input.trim()) return 'Domain name cannot be empty';
                                return true;
                            }
                        }
                    ]);
                    
                    if (nameConfirmation.newName) {
                        finalDomainName = nameConfirmation.newName;
                        const finalCamelName = toCamelCase(finalDomainName);
                        const finalPascalName = toPascalCase(finalCamelName);
                        console.log(`\nUsing new domain name: "${finalDomainName}" (${finalPascalName})`);
                    }
                }
                
                // Use provided command-line options if --yes flag is set
                if (skipPrompts) {
                    answers = {
                        createModel: cmdOptions.model !== false,
                        createService: cmdOptions.service !== false,
                        createPort: cmdOptions.port !== false,
                        adapterType: cmdOptions.adapterType || 'repository',
                        modelName: cmdOptions.modelName,
                        serviceName: cmdOptions.serviceName,
                        portName: cmdOptions.portName,
                        adapterName: cmdOptions.adapterName // Get adapterName from options
                    };
                    console.log('Using default options:');
                    console.log(`- Create model: ${answers.createModel ? 'Yes' : 'No'}`);
                    console.log(`- Create service: ${answers.createService ? 'Yes' : 'No'}`);
                    console.log(`- Create port: ${answers.createPort ? 'Yes' : 'No'}`);
                    console.log(`- Adapter type: ${answers.adapterType}`);
                    if (answers.modelName) console.log(`- Custom model name: ${answers.modelName}`);
                    if (answers.serviceName) console.log(`- Custom service name: ${answers.serviceName}`);
                    if (answers.portName) console.log(`- Custom port name: ${answers.portName}`);
                    if (answers.adapterName) console.log(`- Custom adapter name: ${answers.adapterName}`); // Log adapterName
                } else {
                    // Interactive mode with prompts
                    answers = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'createModel',
                            message: `Create a model (${toPascalCase(toCamelCase(finalDomainName))})?`,
                            default: true,
                        },
                        {
                            type: 'input',
                            name: 'modelName',
                            message: () => `Enter a custom name for the model or leave empty to use ${toPascalCase(toCamelCase(finalDomainName))}:`,
                            when: (ans) => ans.createModel && !cmdOptions.modelName,
                        },
                        {
                            type: 'confirm',
                            name: 'createService',
                            message: `Create a service (${toPascalCase(toCamelCase(finalDomainName))}Service)?`,
                            default: true,
                        },
                        {
                            type: 'input',
                            name: 'serviceName',
                            message: `Enter a custom name for the service (e.g., UserService, ProductManagement, OrderProcessor) or leave empty to use ${toPascalCase(toCamelCase(finalDomainName))}Service:`,
                            when: (ans) => ans.createService && !cmdOptions.serviceName,
                        },
                        {
                            type: 'confirm',
                            name: 'createPort',
                            message: 'Create a port interface?',
                            default: true,
                        },
                        {
                            type: 'list',
                            name: 'adapterType',
                            message: 'If creating a port, what type of adapter should implement it?',
                            choices: ['repository', 'rest', 'graphql', 'none'],
                            default: 'repository',
                            when: (ans) => ans.createPort,
                        },
                        {
                            type: 'input',
                            name: 'portName',
                            message: (ans) => `Enter a custom name for the port interface (e.g., UserRepository, ProductDataAccess, OrderStorage) or leave empty to use ${toPascalCase(toCamelCase(ans.serviceName || finalDomainName))}${capitalizeFirstLetter(ans.adapterType || 'repository')}Port:`, // Use serviceName if provided
                            when: (ans) => ans.createPort && !cmdOptions.portName, // Only ask if creating port and not provided via options
                            default: (ans) => `${toPascalCase(toCamelCase(ans.serviceName || finalDomainName))}${capitalizeFirstLetter(ans.adapterType || 'repository')}Port`, // Provide default based on service/domain and adapter
                        },
                        { // Add prompt for adapter name
                            type: 'input',
                            name: 'adapterName',
                            message: (ans) => `Enter a custom name for the adapter implementation (e.g., UserMongoAdapter, ProductRestDatasource) or leave empty to use ${toPascalCase(toCamelCase(ans.serviceName || finalDomainName))}${capitalizeFirstLetter(ans.adapterType)}Adapter:`, 
                            when: (ans) => ans.createPort && ans.adapterType !== 'none' && !cmdOptions.adapterName, // Show only if port+adapter are created and not provided via options
                            default: (ans) => `${toPascalCase(toCamelCase(ans.serviceName || finalDomainName))}${capitalizeFirstLetter(ans.adapterType)}Adapter`, // Default derived name
                        },
                    ]);
                }

                // Use command line options if provided (they take precedence)
                if (cmdOptions.modelName) answers.modelName = cmdOptions.modelName;
                if (cmdOptions.serviceName) answers.serviceName = cmdOptions.serviceName;
                if (cmdOptions.portName) answers.portName = cmdOptions.portName;
                if (cmdOptions.adapterName) answers.adapterName = cmdOptions.adapterName; // Apply adapterName from options

                // Load configuration
                const config = loadConfig(cmdOptions.path || '');
                
                // Generate template variables
                const domainName = toCamelCase(finalDomainName);
                const pascalName = toPascalCase(finalDomainName);
                const dashName = toDasherize(finalDomainName);
                
                // Final names based on provided custom names or defaults
                const finalModelName = answers.modelName || pascalName;
                const finalServiceName = answers.serviceName || `${pascalName}Service`;
                const finalPortName = answers.portName || `${pascalName}${capitalizeFirstLetter(answers.adapterType || 'repository')}Port`;
                const finalAdapterName = answers.adapterName || `${pascalName}${capitalizeFirstLetter(answers.adapterType || 'repository')}Adapter`;
                
                // Template variables for file paths
                const templateVars = {
                    name: finalDomainName,
                    pascalName,
                    dashName,
                    camelName: domainName,
                    domainName,
                    adapterType: answers.adapterType || 'repository',
                    serviceName: finalServiceName
                };
                
                // Generate paths using the file patterns
                const basePath = cmdOptions.path || '';
                const modelFileInfo = answers.createModel ? 
                    applyFilePatterns('domain', 'modelFile', config, {...templateVars, name: finalModelName}, basePath) : null;
                const serviceFileInfo = answers.createService ? 
                    applyFilePatterns('domain', 'serviceFile', config, {...templateVars, name: finalServiceName}, basePath) : null;
                const portFileInfo = answers.createPort ? 
                    applyFilePatterns('domain', 'portFile', config, {...templateVars, name: finalPortName}, basePath) : null;
                const adapterFileInfo = (answers.createPort && answers.adapterType !== 'none') ? 
                    applyFilePatterns('adapter', 'adapterFile', config, {...templateVars, name: finalAdapterName}, basePath) : null;
                
                // Generate options for the schematic
                const schematicOptions = {
                    name: finalDomainName,
                    path: cmdOptions.path || '',
                    model: answers.createModel,
                    service: answers.createService,
                    port: answers.createPort,
                    adapterType: answers.adapterType || 'repository',
                    modelName: answers.modelName || '',
                    serviceName: answers.serviceName || '',
                    portName: answers.portName || '',
                    adapterName: answers.adapterName || '', // Pass adapterName to schematic options
                    
                    // Pass file paths to schematic
                    _config: config,
                    modelFilePath: modelFileInfo?.filePath,
                    modelFileName: modelFileInfo?.fileName,
                    serviceFilePath: serviceFileInfo?.filePath,
                    serviceFileName: serviceFileInfo?.fileName,
                    portFilePath: portFileInfo?.filePath,
                    portFileName: portFileInfo?.fileName,
                    adapterFilePath: adapterFileInfo?.filePath,
                    adapterFileName: adapterFileInfo?.fileName
                };

                // Generate and show file preview
                const filePreview = generateFilePreview(schematicOptions);
                await displayWithPagination(`\n🔹 Create a Domain: ${finalDomainName}\n${filePreview}`);

                // Ask for confirmation unless --yes flag is used
                let proceed = skipPrompts;
                if (!skipPrompts) {
                    const confirmAnswer = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'proceed',
                            message: 'Do you want to create these files?',
                            default: true,
                        }
                    ]);
                    proceed = confirmAnswer.proceed;
                }

                // Proceed with file generation if confirmed
                if (proceed) {
                    try {
                        console.log(`\nGenerating domain ${finalDomainName}...`);
                        await runSchematic('domain', schematicOptions, cmdOptions.dryRun, cmdOptions.force); 
                        console.log('\x1b[32m✅ Domain created successfully! 🎯\x1b[0m');
                    } catch (error) {
                        console.error('\x1b[31m✗\x1b[0m We tried. The domain said “nah.”:', error);
                    }
                } else {
                    console.log('\nOperation cancelled. No files were created.');
                }
            } catch (error: any) { // Catch any error during the action
                // Check if the error is due to the user exiting the prompt
                // Using error.name check as importing ExitPromptError might be complex
                if (error && error.name === 'ExitPromptError') { 
                    console.log('\nMission aborted! The user yeeted the command into the void. Farewell, brave keystroke warrior! 🫡💥');
                    process.exit(0); // Exit gracefully
                } else {
                    // For any other error, log it and exit with an error code
                    console.error('\n\x1b[31mAn unexpected error occurred:\x1b[0m', error);
                    process.exit(1); 
                }
            }
        });

    return command;
}
