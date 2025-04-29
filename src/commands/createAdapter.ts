import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { toPascalCase, toDasherize, displayWithPagination, applyFilePatterns } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';
import { createDomainInteractively } from '../utils/domainUtils';
import { loadConfig } from '../utils/configLoader';

// Helper function to find existing domains
async function findExistingDomains(): Promise<string[]> {
    const srcDir = path.join(process.cwd(), 'src');
    try {
        const entries = await fs.readdir(srcDir, { withFileTypes: true });
        return entries
            .filter(entry => entry.isDirectory() && entry.name !== 'handlers' && entry.name !== 'infra')
            .map(entry => entry.name);
    } catch (error) {
        console.warn(`Warning: Could not read src directory. ${(error as Error).message}`);
        return [];
    }
}

// Helper function to find ports in a specific domain
async function findPortsInDomain(domain: string): Promise<string[]> {
    // Look in multiple possible locations for the ports
    const possibleDirs = [
        path.join(process.cwd(), 'src', domain, 'ports'),
        path.join(process.cwd(), 'test-outcome', 'src', domain, 'ports')
    ];
    
    let allPorts: string[] = [];
    
    for (const dir of possibleDirs) {
        try {
            if (await fs.pathExists(dir)) {
                const entries = await fs.readdir(dir);
                console.log(`Found ${entries.length} files in ${dir}: ${entries.join(', ')}`);
                
                const ports = entries
                    .filter(entry => entry.endsWith('Port.ts'))
                    .map(entry => entry.replace('.ts', ''));
                
                allPorts = [...allPorts, ...ports];
            }
        } catch (error) {
            console.warn(`Warning: Could not read ports in ${dir}. ${(error as Error).message}`);
        }
    }
    
    return allPorts;
}

export function createAdapterCommand(): Command {
    const command = new Command('create:adapter')
        .description('Create a new adapter implementation for an existing port')
        .alias('ca')
        .argument('<name>', 'Name of the adapter to create')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-t, --type <adapterType>', 'Type of adapter (repository, rest, graphql, queue, storage)', 'repository')
        // CamelCase alias for type
        .option('--adapterType <adapterType>', 'Alias for -t, --type')
        // Optionally also generate a domain model for this adapter (no-op)
        .option('--model', 'Generate a domain model for this adapter')
        .option('--port <portName>', 'Name of the port interface this adapter implements')
        .option('-y, --yes', 'Skip prompts and use default options')
        .hook('preAction', async () => {
            // Show detailed help with pagination when --help is used
            if (process.argv.includes('--help')) {
                const helpContent = `
Description:
  Creates a new adapter implementation for an existing port interface.
  Adapters connect your domain logic to external infrastructure like
  databases, APIs, or other services by implementing port interfaces.

Structure Generated:
  \`\`\`
  src/
  └── infra/
      └── {adapterType}/           # Infrastructure layer folder (repository, rest, etc.)
          └── {name}{Type}Adapter.ts  # Adapter implementation of a port interface
  \`\`\`

Features:
  • Clean architecture adapter implementation
  • Port interface implementation
  • Type-safe code with TypeScript
  • Infrastructure dependency isolation
  • Follows dependency inversion principle

Examples:
  $ vss-api-cli create:adapter UserMongo -d user --port UserRepositoryPort -t repository
  $ vss-api-cli create:adapter StripePayment -d payment --port PaymentGatewayPort -t rest
  $ vss-api-cli ca ProductElastic -d product --port ProductSearchPort -t graphql
  $ vss-api-cli create:adapter S3Document -d document --port DocumentStoragePort -t storage
  $ vss-api-cli create:adapter RedisCache -d user --port UserCachePort -t cache

Adapter Type Patterns:
  • repository: Database access implementations (MongoDB, PostgreSQL, DynamoDB)
  • rest: REST API client implementations (Axios, Fetch, custom HTTP clients)
  • graphql: GraphQL API client implementations
  • queue: Message queue implementations (SQS, Kafka, RabbitMQ)
  • storage: File storage implementations (S3, local filesystem)
  • cache: Caching implementations (Redis, Memcached, in-memory)

Additional Information:
  • Adapter names should describe the technology or implementation approach
  • The command helps you select from available domains and ports
  • Generated adapters include implementation stubs for all port methods
  • You can customize the adapter name and type via options
  • Follows best practices for clean architecture

Options:
  -d, --domain <domainName>    Specify the domain name that contains the port
  --port <portName>            Name of the port interface this adapter implements
  -t, --type <adapterType>     Type of adapter (repository, rest, graphql, queue, storage)
  -p, --path <outputPath>      Specify a custom output path
  -y, --yes                    Skip prompts and use default options
  -h, --help                   Display this help message
`;
                await displayWithPagination(helpContent);
                process.exit(0);
            }
        })
        .action(async (name: string, options: any) => {
            try {
                // Display welcome banner for the create:adapter command
                const welcomeAction = 'Creating a new adapter implementation';
                const welcomeDescription = 'This will generate an adapter class that implements a port interface';

                // Example of using ANSI colors for better formatting
                console.clear();
                console.log(`\x1b[36m\n>> ${welcomeAction}\x1b[0m`);
                console.log(`\x1b[90m${welcomeDescription}\x1b[0m\n`);

                // Get domains and available port options
                const existingDomains = await findExistingDomains();
                
                // If no domains exist, suggest creating one first
                if (existingDomains.length === 0) {
                    console.log('\x1b[33mNo domains found in the project.\x1b[0m');
                    if (!options.yes) {
                        const { createDomain } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'createDomain',
                            message: 'Would you like to create a domain first?',
                            default: true
                        }]);
                        
                        if (createDomain) {
                            const domainName = await createDomainInteractively({
                                message: 'Enter a name for the new domain:',
                                showHeader: true,
                                path: options.path
                            });
                            options.domain = domainName;
                        } else {
                            console.log('\x1b[31mCannot create adapter without a domain.\x1b[0m');
                            return;
                        }
                    } else {
                        console.log('\x1b[31mCannot create adapter without a domain.\x1b[0m');
                        return;
                    }
                }

                // If domain not specified, prompt for it
                if (!options.domain && !options.yes) {
                    const { domain } = await inquirer.prompt([{
                        type: 'list',
                        name: 'domain',
                        message: 'Which domain does this adapter belong to?',
                        choices: [...existingDomains, new inquirer.Separator(), '+ Create new domain...'],
                        pageSize: 10
                    }]);
                    
                    if (domain === '+ Create new domain...') {
                        options.domain = await createDomainInteractively({
                            message: 'Enter a name for the new domain:',
                            path: options.path,
                            showHeader: true
                        });
                    } else {
                        options.domain = domain;
                    }
                }

                // Find available ports in selected domain
                let availablePorts: string[] = [];
                if (options.domain) {
                    availablePorts = await findPortsInDomain(options.domain);
                }

                if (availablePorts.length === 0) {
                    console.log(`\x1b[33mNo ports found in the domain '${options.domain}'.\x1b[0m`);
                    if (!options.yes) {
                        const { createPort } = await inquirer.prompt([{
                            type: 'confirm',
                            name: 'createPort',
                            message: 'Would you like to create a port first?',
                            default: true
                        }]);
                        
                        if (createPort) {
                            // Redirect to port creation command
                            console.log('\x1b[36mRedirecting to port creation...\x1b[0m');
                            await runSchematic(
                                'port',
                                {
                                    name,
                                    domain: options.domain,
                                    ...(options.path && { path: options.path })
                                }
                            );
                            return;
                        } else {
                            console.log('\x1b[31mCannot create adapter without a port.\x1b[0m');
                            return;
                        }
                    } else {
                        console.log('\x1b[31mCannot create adapter without a port.\x1b[0m');
                        return;
                    }
                }

                // If port not specified, prompt for it
                if (!options.port && !options.yes) {
                    const { port } = await inquirer.prompt([{
                        type: 'list',
                        name: 'port',
                        message: 'Which port does this adapter implement?',
                        choices: availablePorts,
                        pageSize: 10
                    }]);
                    options.port = port;
                }

                // If adapter type not specified, prompt for it
                if (!options.type && !options.yes) {
                    const { adapterType } = await inquirer.prompt([{
                        type: 'list',
                        name: 'adapterType',
                        message: 'What type of adapter is this?',
                        choices: ['repository', 'rest', 'graphql', 'queue', 'storage'],
                        default: 'repository'
                    }]);
                    options.type = adapterType;
                }

                // Load config to get fileNameCase
                const config = loadConfig(options.path || '.');
                const basePath = options.path || '.';
                
                // Determine final adapter name
                const adapterType = options.type || 'repository';
                const finalPortName = `${toPascalCase(options.port || availablePorts[0])}`;
                const finalAdapterName = `${toPascalCase(name)}${toPascalCase(adapterType)}Adapter`;
                
                // Template variables for file pattern processing
                const dashName = toDasherize(name);
                const domainName = options.domain;
                const templateVars = {
                    name,
                    pascalName: toPascalCase(name),
                    dashName,
                    camelName: name.charAt(0).toLowerCase() + name.slice(1),
                    domainName,
                    adapterType
                };
                
                // Apply file patterns from config
                const adapterFileInfo = applyFilePatterns('adapter', 'adapterFile', config, {
                    ...templateVars, 
                    name: finalAdapterName
                }, basePath);
                
                // Run schematic with parsed options
                await runSchematic(
                    'adapter',
                    {
                        name,
                        domain: options.domain,
                        port: options.port || availablePorts[0],
                        adapterType: options.type || 'repository',
                        fileNameCase: config.fileNameCase || 'pascal',
                        _config: config,
                        ...(options.path && { path: options.path }),
                        
                        // Pass file paths to schematic
                        adapterFilePath: adapterFileInfo.filePath,
                        adapterFileName: adapterFileInfo.fileName,
                        portName: finalPortName
                    }
                );

                console.log(`\n\x1b[32m✅ Adapter '${toPascalCase(name)}${toPascalCase(options.type || 'repository')}Adapter' created successfully! 🔌\x1b[0m`);
            } catch (error: any) {
                if (error && error.name === 'ExitPromptError') {
                    console.log('\n👋 Adapter creation cancelled! Time to implement another day! 🔧');
                    process.exit(0);
                } else if (error && error.message && error.message.includes('already exist')) {
                    // Handle file already exists error with a nicer message
                    const filePath = error.message.match(/Path "([^"]+)"/)?.[1] || '';
                    console.error('\n\x1b[33m⚠️  File conflict detected!\x1b[0m');
                    console.error(`\x1b[33mIt looks like a file or directory already exists: ${filePath}\x1b[0m`);
                    console.log('\n\x1b[36mSuggestions:\x1b[0m');
                    console.log('  • Try a different adapter name');
                    console.log('  • Use a different output path with -p option');
                    console.log('  • Use --force option to overwrite existing files (coming soon)');
                } else {
                    console.error('\n\x1b[31mError creating adapter:', (error as Error).message, '\x1b[0m');
                    process.exit(1);
                }
            }
        });

    return command;
}