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
        .argument('<n>', 'Service name (e.g., UserAuthenticator, OrderProcessor, ProductCatalogManager, PaymentTransactionHandler, EmailNotifier, ReportGenerator, DataAnalyzer, InventoryManager)')
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
  a specific bounded context or domain.

Structure Generated:
  └── src/
      └── {domainName}/              # Domain root folder
          └── services/              # Services folder
              └── {name}Service.ts   # Service implementation

Features:
  • Domain-driven design service structure
  • Business logic encapsulation
  • Clean architecture principles
  • Type-safe method signatures
  • Port dependency injection support

Examples:
  $ vss-api-cli create:service UserAuthenticator -d user
  $ vss-api-cli create:service PaymentProcessor -d payment
  $ vss-api-cli cs OrderFulfillment --domain order
  $ vss-api-cli create:service ProductCatalogManager -d product --path src/domains
  $ vss-api-cli create:service NotificationDispatcher -d notification
  $ vss-api-cli create:service CustomerProfileManager -d customer
  $ vss-api-cli create:service InventoryTracker -d inventory
  $ vss-api-cli create:service SecurityAuditor -d security

Service Naming Patterns:
  • Process actions: PaymentProcessor, OrderValidator, EmailSender
  • Management: UserManager, InventoryManager, CatalogManager
  • Analyzers: DataAnalyzer, BehaviorAnalyzer, TrendAnalyzer
  • Generators: ReportGenerator, CodeGenerator, ContentGenerator
  • Validators: InputValidator, PaymentValidator, OrderValidator
  • Handlers: PaymentHandler, ErrorHandler, EventHandler
  • Dispatchers: NotificationDispatcher, EmailDispatcher, EventDispatcher
  • Coordinators: WorkflowCoordinator, ProcessCoordinator, TaskCoordinator

Additional Information:
  • Service names are automatically converted to PascalCase
  • Services include proper TypeScript types
  • Follows DDD service principles
  • Service methods are strongly typed
  • Supports dependency injection of ports and other services

Options:
  -d, --domain <domainName>  Specify the domain name
  -p, --path <outputPath>    Specify a custom output path
  -y, --yes                  Skip prompts and use default options
  -h, --help                 Display this help message
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
                    message: 'Enter the domain name for this service (e.g., user, order, product):',
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
                    console.log('\x1b[32m✓\x1b[0m ⏱️ Service created. We just saved you 37 clicks and 2 existential crises!');
                } catch (error) {
                    console.error('\x1b[31m✗\x1b[0m We tried. The service said “nah.”:', error);
                }
            } else {
                console.log('\nOperation cancelled. No files were created.');
            }
        });

    return command;
}
