import { Command } from 'commander';
import inquirer from 'inquirer';
import { toPascalCase, toDasherize, displayWithPagination, applyFilePatterns } from '../utils/fileUtils';
import { findExistingServices } from '../utils/domainUtils';
import { runSchematic } from '../schematics-cli';
import { loadConfig } from '../utils/configLoader';
import * as path from 'path';

/**
 * Generate a preview tree of files that will be created for a handler
 */
function generateFilePreview(options: {
  name: string,
  path?: string,
  schema?: boolean,
  createRequestDto?: boolean,
  createResponseDto?: boolean,
  serviceDomain?: string,
  serviceName?: string
}): string {
  const { 
    name, 
    path: basePath = '.', 
    schema, 
    createRequestDto, 
    createResponseDto, 
    serviceDomain, 
    serviceName 
  } = options;
  
  // Load configuration
  const config = loadConfig(basePath);
  
  // Generate template variables
  const handlerName = toDasherize(name);
  const pascalName = toPascalCase(name);
  const previewBasePath = basePath === '.' ? '' : `${basePath}/`;
  
  // Template variables for path and filename processing
  const templateVars = {
    name,
    pascalName,
    dashName: handlerName,
    camelName: handlerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
    snakeName: handlerName.replace(/-/g, '_'),
    domainName: serviceDomain || '',
    serviceName: serviceName || ''
  };
  
  // Get file paths using the utility function
  const handlerFilePath = applyFilePatterns('handler', 'handlerFile', config, templateVars, basePath);
  const schemaFilePath = applyFilePatterns('handler', 'schemaFile', config, templateVars, basePath);
  const dtoFilePath = applyFilePatterns('handler', 'dtoFile', config, templateVars, basePath);
  
  // Extract directory paths for display
  const srcPath = path.join(previewBasePath, config.basePath);
  const handlerDir = path.dirname(handlerFilePath.filePath.replace(path.join(basePath, config.basePath) + '/', ''));
  const schemaDir = path.dirname(dtoFilePath.filePath.replace(path.join(basePath, config.basePath) + '/', ''));
  
  // Generate preview text
  let preview = `\n\x1b[1mFiles to be created:\x1b[0m\n`;
  preview += `\x1b[36m${srcPath}/${handlerDir}/\x1b[0m\n`;
  preview += `\x1b[32m├── ${handlerFilePath.fileName}\x1b[0m \x1b[90m- Handler function`;
  
  if (serviceDomain && serviceName) {
    preview += ` (using ${serviceName} from ${serviceDomain})`;
  }
  preview += `\x1b[0m\n`;
  
  if (schema) {
    preview += `\x1b[32m├── ${schemaFilePath.fileName}\x1b[0m \x1b[90m- JSON Schema validation\x1b[0m\n`;
  }

  if (createRequestDto || createResponseDto) {
    preview += `\x1b[36m${srcPath}/${schemaDir}/\x1b[0m\n`;
    preview += `\x1b[32m└── ${dtoFilePath.fileName}\x1b[0m \x1b[90m- Zod DTO schema`;
    
    const dtos = [];
    if (createRequestDto) dtos.push('Request');
    if (createResponseDto) dtos.push('Response');
    
    preview += ` (${dtos.join(' & ')})\x1b[0m\n`;
  }
  
  return preview;
}

export function createHandlerCommand(): Command {
    const command = new Command('create:handler')
        .alias('ch')
        .description('Generate a new API handler.')
        .argument('<n>', 'Handler name (e.g., createUser, getProduct)')
        .option('-p, --path <outputPath>', 'Specify a custom base output path')
        .option('-s, --schema', 'Generate schema validation files')
        .option('--no-validation', 'Skip schema validation setup')
        .option('--request-dto', 'Generate request DTO schema with Zod')
        .option('--response-dto', 'Generate response DTO schema with Zod')
        .option('-y, --yes', 'Skip prompts and use default options')
        .hook('preAction', async () => {
            // Show detailed help with pagination when --help is used
            if (process.argv.includes('--help')) {
                const helpContent = `
Description:
  Creates a new AWS Lambda handler with Middy middleware setup.
  Includes optional request/response schema validation using Zod or JSON Schema,
  error handling, and proper TypeScript types.

Structure Generated:
  \`\`\`
  src/
  └── handlers/
      ├── {name}.handler.ts      # Main Lambda handler with Middy setup
      ├── {name}Schema.ts        # JSON Schema validation (if --schema flag used)
      └── schemas/
          └── {Name}Dto.ts       # Zod DTO schemas (if selected during prompts)
  \`\`\`

Features:
  • Automatic Middy middleware configuration
  • Optional service integration with domains
  • Zod validation for request/response DTOs
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
  • Schema files use Zod or JSON Schema format with TypeScript types
  • All generated code includes JSDoc documentation
  • Follows AWS Lambda best practices
  • Includes error handling patterns

Options:
  -p, --path <outputPath>     Specify a custom output path for the handler
  -s, --schema               Generate JSON schema validation files
  --no-validation           Skip schema validation setup
  -h, --help                Display this help message
`;
                await displayWithPagination(helpContent);
                process.exit(0);
            }
        })
        .action(async (name, options) => {
            try {
                const basePath = options.path || '.'; // Get base path or default
                let proceed = options.yes;
                const schemaRequested = options.schema && !options.noValidation;

                // Initialize service and DTO options
                let selectedService: { domain: string; service: string; name: string } | null = null;
                let createRequestDto = false;
                let createResponseDto = false;

                // Only ask for these options in interactive mode
                if (!options.yes) {
                    // Find existing services
                    const services = await findExistingServices(basePath);
                    
                    // Ask user to select a service if any found
                    if (services.length > 0) {
                        const serviceChoices = [
                            { name: "None - Don't use a service", value: null },
                            ...services.map(s => ({ 
                                name: s.name, 
                                value: s 
                            }))
                        ];
                        
                        const serviceAnswer = await inquirer.prompt([
                            {
                                type: 'list',
                                name: 'selected',
                                message: 'Which service would you like to use in this handler?',
                                choices: serviceChoices,
                                default: null
                            }
                        ]);
                        
                        selectedService = serviceAnswer.selected;
                    }
                    
                    // Ask about Zod DTO schemas
                    const dtoAnswer = await inquirer.prompt([
                        {
                            type: 'checkbox',
                            name: 'dtos',
                            message: 'Would you like to create Zod schema DTOs?',
                            choices: [
                                { name: 'Request DTO', value: 'request', checked: false },
                                { name: 'Response DTO', value: 'response', checked: false }
                            ]
                        }
                    ]);
                    
                    createRequestDto = dtoAnswer.dtos.includes('request');
                    createResponseDto = dtoAnswer.dtos.includes('response');
                }

                // Load config to get fileNameCase and file pattern settings
                const config = loadConfig(basePath);
                
                // Generate template variables for the schematic
                const handlerName = toDasherize(name);
                const pascalName = toPascalCase(name);
                const templateVars = {
                    name,
                    pascalName,
                    dashName: handlerName,
                    camelName: handlerName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()),
                    domainName: selectedService?.domain || '',
                    serviceName: selectedService?.service || ''
                };
                
                // Get the customized file paths
                const handlerFilePath = applyFilePatterns('handler', 'handlerFile', config, templateVars, basePath);
                const schemaFilePath = applyFilePatterns('handler', 'schemaFile', config, templateVars, basePath);
                const dtoFilePath = applyFilePatterns('handler', 'dtoFile', config, templateVars, basePath);
                
                // Prepare schematic options
                const schematicOptions = {
                    name: name,
                    path: basePath,
                    schema: schemaRequested,
                    noValidation: !schemaRequested,
                    serviceDomain: selectedService?.domain || null,
                    serviceName: selectedService?.service || null,
                    createRequestDto: createRequestDto,
                    createResponseDto: createResponseDto,
                    fileNameCase: config.fileNameCase || 'pascal',
                    _config: config, // Pass full config for more complex template processing
                    
                    // Add custom file paths
                    handlerFilePath: handlerFilePath.filePath,
                    handlerFileName: handlerFilePath.fileName,
                    schemaFilePath: schemaFilePath.filePath,
                    schemaFileName: schemaFilePath.fileName,
                    dtoFilePath: dtoFilePath.filePath,
                    dtoFileName: dtoFilePath.fileName
                };

                // Generate and show file preview
                const filePreview = generateFilePreview({
                    name: name,
                    path: basePath,
                    schema: schemaRequested,
                    createRequestDto,
                    createResponseDto,
                    serviceDomain: selectedService?.domain,
                    serviceName: selectedService?.service
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
