import { Command } from 'commander';
import inquirer from 'inquirer';
import { toCamelCase, toPascalCase } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';

export function createDomainCommand(): Command {
    const command = new Command('create:domain')
        .alias('cd')
        .description('Scaffold a new domain with models, services, and ports.')
        .argument('<domainName>', 'Name of the domain (e.g., user, product)')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .action(async (domainName, cmdOptions) => {
            const camelName = toCamelCase(domainName);
            const pascalName = toPascalCase(camelName);

            const answers = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'createModel',
                    message: `Create a model (${pascalName})?`,
                    default: true,
                },
                {
                    type: 'confirm',
                    name: 'createService',
                    message: `Create a service (${pascalName}Service)?`,
                    default: true,
                },
                {
                    type: 'confirm',
                    name: 'createPort',
                    message: `Create a port interface (${pascalName}RepositoryPort)?`,
                    default: true,
                },
                {
                    type: 'list',
                    name: 'adapterType',
                    message: 'If creating a port, what type of adapter should implement it?',
                    choices: ['repository', 'rest', 'graphql', 'none'],
                    default: 'repository',
                    when: (ans) => ans.createPort,
                },
            ]);

            // Use the schematic approach instead of direct file generation
            try {
                console.log(`Generating domain ${domainName}...`);
                await runSchematic('domain', {
                    name: domainName,
                    path: cmdOptions.path || '',
                    model: answers.createModel,
                    service: answers.createService,
                    port: answers.createPort,
                    adapterType: answers.adapterType || 'repository'
                });
                console.log('Domain created successfully!');
            } catch (error) {
                console.error('Failed to create domain:', error);
            }
        });

    return command;
}
