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

export function createServiceCommand(): Command {
    const command = new Command('create:service')
        .alias('cs')
        .description('Generate a new domain service.')
        .argument('<n>', 'Name of the service (e.g., UserFinder, PaymentProcessor)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .action(async (name, options) => {
            let domainName = options.domain;

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

            // Use the service schematic instead of file templates
            try {
                console.log(`Generating service ${serviceName}Service for domain ${domainName}...`);
                await runSchematic('service', {
                    name: serviceName,
                    domain: domainName,
                    path: options.path || '' // Pass the output path if specified
                });
                console.log('Service created successfully!');
            } catch (error) {
                console.error('Failed to create service:', error);
            }
        });

    return command;
}
