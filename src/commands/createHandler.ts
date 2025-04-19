import { Command } from 'commander';
import inquirer from 'inquirer';
import * as path from 'path';
import { generateFileFromTemplate, toCamelCase, toPascalCase } from '../utils/fileUtils';

export function createHandlerCommand(): Command {
  const command = new Command('create:handler')
    .alias('ch')
    .description('Generate a new Middy handler and optional Zod schema.')
    .argument('<name>', 'Name of the handler (e.g., createUser, getUserById)')
    .option('-s, --schema', 'Generate a Zod schema for input validation')
    .action(async (name, options) => {
      const handlerName = toCamelCase(name);
      const handlerFileName = `${handlerName}.handler.ts`;
      const handlerFilePath = path.join(process.cwd(), 'src', 'handlers', handlerFileName);
      const templatePath = path.join(__dirname, '..', 'templates', 'handler.template.ts');

      const replacements: Record<string, string> = {
        serviceName: handlerName, // Placeholder, might need adjustment based on domain/service linkage
        domainName: 'unknown', // Placeholder, needs context
        schemaName: 'null', // Default if no schema
      };

      await generateFileFromTemplate(templatePath, handlerFilePath, replacements);

      let createSchema = options.schema;
      if (!createSchema && process.stdout.isTTY) { // Ask only if not specified and in interactive terminal
        const answers = await inquirer.prompt([
          {
            type: 'confirm',
            name: 'createSchema',
            message: 'Generate a Zod schema for input validation?',
            default: false,
          },
        ]);
        createSchema = answers.createSchema;
      }

      if (createSchema) {
        const schemaName = `${handlerName}Schema`;
        const typeName = `${toPascalCase(handlerName)}Payload`; // Or a more suitable name
        const schemaFileName = `${schemaName}.ts`;
        const schemaFilePath = path.join(process.cwd(), 'src', 'handlers', 'schemas', schemaFileName);
        const schemaTemplatePath = path.join(__dirname, '..', 'templates', 'schema.template.ts');

        await generateFileFromTemplate(schemaTemplatePath, schemaFilePath, {
          schemaName: schemaName,
          typeName: typeName,
        });

        // Update handler template replacements if schema is created
        replacements.schemaName = schemaName;
        // Re-generate handler to include schema import/usage (or modify existing file)
        // For simplicity, we regenerate here. A more robust solution would modify the file.
        console.log(`Note: You might need to manually uncomment schema validation in ${handlerFilePath}`);
        // await generateFileFromTemplate(templatePath, handlerFilePath, replacements); // Re-generate with updated schema name
      }
    });

  return command;
}
