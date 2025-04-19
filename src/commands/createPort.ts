import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { toCamelCase, toPascalCase } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';

// Helper function to find existing domains
async function findExistingDomains(): Promise<string[]> {
    const srcDir = path.join(process.cwd(), 'src');
    try {
        const entries = await fs.readdir(srcDir, { withFileTypes: true });
        return entries
            .filter(dirent => dirent.isDirectory() && !['handlers', 'infra', 'config', 'shared', 'templates', 'commands', 'utils'].includes(dirent.name))
            .map(dirent => dirent.name);
    } catch (error) {
        console.warn('Could not automatically find existing domains.');
        return [];
    }
}

/**
 * Generate a preview tree of files that will be created for a port
 */
function generateFilePreview(options: {
  name: string,
  domain: string,
  path?: string,
  adapterType: string
}): string {
  const { name, domain, path: outputPath = '', adapterType } = options;
  const portName = toPascalCase(name);
  const domainName = toCamelCase(domain);
  const basePath = outputPath ? `${outputPath}/` : '';
  
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${basePath}src/\x1b[0m\n`;
  
  // Port interface
  preview += `\x1b[36m├── ${domainName}/ports/\x1b[0m\n`;
  preview += `\x1b[32m│   └── ${portName}.ts\x1b[0m \x1b[90m- Port interface\x1b[0m\n`;
  
  // Adapter implementation
  if (adapterType !== 'none') {
    preview += `\x1b[36m└── infra/${adapterType}/\x1b[0m\n`;
    preview += `\x1b[32m    └── ${portName}Adapter.ts\x1b[0m \x1b[90m- Adapter implementation\x1b[0m\n`;
  }
  
  return preview;
}

export function createPortCommand(): Command {
    const command = new Command('create:port')
        .alias('cp')
        .description('Generate a new domain port interface and its infrastructure adapter implementation.')
        .argument('<n>', 'Name of the port (e.g., UserFinder, PaymentGateway)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-t, --type <adapterType>', 'Specify the adapter type (repository, rest, graphql)')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-y, --yes', 'Skip prompts and use default options')
        .action(async (name, options) => {
            let domainName = options.domain;
            let adapterType = options.type;
            let proceed = options.yes;

            const existingDomains = await findExistingDomains();

            // Prompt for domain if not provided
            if (!domainName && existingDomains.length > 0) {
                const domainAnswer = await inquirer.prompt({
                    type: 'list',
                    name: 'domainName',
                    message: 'Which domain does this port belong to?',
                    choices: existingDomains,
                });
                domainName = domainAnswer.domainName;
            } else if (!domainName) {
                const domainAnswer = await inquirer.prompt({
                    type: 'input',
                    name: 'domainName',
                    message: 'Enter the domain name for this port:',
                    validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty.',
                });
                domainName = domainAnswer.domainName;
            }

            // Prompt for adapter type if not provided
            if (!adapterType) {
                const typeAnswer = await inquirer.prompt({
                    type: 'list',
                    name: 'adapterType',
                    message: 'What type of adapter will implement this port?',
                    choices: ['repository', 'rest', 'graphql'],
                    default: 'repository',
                });
                adapterType = typeAnswer.adapterType;
            }

            domainName = toCamelCase(domainName);
            const portName = toPascalCase(name);

            // Generate options for the schematic
            const schematicOptions = {
                name: portName,
                domain: domainName,
                path: options.path || '',
                adapterType
            };

            // Generate and show file preview
            const filePreview = generateFilePreview(schematicOptions);
            console.log(filePreview);

            // Ask for confirmation unless --yes flag is used
            if (!options.yes) {
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
                    console.log(`Generating port ${portName}Port for domain ${domainName} with ${adapterType} adapter...`);
                    await runSchematic('port', schematicOptions);
                    console.log('Port and adapter created successfully!');
                } catch (error) {
                    console.error('Failed to create port:', error);
                }
            } else {
                console.log('\nOperation cancelled. No files were created.');
            }
        });

    return command;
}
