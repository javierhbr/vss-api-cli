import { Command } from 'commander';
import inquirer from 'inquirer';
import { toDasherize } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';

/**
 * Generate a preview tree of files that will be created for a handler
 */
function generateFilePreview(options: {
  name: string,
  path?: string,
  schema?: boolean
}): string {
  const { name, path: outputPath = '', schema = false } = options;
  const dashedName = toDasherize(name);
  const basePath = outputPath ? `${outputPath}/` : '';
  
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${basePath}src/handlers/\x1b[0m\n`;
  preview += `\x1b[32m└── ${dashedName}.handler.ts\x1b[0m \x1b[90m- API handler function\x1b[0m\n`;
  
  if (schema) {
    preview += `\x1b[32m└── ${dashedName}Schema.ts\x1b[0m \x1b[90m- Request validation schema\x1b[0m\n`;
  }
  
  return preview;
}

export function createHandlerCommand(): Command {
    const command = new Command('create:handler')
        .alias('ch')
        .description('Generate a new API handler with request schema validation.')
        .argument('<n>', 'Handler name (e.g., createUser, listProducts)')
        .option('-s, --schema', 'Generate a schema file for request validation')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .option('-y, --yes', 'Skip prompts and use default options')
        .action(async (name, cmdOptions) => {
            let schema = cmdOptions.schema;
            let proceed = cmdOptions.yes;
            
            // Only prompt for schema if not specified and not in non-interactive mode
            if (schema === undefined && !cmdOptions.yes) {
                const answers = await inquirer.prompt([
                    {
                        type: 'confirm',
                        name: 'schema',
                        message: 'Generate a schema file for request validation?',
                        default: false,
                    }
                ]);
                schema = answers.schema;
            }

            // Generate options for the schematic
            const schematicOptions = {
                name,
                path: cmdOptions.path || '',
                schema
            };
            
            // Generate and show file preview
            const filePreview = generateFilePreview(schematicOptions);
            console.log(filePreview);
            
            // Ask for confirmation unless --yes flag is used
            if (!cmdOptions.yes) {
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
                    console.log(`\nGenerating handler ${name}...`);
                    await runSchematic('handler', schematicOptions);
                    console.log('\x1b[32m✓\x1b[0m Handler created successfully!');
                } catch (error) {
                    console.error('\x1b[31m✗\x1b[0m Failed to create handler:', error);
                }
            } else {
                console.log('\nOperation cancelled. No files were created.');
            }
        });

    return command;
}
