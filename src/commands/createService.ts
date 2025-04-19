import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import * as fs from 'fs-extra';
// Removed capitalizeFirstLetter as it was unused
import { generateFileFromTemplate, toCamelCase, toPascalCase, lowerCaseFirstLetter } from '../utils/fileUtils';

// Helper function to find existing domains (similar to createPort)
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

// Helper function to find existing ports (similar to createDomain)
async function findExistingPorts(domainName: string): Promise<{ name: string; value: { portName: string; variableName: string; importPath: string } }[]> {
    const portsDir = path.join(process.cwd(), 'src', domainName, 'ports');
    const portChoices: { name: string; value: { portName: string; variableName: string; importPath: string } }[] = [];

    try {
        if (await fs.pathExists(portsDir)) {
            const portFiles = await fs.readdir(portsDir);
            portFiles.forEach(file => {
                if (file.endsWith('Port.ts')) {
                    const portName = file.replace('.ts', '');
                    const variableName = lowerCaseFirstLetter(portName);
                    portChoices.push({
                        name: portName,
                        value: {
                            portName: portName,
                            variableName: variableName,
                            importPath: `../ports/${portName}`
                        }
                    });
                }
            });
        }
    } catch (error) {
        console.warn(`Could not automatically find existing ports for domain ${domainName}.`, error);
    }
    return portChoices;
}

export function createServiceCommand(): Command {
    const command = new Command('create:service')
        .alias('cs')
        .description('Generate a new domain service, optionally with model and port dependencies.')
        .argument('<name>', 'Name of the service (e.g., UserCreator, ProductFinder)')
        .option('-d, --domain <domainName>', 'Specify the domain name')
        .action(async (name, options) => {
            let domainName = options.domain;
            const pascalName = toPascalCase(name);
            const serviceName = `${pascalName}Service`; // Convention: UserCreator -> UserCreatorService

            const existingDomains = await findExistingDomains();

            if (!domainName && existingDomains.length > 0) {
                const domainAnswer = await inquirer.prompt([{
                    type: 'list',
                    name: 'domainName',
                    message: 'Which domain does this service belong to?',
                    choices: existingDomains,
                }]);
                domainName = domainAnswer.domainName;
            } else if (!domainName) {
                const domainAnswer = await inquirer.prompt([{
                    type: 'input',
                    name: 'domainName',
                    message: 'Enter the domain name for this service:',
                    validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty.',
                }]);
                domainName = toCamelCase(domainAnswer.domainName);
            }

            domainName = toCamelCase(domainName);
            const domainPath = path.join(process.cwd(), 'src', domainName);
            const serviceFileName = `${serviceName}.ts`;
            const serviceFilePath = path.join(domainPath, 'services', serviceFileName);
            const templatePath = path.join(__dirname, '..', 'templates', 'service.template.ts');

            const existingPorts = await findExistingPorts(domainName);

            const answers = await inquirer.prompt([
                {
                    type: 'confirm',
                    name: 'addModel',
                    message: `Create or use a model named '${pascalName}' in this service? (Creates if not exists)`, // Simplified: assumes model name matches service base name
                    default: true,
                },
                {
                    type: 'checkbox',
                    name: 'portDependencies',
                    message: 'Select port dependencies for this service:',
                    choices: existingPorts,
                    when: existingPorts.length > 0,
                },
                {
                    type: 'confirm',
                    name: 'autoWire',
                    message: 'Attempt to auto-wire this service in dependencyInjection.ts? (Experimental)',
                    default: false,
                },
            ]);

            let modelName = '';
            let modelImport = '';
            if (answers.addModel) {
                modelName = pascalName; // Assumes model name matches service base name
                const modelFileName = `${modelName}.ts`;
                const modelFilePath = path.join(domainPath, 'models', modelFileName);
                // Check if model exists, if not, create it
                if (!await fs.pathExists(modelFilePath)) {
                    const modelTemplatePath = path.join(__dirname, '..', 'templates', 'model.template.ts');
                    await generateFileFromTemplate(modelTemplatePath, modelFilePath, { modelName });
                    console.log(`Generated missing model: ${modelFilePath}`);
                }
                modelImport = `import { ${modelName} } from '../models/${modelName}';`;
            }

            let portImports = '';
            let portDependencies = '';
            if (answers.portDependencies && answers.portDependencies.length > 0) {
                portImports = answers.portDependencies
                    .map((dep: { portName: string; importPath: string }) => `import { ${dep.portName} } from '${dep.importPath}';`)
                    .join('\n');

                portDependencies = answers.portDependencies
                    .map((dep: { portName: string; variableName: string }) => `private readonly ${dep.variableName}: ${dep.portName}`)
                    .join(',\n    '); // Format for constructor parameters
            }

            await generateFileFromTemplate(templatePath, serviceFilePath, {
                serviceName,
                portImports,
                portDependencies,
                modelImport,
                modelName: modelName || 'any', // Pass model name or 'any'
                // Placeholders for method examples - these are harder to auto-generate meaningfully
                portName: answers.portDependencies?.[0]?.variableName || 'examplePort', // Use first port for example or default
            });

            if (answers.autoWire) {
                // Basic attempt to add to a hypothetical DI container setup
                // This is highly dependent on the actual DI implementation and might need manual adjustment
                const diFilePath = path.join(process.cwd(), 'src', 'handlers', 'middlewares', 'dependencyInjection.ts');
                console.log(`Attempting to auto-wire ${serviceName}. Please review ${diFilePath} manually.`);
                try {
                    if (await fs.pathExists(diFilePath)) {
                        let content = await fs.readFile(diFilePath, 'utf-8');
                        const importStatement = `import { ${serviceName} } from '../../${domainName}/services/${serviceName}';\n`;
                        // Basic check to avoid duplicate imports
                        if (!content.includes(importStatement)) {
                            // Add import (simple prepend)
                            content = importStatement + content;
                        }

                        // Find a place to register the service (very basic search)
                        const registrationMarker = '// Register services here';
                        const registration = `  container.register('${lowerCaseFirstLetter(serviceName)}', awilix.asClass(${serviceName}).scoped()); // Adjust scope as needed\n`;
                        if (content.includes(registrationMarker) && !content.includes(registration)) {
                            content = content.replace(registrationMarker, `${registrationMarker}\n${registration}`);
                        } else {
                            console.warn(`Could not find '${registrationMarker}' or service already registered in ${diFilePath}. Manual wiring required.`);
                        }
                        await fs.writeFile(diFilePath, content);
                    } else {
                        console.warn(`Dependency injection file not found at ${diFilePath}. Cannot auto-wire.`);
                    }
                } catch (error) {
                    console.error(`Error attempting to auto-wire service in ${diFilePath}:`, error);
                }
            }
        });

    return command;
}
