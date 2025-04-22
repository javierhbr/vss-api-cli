import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { toPascalCase } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';
import { createDomainInteractively } from '../utils/domainUtils';

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
    const domainPortsDir = path.join(process.cwd(), 'src', domain, 'ports');
    try {
        if (!await fs.pathExists(domainPortsDir)) {
            return [];
        }
        const entries = await fs.readdir(domainPortsDir);
        return entries
            .filter(entry => entry.endsWith('Port.ts'))
            .map(entry => entry.replace('.ts', ''));
    } catch (error) {
        console.warn(`Warning: Could not read ports in domain ${domain}. ${(error as Error).message}`);
        return [];
    }
}

export function createAdapterCommand(): Command {
    const command = new Command('create:adapter')
        .description('Create a new adapter implementation for an existing port')
        .alias('ca')
        .argument('<name>', 'Name of the adapter to create')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-t, --type <adapterType>', 'Type of adapter (repository, rest, graphql, queue, storage)', 'repository')
        .option('--port <portName>', 'Name of the port interface this adapter implements')
        .option('-y, --yes', 'Skip prompts and use default options')
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

                // Run schematic with parsed options
                await runSchematic(
                    'adapter',
                    {
                        name,
                        domain: options.domain,
                        port: options.port || availablePorts[0],
                        adapterType: options.type || 'repository',
                        ...(options.path && { path: options.path })
                    }
                );

                console.log(`\n\x1b[32m✅ Adapter '${toPascalCase(name)}${toPascalCase(options.type || 'repository')}Adapter' created successfully! 🔌\x1b[0m`);
            } catch (error: any) {
                if (error && error.name === 'ExitPromptError') {
                    console.log('\n👋 Mission aborted! The user yeeted the command into the void. Farewell, brave keystroke warrior! 🫡💥');
                    process.exit(0);
                } else {
                    console.error('\n\x1b[31mError creating adapter:', (error as Error).message, '\x1b[0m');
                    process.exit(1);
                }
            }
        });

    return command;
}