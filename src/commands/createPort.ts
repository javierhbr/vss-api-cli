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

export function createPortCommand(): Command {
    const command = new Command('create:port')
        .alias('cp')
        .description('Generate a new domain port interface and its infrastructure adapter implementation.')
        .argument('<n>', 'Name of the port (e.g., UserFinder, PaymentGateway)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-t, --type <adapterType>', 'Specify the adapter type (repository, rest, graphql)')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .action(async (name, options) => {
            let domainName = options.domain;
            let adapterType = options.type;

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

            // Use the port schematic instead of file templates
            try {
                console.log(`Generating port ${portName}Port for domain ${domainName} with ${adapterType} adapter...`);
                await runSchematic('port', {
                    name: portName,
                    domain: domainName,
                    adapterType: adapterType,
                    path: options.path || '' // Pass the output path if specified
                });
                console.log('Port and adapter created successfully!');
            } catch (error) {
                console.error('Failed to create port:', error);
            }
        });

    return command;
}
