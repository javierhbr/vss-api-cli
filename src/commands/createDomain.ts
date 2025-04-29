import { Command } from 'commander';
import inquirer from 'inquirer';
import { toCamelCase, toPascalCase, capitalizeFirstLetter, displayWithPagination } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';
import { loadConfig } from '../utils/configLoader';

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
  const domainName = toCamelCase(name);
  const config = loadConfig(out);
  const baseRoot = config.basePath;
  const dirs = config.directories;
  const dT = dirs.domain || {};
  const aT = dirs.adapter || {};
  const proc = (tmpl: string, vs: Record<string, string>) =>
    tmpl.replace(/\{\{([^}]+)\}\}/g, (_, k) => vs[k] || tmpl);
  const root = `${out ? `${out}/` : ''}${baseRoot}`;
  const fmt = (s: string) =>
    config.fileNameCase === 'camel' ? toCamelCase(s) : toPascalCase(s);
  const mN = fmt(modelName || name);
  const sN = fmt(serviceName || `${name}Service`);
  const pN = fmt(portName || `${name}${capitalizeFirstLetter(adapterType)}Port`);
  const aN = fmt(adapterName || `${name}${capitalizeFirstLetter(adapterType)}Adapter`);
  let pv = `\n\x1b[1mFiles to be created:\x1b[0m\n\x1b[36m${root}/\x1b[0m\n`;
  if (model || service || port) {
    const d0 = proc(dT.base || name, { domainName });
    pv += `\x1b[36m├── ${d0}/\x1b[0m\n`;
    if (model) {
      const d1 = proc(dT.model || `${name}/models`, { domainName }).split('/').pop();
      pv += `\x1b[36m│   ├── ${d1}/\x1b[0m\n`;
      pv += `\x1b[32m│   │   └── ${mN}.ts\x1b[0m \x1b[90m- Domain model\x1b[0m\n`;
    }
    if (port) {
      const d2 = proc(dT.port || `${name}/ports`, { domainName }).split('/').pop();
      pv += `\x1b[36m│   ├── ${d2}/\x1b[0m\n`;
      pv += `\x1b[32m│   │   └── ${pN}.ts\x1b[0m \x1b[90m- Port interface\x1b[0m\n`;
    }
    if (service) {
      const d3 = proc(dT.service || `${name}/services`, { domainName }).split('/').pop();
      pv += `\x1b[36m│   └── ${d3}/\x1b[0m\n`;
      pv += `\x1b[32m│       └── ${sN}.ts\x1b[0m \x1b[90m- Domain service implementation\x1b[0m\n`;
    }
  }
  if (port && adapterType !== 'none') {
    const a0 = proc(aT.base || `infra/${adapterType}`, { adapterType, domainName }).split('/');
    pv += `\x1b[36m└── ${a0[0]}/\x1b[0m\n`;
    pv += `\x1b[36m    └── ${a0[1]}/\x1b[0m\n`;
    pv += `\x1b[32m        └── ${aN}.ts\x1b[0m \x1b[90m- Adapter implementation\x1b[0m\n`;
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
        .action(async (domainName, cmdOptions) => {
            try { // Add top-level try block for the action
                const camelName = toCamelCase(domainName);
                const pascalName = toPascalCase(camelName);
                
                let answers;
                
                // Confirm domain name first, unless --yes flag is explicitly set
                let finalDomainName = domainName;
                
                // Ensure cmdOptions.yes is explicitly set to true, not just truthy
                const skipPrompts = cmdOptions.yes === true;
                
                if (!skipPrompts) {
                    const nameConfirmation = await inquirer.prompt([
                        {
                            type: 'confirm',
                            name: 'confirmName',
                            message: `Domain will be created with name: "${domainName}" (${pascalName})${cmdOptions.path ? ` in path: "${cmdOptions.path}"` : ''}. Is this correct?`,
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
                            message: (ans) => `Create a port interface (${toPascalCase(toCamelCase(ans.serviceName || finalDomainName))}RepositoryPort)?`, // Use serviceName if provided
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
                    adapterName: answers.adapterName || '' // Pass adapterName to schematic options
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
