import { Command } from 'commander';
import inquirer from 'inquirer';
import { toPascalCase, toDasherize, displayWithPagination } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';

/**
 * Generate a preview tree of files that will be created for a handler
 */
function generateFilePreview(options: {
  name: string,
  path?: string,
  schema?: boolean
}): string {
  const { name, path: basePath = '.', schema } = options;
  const handlerName = toDasherize(name);
  const previewBasePath = basePath === '.' ? '' : `${basePath}/`;
  const srcPreviewPath = `${previewBasePath}src`;

  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${srcPreviewPath}/handlers/\x1b[0m\n`;
  preview += `\x1b[32m├── ${handlerName}.handler.ts\x1b[0m \x1b[90m- Handler function\x1b[0m\n`;
  if (schema) {
    preview += `\x1b[32m└── ${toPascalCase(name)}Schema.ts\x1b[0m \x1b[90m- Validation schema\x1b[0m\n`;
  }
  
  return preview;
}

export function createHandlerCommand(): Command {
    const command = new Command('create:handler')
        .alias('ch')
        .description('Generate a new API handler.')
        .argument('<name>', 'Handler name (e.g., createUser, getProduct)')
        .option('-p, --path <outputPath>', 'Specify a custom base output path')
        .option('-s, --schema', 'Generate schema validation files')
        .option('--no-validation', 'Skip schema validation setup')
        .option('-y, --yes', 'Skip prompts and use default options')
        .hook('preAction', async () => {
            // Show detailed help with pagination when --help is used
            if (process.argv.includes('--help')) {
                const helpContent = `
Description:
  Creates a new AWS Lambda handler with Middy middleware setup.
  Includes optional request/response schema validation using JSON Schema,
  error handling, and proper TypeScript types.

Structure Generated:
  \`\`\`
  src/
  └── handlers/
      ├── {name}.handler.ts      # Main Lambda handler with Middy setup
      └── {name}Schema.ts        # JSON Schema validation (if --schema flag used)
  \`\`\`

Features:
  • Automatic Middy middleware configuration
  • JSON Schema validation for request/response
  • Error handling middleware
  • Proper TypeScript types
  • AWS Lambda context typing
  • Middleware composition

Examples:
  $ vss-api-cli create:handler createUser
  $ vss-api-cli create:handler updateOrder --schema
  $ vss-api-cli create:handler getProduct --path src/functions
  $ vss-api-cli ch deleteUser --no-validation

Additional Information:
  • Handlers are created with proper AWS Lambda types
  • Includes standard middleware for parsing, validation, and error handling
  • Schema files use JSON Schema format with TypeScript types
  • All generated code includes JSDoc documentation
  • Follows AWS Lambda best practices
  • Includes error handling patterns

Options:
  -p, --path <outputPath>     Specify a custom output path for the handler
  -s, --schema               Generate schema validation files
  --no-validation           Skip schema validation setup
  -h, --help                Display this help message
`;
                await displayWithPagination(helpContent);
                process.exit(0);
            }
        })
        .action(async (name, options) => {
            try {
                let proceed = options.yes;
                const schemaRequested = options.schema && !options.noValidation;
                const basePath = options.path || '.'; // Get base path or default

                const schematicOptions = {
                    name: name,
                    path: basePath, // Pass base path to schematic
                    noValidation: !schemaRequested
                };

                // Generate and show file preview
                const filePreview = generateFilePreview({
                    name: name,
                    path: basePath,
                    schema: schemaRequested
                });
                await displayWithPagination(`\n🔹 Create a Handler: ${toDasherize(name)}\n${filePreview}`);

                // Ask for confirmation unless --yes flag is used
                if (!options.yes) {
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
                        console.log(`Generating handler ${toDasherize(name)}...`);
                        await runSchematic('handler', schematicOptions);
                        console.log('\x1b[32m✅ Handler created successfully! 🚀\x1b[0m');
                    } catch (error: any) {
                        if (error && error.message && error.message.includes('already exist')) {
                            // Handle file already exists error with a nicer message
                            const filePath = error.message.match(/Path \"([^\"]+)\"/)?.[1] || '';
                            console.error('\n\x1b[33m⚠️  File conflict detected!\x1b[0m');
                            console.error(`\x1b[33mIt looks like a file or directory already exists: ${filePath}\x1b[0m`);
                            console.log('\n\x1b[36mSuggestions:\x1b[0m');
                            console.log('  • Try a different handler name');
                            console.log('  • Use a different output path with -p option');
                            console.log('  • Use --force option to overwrite existing files (coming soon)');
                        } else {
                            console.error('Error generating handler:', error);
                        }
                    }
                } else {
                    console.log('\nOperation cancelled. No files were created.');
                }
            } catch (error: any) {
                if (error && error.name === 'ExitPromptError') {
                    console.log('\n👋 Mission aborted! The user yeeted the command into the void. Farewell, brave keystroke warrior! 🫡💥');
                    process.exit(0);
                } else {
                    console.error('\n\x1b[31mAn unexpected error occurred:\x1b[0m', error);
                    process.exit(1);
                }
            }
        });

    return command;
}
