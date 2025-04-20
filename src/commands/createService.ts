import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { toCamelCase, toPascalCase, displayWithPagination } from '../utils/fileUtils';
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
 * Generate a preview tree of files that will be created for a service
 */
function generateFilePreview(options: {
  name: string,
  domain: string,
  path?: string
}): string {
  const { name, domain, path: outputPath = '' } = options;
  const serviceName = toPascalCase(name);
  const domainName = toCamelCase(domain);
  const basePath = outputPath ? `${outputPath}/` : '';
  
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${basePath}src/${domainName}/services/\x1b[0m\n`;
  preview += `\x1b[32m└── ${serviceName}Service.ts\x1b[0m \x1b[90m- Service implementation\x1b[0m\n`;
  
  return preview;
}

export function createServiceCommand(): Command {
    const command = new Command('create:service')
        .alias('cs')
        .description('Generate a new domain service.')
        .argument('<n>', 'Service name (e.g., UserCreator, ProductFinder)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-y, --yes', 'Skip prompts and use default options')
        .hook('preAction', async () => {
            // Show detailed help with pagination when --help is used
            if (process.argv.includes('--help')) {
                const helpContent = `
Description:
  Generates a new domain service for implementing business logic.
  Services encapsulate complex operations and domain rules within
  a specific bounded context.

Structure Generated:
  └── src/
      └── {domainName}/              # Domain root folder
          └── services/              # Services folder
              └── {name}Service.ts   # Service implementation

Features:
  • Domain-driven design services
  • TypeScript implementation
  • Port interface integration
  • Clean architecture patterns
  • Business logic encapsulation

Examples:
  $ vss-api-cli create:service UserCreator -d user
  $ vss-api-cli create:service OrderProcessor --domain order
  $ vss-api-cli cs ProductCatalogManager -d product
  $ vss-api-cli create:service PaymentHandler --path src/domains

Additional Information:
  • Service names are automatically converted to PascalCase
  • Includes standard TypeScript types
  • Follows clean architecture principles
  • Integrates with domain ports
  • Includes dependency injection setup

Options:
  -d, --domain <domainName>  Specify the domain name
  -p, --path <outputPath>    Specify a custom output path
  -y, --yes                  Skip prompts and use default options
  -h, --help                Display this help message
`;
                await displayWithPagination(helpContent);
                process.exit(0);
            }
        })
        .action(async (name, options) => {
            let domainName = options.domain;
            let proceed = options.yes;

            const existingDomains = await findExistingDomains();

            // Prompt for domain if not provided
            if (!domainName && existingDomains.length > 0) {
                const domainAnswer = await inquirer.prompt({
                    type: 'list',
                    name: 'domainName',
                    message: 'Which domain does this service belong to?',
                    choices: existingDomains,
                });
                domainName = domainAnswer.domainName;
            } else if (!domainName) {
                const domainAnswer = await inquirer.prompt({
                    type: 'input',
                    name: 'domainName',
                    message: 'Enter the domain name for this service:',
                    validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty.',
                });
                domainName = domainAnswer.domainName;
            }

            domainName = toCamelCase(domainName);
            const serviceName = toPascalCase(name);

            // Generate options for the schematic
            const schematicOptions = {
                name: serviceName,
                domain: domainName,
                path: options.path || ''
            };
            
            // Generate and show file preview with pagination
            const filePreview = generateFilePreview(schematicOptions);
            await displayWithPagination(filePreview);
            
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
                    console.log(`\nGenerating service ${serviceName}Service for domain ${domainName}...`);
                    await runSchematic('service', schematicOptions);
                    console.log('\x1b[32m✓\x1b[0m Service created successfully!');
                } catch (error) {
                    console.error('\x1b[31m✗\x1b[0m Failed to create service:', error);
                }
            } else {
                console.log('\nOperation cancelled. No files were created.');
            }
        });

    return command;
}
