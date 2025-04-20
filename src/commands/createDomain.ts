import { Command } from 'commander';
import inquirer from 'inquirer';
import { toCamelCase, toPascalCase, capitalizeFirstLetter, displayWithPagination } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';

/**
 * Generate a preview tree of files that will be created
 * @param options Domain options including name, path, and components to create
 * @returns A formatted string representing the file tree
 */
function generateFilePreview(options: {
  name: string,
  path?: string,
  model?: boolean,
  service?: boolean,
  port?: boolean,
  modelName?: string,
  serviceName?: string,
  portName?: string,
  adapterType?: string,
  adapterName?: string; // Add adapterName parameter
}): string {
  const { 
    name, 
    path: outputPath = '', 
    model = true, 
    service = true, 
    port = true, 
    modelName,
    serviceName,
    portName,
    adapterType = 'repository',
    adapterName // Destructure adapterName
  } = options;
  
  const domainName = toCamelCase(name);
  const pascalName = toPascalCase(domainName);
  const basePath = outputPath ? `${outputPath}/` : '';
  
  // Use custom names if provided, otherwise derive from domain name
  const finalModelName = modelName ? toPascalCase(modelName) : pascalName;
  const finalServiceName = serviceName ? toPascalCase(serviceName) : `${pascalName}Service`;
  const finalPortName = portName ? toPascalCase(portName) : `${pascalName}${capitalizeFirstLetter(adapterType)}Port`;
  // Use custom adapter name if provided, otherwise derive it
  const finalAdapterName = adapterName ? toPascalCase(adapterName) : `${pascalName}${capitalizeFirstLetter(adapterType)}Adapter`; 
  
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${basePath}src/\x1b[0m\n`;
  
  if (model || service || port) {
    preview += `\x1b[36m├── ${domainName}/\x1b[0m\n`;
    
    if (model) {
      preview += `\x1b[36m│   ├── models/\x1b[0m\n`;
      preview += `\x1b[32m│   │   └── ${finalModelName}.ts\x1b[0m \x1b[90m- Domain model\x1b[0m\n`;
    }
    
    if (port) {
      preview += `\x1b[36m│   ├── ports/\x1b[0m\n`;
      preview += `\x1b[32m│   │   └── ${finalPortName}.ts\x1b[0m \x1b[90m- Port interface\x1b[0m\n`;
    }
    
    if (service) {
      preview += `\x1b[36m│   └── services/\x1b[0m\n`;
      preview += `\x1b[32m│       └── ${finalServiceName}.ts\x1b[0m \x1b[90m- Domain service implementation\x1b[0m\n`;
    }
  }
  
  if (port && adapterType !== 'none') {
    preview += `\x1b[36m└── infra/\x1b[0m\n`;
    preview += `\x1b[36m    └── ${adapterType}/\x1b[0m\n`;
    // Use finalAdapterName in the preview
    preview += `\x1b[32m        └── ${finalAdapterName}.ts\x1b[0m \x1b[90m- Adapter implementation\x1b[0m\n`; 
  }
  
  return preview;
}

export function createDomainCommand(): Command {
    const command = new Command('create:domain')
        .alias('cd')
        .description(`Scaffold a new domain with models, services, and ports.`)
        .argument('<domainName>', 'Name of the domain (e.g., user, product)')
        .option('-p, --path <outputPath>', 'Specify a custom output path for the domain')
        .option('-y, --yes', 'Skip prompts and use default options')
        .option('--no-model', 'Skip domain model generation')
        .option('--no-service', 'Skip domain service generation')
        .option('--no-port', 'Skip port interface generation')
        .option('--adapter-type <type>', 'Type of adapter to implement the port (repository, rest, graphql, none)', 'repository')
        .option('--model-name <name>', 'Custom name for the model')
        .option('--service-name <name>', 'Custom name for the service')
        .option('--port-name <name>', 'Custom name for the port interface')
        .option('--adapter-name <name>', 'Custom name for the adapter implementation') // Add adapter name option
        .option('--force', 'Force overwrite of existing files') // Add force option
        .hook('preAction', async () => {
            // Show detailed help with pagination when --help is used
            if (process.argv.includes('--help')) {
                const helpContent = `
Description:
  Creates a complete domain structure following hexagonal architecture principles.
  This includes the domain model, services for business logic, and ports with adapters
  for infrastructure integration.

Structure Generated:
  \`\`\`
  src/
  ├── {domainName}/              # Domain root folder
  │   ├── models/                # Domain models and entities
  │   ├── ports/                # Port interfaces for external dependencies
  │   └── services/             # Domain services implementing business logic
  └── infra/                    # Infrastructure implementations
      └── {adapterType}/        # Concrete adapter implementations
  \`\`\`

Examples:
  $ vss-api-cli create:domain user
  $ vss-api-cli create:domain payment --path src/domains
  $ vss-api-cli create:domain product --adapter-type rest
  $ vss-api-cli create:domain order --no-model --no-port
  $ vss-api-cli create:domain customer --model-name Client --service-name CustomerManagement

Additional Information:
  • Domain names are automatically converted to proper case in generated files
  • Models use PascalCase (e.g., User)
  • Services are suffixed with 'Service' (e.g., UserService)
  • Ports are named based on adapter type (e.g., UserRepositoryPort)
  • Generated code follows clean architecture principles
  • All files include TypeScript types and documentation
  • You can customize component names via flags or interactive prompts

Options:
  -p, --path <outputPath>     Specify a custom output path for the domain
  -y, --yes                   Skip prompts and use default options
  --no-model                  Skip domain model generation
  --no-service               Skip domain service generation
  --no-port                  Skip port interface generation
  --adapter-type <type>      Type of adapter (repository, rest, graphql, none)
  --model-name <name>        Custom name for the model
  --service-name <name>      Custom name for the service
  --port-name <name>         Custom name for the port interface
  --adapter-name <name>      Custom name for the adapter implementation
  -h, --help                 Display this help message
`;
                await displayWithPagination(helpContent);
                process.exit(0);
            }
        })
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
                await displayWithPagination(filePreview);

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
                        // Pass cmdOptions.force to runSchematic
                        await runSchematic('domain', schematicOptions, cmdOptions.dryRun, cmdOptions.force); 
                        console.log('\x1b[32m✓\x1b[0m ⏱️ Domain created. We just saved you 37 clicks and 2 existential crises!');
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
