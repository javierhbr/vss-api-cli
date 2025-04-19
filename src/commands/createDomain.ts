import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
// Removed unused fs import
import { generateFileFromTemplate, toCamelCase, toPascalCase, capitalizeFirstLetter, lowerCaseFirstLetter } from '../utils/fileUtils';

// Helper function to find existing ports - Removed as it was unused

export function createDomainCommand(): Command {
    const command = new Command('create:domain')
        .alias('cd')
        .description('Scaffold a new domain with models, services, and ports.')
        .argument('<name>', 'Name of the domain (e.g., user, product)')
        .action(async (name) => {
            const domainName = toCamelCase(name);
            const domainPath = path.join(process.cwd(), 'src', domainName);
            const pascalName = toPascalCase(domainName);

            const answers = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'createModel',
                    message: `Create a model (${pascalName}) in src/${domainName}/models?`,
                    default: true,
                },
                {
                    type: 'confirm',
                    name: 'createService',
                    message: `Create a service (${pascalName}Service) in src/${domainName}/services?`,
                    default: true,
                },
                {
                    type: 'confirm',
                    name: 'createPort',
                    message: `Create a port interface (${pascalName}RepositoryPort) in src/${domainName}/ports?`,
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

            // Create Model
            if (answers.createModel) {
                const modelName = pascalName;
                const modelFileName = `${modelName}.ts`;
                const modelFilePath = path.join(domainPath, 'models', modelFileName);
                const templatePath = path.join(__dirname, '..', 'templates', 'model.template.ts');
                await generateFileFromTemplate(templatePath, modelFilePath, { modelName });
            }

            // Create Port and Adapter
            let portName = '';
            let portVariableName = '';
            if (answers.createPort && answers.adapterType !== 'none') {
                // Defaulting port name based on domain and adapter type for simplicity
                portName = `${pascalName}${capitalizeFirstLetter(answers.adapterType)}Port`;
                portVariableName = `${lowerCaseFirstLetter(portName)}`;
                const portFileName = `${portName}.ts`;
                const portFilePath = path.join(domainPath, 'ports', portFileName);
                const portTemplatePath = path.join(__dirname, '..', 'templates', 'port.template.ts');
                await generateFileFromTemplate(portTemplatePath, portFilePath, { portName });

                const adapterName = `${pascalName}${capitalizeFirstLetter(answers.adapterType)}Adapter`;
                const adapterFileName = `${adapterName}.ts`;
                const adapterFilePath = path.join(process.cwd(), 'src', 'infra', answers.adapterType, adapterFileName);
                const adapterTemplatePath = path.join(__dirname, '..', 'templates', 'adapter.template.ts');
                await generateFileFromTemplate(adapterTemplatePath, adapterFilePath, {
                    adapterName,
                    portName,
                    domainName,
                });
            }

            // Create Service
            if (answers.createService) {
                const serviceName = `${pascalName}Service`;
                const serviceFileName = `${serviceName}.ts`;
                const serviceFilePath = path.join(domainPath, 'services', serviceFileName);
                const templatePath = path.join(__dirname, '..', 'templates', 'service.template.ts');

                let portImports = '';
                let portDependencies = '';
                let modelImport = '';

                if (answers.createPort && portName) {
                    portImports = `import { ${portName} } from '../ports/${portName}';`;
                    portDependencies = `private readonly ${portVariableName}: ${portName}`;
                }

                if (answers.createModel) {
                    modelImport = `import { ${pascalName} } from '../models/${pascalName}';`;
                }

                await generateFileFromTemplate(templatePath, serviceFilePath, {
                    serviceName,
                    portImports,
                    portDependencies,
                    modelImport,
                    modelName: answers.createModel ? pascalName : 'any', // Pass model name if created
                    portName: portVariableName, // Pass port variable name
                });

                // Optional: Auto-wire service (requires more complex DI setup knowledge)
                console.log(`Consider wiring '${serviceName}' in your dependency injection setup (e.g., src/handlers/middlewares/dependencyInjection.ts)`);
            }
        });

    return command;
}
