import { Command } from 'commander';
import inquirer from 'inquirer';
import { toCamelCase, toPascalCase, capitalizeFirstLetter } from '../utils/fileUtils';
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
  adapterType?: string
}): string {
  const { name, path: outputPath = '', model = true, service = true, port = true, adapterType = 'repository' } = options;
  const domainName = toCamelCase(name);
  const pascalName = toPascalCase(domainName);
  const basePath = outputPath ? `${outputPath}/` : '';
  
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${basePath}src/\x1b[0m\n`;
  
  if (model || service || port) {
    preview += `\x1b[36m├── ${domainName}/\x1b[0m\n`;
    
    if (model) {
      preview += `\x1b[36m│   ├── models/\x1b[0m\n`;
      preview += `\x1b[32m│   │   └── ${pascalName}.ts\x1b[0m \x1b[90m- Domain model\x1b[0m\n`;
    }
    
    if (port) {
      preview += `\x1b[36m│   ├── ports/\x1b[0m\n`;
      preview += `\x1b[32m│   │   └── ${pascalName}${capitalizeFirstLetter(adapterType)}Port.ts\x1b[0m \x1b[90m- Port interface\x1b[0m\n`;
    }
    
    if (service) {
      preview += `\x1b[36m│   └── services/\x1b[0m\n`;
      preview += `\x1b[32m│       └── ${pascalName}Service.ts\x1b[0m \x1b[90m- Domain service implementation\x1b[0m\n`;
    }
  }
  
  if (port && adapterType !== 'none') {
    preview += `\x1b[36m└── infra/\x1b[0m\n`;
    preview += `\x1b[36m    └── ${adapterType}/\x1b[0m\n`;
    preview += `\x1b[32m        └── ${pascalName}${capitalizeFirstLetter(adapterType)}Adapter.ts\x1b[0m \x1b[90m- Adapter implementation\x1b[0m\n`;
  }
  
  return preview;
}

export function createDomainCommand(): Command {
    const command = new Command('create:domain')
        .alias('cd')
        .description('Scaffold a new domain with models, services, and ports.')
        .argument('<domainName>', 'Name of the domain (e.g., user, product)')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-y, --yes', 'Skip prompts and use default options')
        .option('--no-model', 'Skip model generation')
        .option('--no-service', 'Skip service generation')
        .option('--no-port', 'Skip port generation')
        .option('--adapter-type <type>', 'Adapter type (repository, rest, graphql, none)', 'repository')
        .action(async (domainName, cmdOptions) => {
            const camelName = toCamelCase(domainName);
            const pascalName = toPascalCase(camelName);
            
            let answers;
            
            // Use provided command-line options if --yes flag is set
            if (cmdOptions.yes) {
                answers = {
                    createModel: cmdOptions.model !== false,
                    createService: cmdOptions.service !== false,
                    createPort: cmdOptions.port !== false,
                    adapterType: cmdOptions.adapterType || 'repository'
                };
                console.log('Using default options:');
                console.log(`- Create model: ${answers.createModel ? 'Yes' : 'No'}`);
                console.log(`- Create service: ${answers.createService ? 'Yes' : 'No'}`);
                console.log(`- Create port: ${answers.createPort ? 'Yes' : 'No'}`);
                console.log(`- Adapter type: ${answers.adapterType}`);
            } else {
                // Interactive mode with prompts
                answers = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'createModel',
                        message: `Create a model (${pascalName})?`,
                        default: true,
                    },
                    {
                        type: 'confirm',
                        name: 'createService',
                        message: `Create a service (${pascalName}Service)?`,
                        default: true,
                    },
                    {
                        type: 'confirm',
                        name: 'createPort',
                        message: `Create a port interface (${pascalName}RepositoryPort)?`,
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
                ]);
            }

            // Generate options for the schematic
            const schematicOptions = {
                name: domainName,
                path: cmdOptions.path || '',
                model: answers.createModel,
                service: answers.createService,
                port: answers.createPort,
                adapterType: answers.adapterType || 'repository'
            };

            // Generate and show file preview
            const filePreview = generateFilePreview(schematicOptions);
            console.log(filePreview);

            // Ask for confirmation unless --yes flag is used
            let proceed = cmdOptions.yes;
            if (!cmdOptions.yes) {
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
                    console.log(`\nGenerating domain ${domainName}...`);
                    await runSchematic('domain', schematicOptions);
                    console.log('\x1b[32m✓\x1b[0m Domain created successfully!');
                } catch (error) {
                    console.error('\x1b[31m✗\x1b[0m Failed to create domain:', error);
                }
            } else {
                console.log('\nOperation cancelled. No files were created.');
            }
        });

    return command;
}
