import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { toCamelCase, toPascalCase, displayWithPagination } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';
import { createDomainInteractively } from '../utils/domainUtils';

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
  const { name, domain, path: basePath = '.' } = options;
  const serviceName = `${toPascalCase(name)}Service`;
  const domainName = toCamelCase(domain);
  const previewBasePath = basePath === '.' ? '' : `${basePath}/`;
  const srcPreviewPath = `${previewBasePath}src`;

  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${srcPreviewPath}/${domainName}/services/\x1b[0m\n`;
  preview += `\x1b[32m└── ${serviceName}.ts\x1b[0m \x1b[90m- Service implementation\x1b[0m\n`;
  
  return preview;
}

export function createServiceCommand(): Command {
    const command = new Command('create:service')
        .alias('cs')
        .description('Generate a new domain service.')
        .argument('<name>', 'Service name (e.g., UserCreator, ProductFinder)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-p, --path <outputPath>', 'Specify a custom base output path')
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
            try {
                let domainName = options.domain;
                let proceed = options.yes;
                const basePath = options.path || '.';

                const existingDomains = await findExistingDomains();

                // Prompt for domain if not provided
                if (!domainName && existingDomains.length > 0) {
                    const CREATE_NEW_DOMAIN = 'new domain?';
                    const domainAnswer = await inquirer.prompt({
                        type: 'list',
                        name: 'domainName',
                        message: 'Which domain does this service belong to?',
                        choices: [...existingDomains, new inquirer.Separator(), CREATE_NEW_DOMAIN],
                    });
                    
                    if (domainAnswer.domainName === CREATE_NEW_DOMAIN) {
                        const newDomainName = await createDomainInteractively({ 
                            path: basePath !== '.' ? basePath : '',
                            message: 'Enter a name for the new domain:',
                            showHeader: true
                        });
                        
                        if (newDomainName) {
                            console.log(`\n✅ Domain "${newDomainName}" created. Now continuing with service creation...\n`);
                            domainName = newDomainName;
                        } else {
                            console.log('Domain creation cancelled or failed. Service creation process will now exit.');
                            return;
                        }
                    } else {
                        domainName = domainAnswer.domainName;
                    }
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
                    path: basePath // Pass base path to schematic
                };
                
                // Generate and show file preview with pagination
                const filePreview = generateFilePreview({
                    name: serviceName,
                    domain: domainName,
                    path: basePath
                });
                await displayWithPagination(`\n🔹 Create a Service: ${serviceName}Service for domain ${domainName}\n${filePreview}`);
                
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
                        console.log(`Generating service ${name}...`);
                        await runSchematic('service', schematicOptions);
                        console.log('\x1b[32m✅ Service created successfully! ⚡\x1b[0m');
                    } catch (error) {
                        console.error('Error generating service:', error);
                    }
                } else {
                    console.log('\nOperation cancelled. No files were created.');
                }
            } catch (error: any) {
                if (error && error.name === 'ExitPromptError') {
                    console.log('\n👋 Mission aborted! The user yeeted the command into the void. Farewell, brave keystroke warrior! 🫡💥');
                    process.exit(0);
                } else {
                    console.error('\n\x1b[31mAn unexpected error occurred:\x1b[0m', error);
                    process.exit(1);
                }
            }
        });

    return command;
}
