import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { toCamelCase, toPascalCase, displayWithPagination } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';
import { createDomainCommand } from './createDomain';

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

// Helper function to ensure suffix (copied from schematic for consistency)
function ensureSuffix(name: string, suffix: string): string {
  return name.endsWith(suffix) ? name : name + suffix;
}

/**
 * Generate a preview tree of files that will be created for a port
 */
function generateFilePreview(options: {
  name: string, // Raw name like PaymentsV3
  domain: string,
  path?: string,
  adapterType: string,
  portInterfaceName?: string // Optional custom name
}): string {
  const { name: rawName, domain, path: outputPath = '', adapterType, portInterfaceName: customPortName } = options;
  
  // Determine final port name (ensure suffix, NO adapter type)
  let finalPortName: string;
  if (customPortName) {
    finalPortName = ensureSuffix(toPascalCase(customPortName), 'Port');
  } else {
    finalPortName = `${toPascalCase(rawName)}Port`; // Default naming: <Name>Port
  }

  // Determine final adapter name (include type)
  const finalAdapterName = `${toPascalCase(rawName)}${toPascalCase(adapterType)}Adapter`;

  const domainName = toCamelCase(domain);
  const basePath = outputPath ? `${outputPath}/` : '';
  
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${basePath}src/\x1b[0m\n`;
  
  // Port interface
  preview += `\x1b[36m├── ${domainName}/ports/\x1b[0m\n`;
  preview += `\x1b[32m│   └── ${finalPortName}.ts\x1b[0m \x1b[90m- Port interface\x1b[0m\n`;
  
  // Adapter implementation
  if (adapterType !== 'none') { // Assuming 'none' might be an option later
    preview += `\x1b[36m└── infra/${adapterType}/\x1b[0m\n`;
    preview += `\x1b[32m    └── ${finalAdapterName}.ts\x1b[0m \x1b[90m- Adapter implementation\x1b[0m\n`;
  }
  
  return preview;
}

// Helper function to create a new domain and return its name
async function createNewDomain(options: { portName: string, path?: string }): Promise<string | null> {
  try {
    console.log('\n📂 Creating a new domain for your port...');
    
    // Get the domain command instance
    const domainCmd = createDomainCommand();
    
    // Prompt for domain name
    const domainAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'domainName',
        message: 'Enter a name for the new domain:',
        validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty'
      }
    ]);
    
    // Set up process arguments to pass to the domain command
    const domainName = domainAnswer.domainName;
    const args = ['create:domain', domainName];
    
    // Add path option if specified
    if (options.path) {
      args.push('--path', options.path);
    }
    
    // Execute the domain command programmatically
    await domainCmd.parseAsync([process.argv[0], process.argv[1], ...args], { from: 'user' });
    
    console.log(`\n✅ Domain "${domainName}" created. Now continuing with port creation...\n`);
    return domainName;
  } catch (error) {
    console.error('Failed to create domain:', error);
    return null;
  }
}

export function createPortCommand(): Command {
    const command = new Command('create:port')
        .alias('cp')
        .description('Generate a new port and adapter.')
        .argument('<n>', 'Port name (e.g., ProductRepository, UserDataAccess, PaymentGateway, NotificationService, FileStorage, AuthProvider, DataAnalytics, CacheManager)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-a, --adapter <adapterName>', 'Specify the adapter name')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-y, --yes', 'Skip prompts and use default options')
        .hook('preAction', async () => {
            // Show detailed help with pagination when --help is used
            if (process.argv.includes('--help')) {
                const helpContent = `
Description:
  Generates a new port (interface) and adapter (implementation) based on
  the hexagonal architecture pattern. Ports define the contracts between
  your domain and the outside world, while adapters implement these contracts.

Structure Generated:
  └── src/
      └── {domainName}/        # Domain root folder
          └── ports/           # Port interfaces folder
              └── {name}.ts    # Port interface definition
          └── adapters/        # Adapter implementations folder
              └── {adapter}.ts # Adapter implementation

Features:
  • Clean architecture port/adapter pattern
  • Dependency inversion
  • Interface-based design
  • Type-safe method signatures
  • Decoupled infrastructure concerns

Examples:
  $ vss-api-cli create:port UserRepository -d user -a PostgresUserRepository
  $ vss-api-cli create:port PaymentGateway -d payment -a StripePaymentGateway
  $ vss-api-cli cp OrderStorage -d order -a MongoOrderStorage
  $ vss-api-cli create:port NotificationService -d notification -a EmailNotificationService
  $ vss-api-cli create:port AuthenticationProvider -d auth -a JwtAuthProvider
  $ vss-api-cli create:port ProductCatalog -d product -a ElasticSearchProductCatalog
  $ vss-api-cli create:port InventoryTracker -d inventory -a RedisInventoryTracker
  $ vss-api-cli create:port FileStorage -d document -a S3FileStorage

Port Naming Patterns:
  • Repository: UserRepository, ProductRepository, OrderRepository
  • Gateway: PaymentGateway, AuthGateway, ApiGateway, IntegrationGateway
  • Provider: AuthProvider, DataProvider, ConfigProvider, IdentityProvider
  • Service: NotificationService, EmailService, SmsService, MessagingService
  • Manager: CacheManager, SessionManager, ConfigManager, ConnectionManager
  • Client: HttpClient, DatabaseClient, ApiClient, MessagingClient
  • Storage: FileStorage, DocumentStorage, BlobStorage, DataStorage
  • Factory: EntityFactory, DtoFactory, ServiceFactory, AdapterFactory

Adapter Naming Patterns:
  • Technology-specific: PostgresUserRepository, MongoUserRepository
  • Vendor-specific: StripePaymentGateway, AwsFileStorage
  • Implementation-specific: RestApiClient, GraphqlClient
  • Protocol-specific: HttpNotificationService, WebSocketNotificationService

Additional Information:
  • Port names are automatically converted to PascalCase
  • Adapter names are automatically converted to PascalCase
  • Follows dependency inversion principle
  • Enables testability through adapter mocking
  • Supports infrastructure swapping with minimal impact

Options:
  -d, --domain <domainName>    Specify the domain name
  -a, --adapter <adapterName>  Specify the adapter name
  -p, --path <outputPath>      Specify a custom output path
  -y, --yes                    Skip prompts and use default options
  -h, --help                   Display this help message
`;
                await displayWithPagination(helpContent);
                process.exit(0);
            }
        })
        .action(async (name, options) => {
            let domainName = options.domain;
            let adapterType = options.type;
            let proceed = options.yes;

            const existingDomains = await findExistingDomains();

            // Prompt for domain if not provided
            if (!domainName && existingDomains.length > 0) {
                const CREATE_NEW_DOMAIN = '+ Create new domain...';
                const domainAnswer = await inquirer.prompt({
                    type: 'list',
                    name: 'domainName',
                    message: 'Which domain does this port belong to?',
                    choices: [...existingDomains, new inquirer.Separator(), CREATE_NEW_DOMAIN],
                });
                
                // Handle the option to create a new domain
                if (domainAnswer.domainName === CREATE_NEW_DOMAIN) {
                    const newDomainName = await createNewDomain({ portName: name, path: options.path });
                    if (newDomainName) {
                        domainName = newDomainName;
                    } else {
                        console.log('Domain creation cancelled or failed. Port creation process will now exit.');
                        return;
                    }
                } else {
                    domainName = domainAnswer.domainName;
                }
            } else if (!domainName) {
                // Prompt specifically asking if they want to create a new domain or enter one
                const domainTypeAnswer = await inquirer.prompt({
                    type: 'list',
                    name: 'domainType',
                    message: 'No existing domains found. What would you like to do?',
                    choices: ['Create a new domain', 'Enter domain name manually']
                });
                
                if (domainTypeAnswer.domainType === 'Create a new domain') {
                    const newDomainName = await createNewDomain({ portName: name, path: options.path });
                    if (newDomainName) {
                        domainName = newDomainName;
                    } else {
                        console.log('Domain creation cancelled or failed. Port creation process will now exit.');
                        return;
                    }
                } else {
                    const domainAnswer = await inquirer.prompt({
                        type: 'input',
                        name: 'domainName',
                        message: 'Enter the domain name for this port (e.g., user, product, order):',
                        validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty.',
                    });
                    domainName = domainAnswer.domainName;
                }
            }

            // Prompt for adapter type if not provided
            if (!adapterType) {
                const typeAnswer = await inquirer.prompt({
                    type: 'list',
                    name: 'adapterType',
                    message: 'What type of adapter will implement this port?',
                    choices: ['repository', 'rest', 'graphql', 'queue', 'cache', 'storage'],
                    default: 'repository',
                });
                adapterType = typeAnswer.adapterType;
            }

            domainName = toCamelCase(domainName);
            const portName = toPascalCase(name);

            // Generate options for the schematic (pass custom name if provided)
            const schematicOptions = {
                name: portName, // Use the raw name for schematic logic
                domain: domainName,
                path: options.path || '',
                adapterType,
                portInterfaceName: options.portInterfaceName // Pass custom name if provided
            };

            // Generate and show file preview with pagination using the same options
            const filePreview = generateFilePreview(schematicOptions);
            await displayWithPagination(`\n🔹 Create a Port: ${portName}Port for domain ${domainName}\n${filePreview}`);

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
                    console.log('⏱️ Port and adapter created. We just saved you 37 clicks and 2 existential crises!!');
                } catch (error) {
                    console.error('We tried. The  port said “nah.”:', error);
                }
            } else {
                console.log('\nOperation cancelled. No files were created.');
            }
        });

    return command;
}
