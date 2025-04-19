import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
import { generateFileFromTemplate, toCamelCase, toPascalCase } from '../utils/fileUtils';

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
        .argument('<name>', 'Name of the port (e.g., UserFinder, PaymentGateway)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .option('-t, --type <adapterType>', 'Specify the adapter type (repository, rest, graphql)')
        .action(async (name, options) => {
            let domainName = options.domain;
            let adapterType = options.type;

            const existingDomains = await findExistingDomains();

            const questions = [];
            if (!domainName && existingDomains.length > 0) {
                questions.push({
                    type: 'list',
                    name: 'domainName',
                    message: 'Which domain does this port belong to?',
                    choices: existingDomains,
                });
            } else if (!domainName) {
                 questions.push({
                    type: 'input',
                    name: 'domainName',
                    message: 'Enter the domain name for this port:',
                    validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty.',
                });
            }

            if (!adapterType) {
                questions.push({
                    type: 'list',
                    name: 'adapterType',
                    message: 'What type of adapter will implement this port?',
                    choices: ['repository', 'rest', 'graphql'],
                    default: 'repository',
                });
            }

            // Change the way questions are handled - pass questions one by one if array is not empty
            let answers: any = {};
            
            if (questions.length > 0) {
                if (!domainName && existingDomains.length > 0) {
                    const domainAnswer = await inquirer.prompt({
                        type: 'list',
                        name: 'domainName',
                        message: 'Which domain does this port belong to?',
                        choices: existingDomains,
                    });
                    answers = { ...answers, ...domainAnswer };
                } else if (!domainName) {
                    const domainAnswer = await inquirer.prompt({
                        type: 'input',
                        name: 'domainName',
                        message: 'Enter the domain name for this port:',
                        validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty.',
                    });
                    answers = { ...answers, ...domainAnswer };
                }

                if (!adapterType) {
                    const typeAnswer = await inquirer.prompt({
                        type: 'list',
                        name: 'adapterType',
                        message: 'What type of adapter will implement this port?',
                        choices: ['repository', 'rest', 'graphql'],
                        default: 'repository',
                    });
                    answers = { ...answers, ...typeAnswer };
                }
            }

            domainName = toCamelCase(domainName || answers.domainName);
            adapterType = adapterType || answers.adapterType;
            const portName = `${toPascalCase(name)}Port`;
            const adapterName = `${toPascalCase(name)}Adapter`;

            // Create Port Interface
            const portFileName = `${portName}.ts`;
            const portFilePath = path.join(process.cwd(), 'src', domainName, 'ports', portFileName);
            const portTemplatePath = path.join(__dirname, '..', 'templates', 'port.template.ts');
            await generateFileFromTemplate(portTemplatePath, portFilePath, { portName });

            // Create Adapter Implementation
            const adapterFileName = `${adapterName}.ts`;
            const adapterFilePath = path.join(process.cwd(), 'src', 'infra', adapterType, adapterFileName);
            const adapterTemplatePath = path.join(__dirname, '..', 'templates', 'adapter.template.ts');
            await generateFileFromTemplate(adapterTemplatePath, adapterFilePath, {
                adapterName,
                portName,
                domainName,
            });
        });

    return command;
}
