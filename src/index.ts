#!/usr/bin/env node

import { Command } from 'commander';
import { SchematicsCli } from './schematics-cli';
import { createDomainCommand } from './commands/createDomain';
import { createHandlerCommand } from './commands/createHandler';
import { createPortCommand } from './commands/createPort';
import { createServiceCommand } from './commands/createService';

/**
 * Display a welcome message with ASCII art and action description
 * @param action The action being performed
 * @param description Description of what will happen
 */
function displayWelcomeMessage(action: string, description?: string): void {
  const asciiArt = `
  ____                                _              ____   _       ___ 
 |  _ \\    ___    _ __ ___     __ _  (_)  _ __      / ___| | |     |_ _|
 | | | |  / _ \\  | '_ \` _ \\   / _\` | | | | '_ \\    | |     | |      | | 
 | |_| | | (_) | | | | | | | | (_| | | | | | | |   | |___  | |___   | | 
 |____/   \\___/  |_| |_| |_|  \\__,_| |_| |_| |_|    \\____| |_____| |___|
                                                                        `;
  
  // CLI name with enhanced styling
  const cliName = `
\x1b[1m\x1b[36m██╗   ██╗███████╗███████╗      ██████╗ ██╗         ██████╗██╗     ██╗\x1b[0m
\x1b[1m\x1b[36m██║   ██║██╔════╝██╔════╝     ██╔═══██╗██║        ██╔════╝██║     ██║\x1b[0m
\x1b[1m\x1b[36m██║   ██║███████╗███████╗     ██║   ██║██║        ██║     ██║     ██║\x1b[0m
\x1b[1m\x1b[36m╚██╗ ██╔╝╚════██║╚════██║     ██║   ██║██║        ██║     ██║     ██║\x1b[0m
\x1b[1m\x1b[36m ╚████╔╝ ███████║███████║     ╚██████╔╝███████╗   ╚██████╗███████╗██║\x1b[0m
\x1b[1m\x1b[36m  ╚═══╝  ╚══════╝╚══════╝      ╚═════╝ ╚══════╝    ╚═════╝╚══════╝╚═╝\x1b[0m`;

  // Clear any previous output
  console.clear();
  
  // Display ASCII art
  console.log(asciiArt);
  
  // Display styled CLI name
  console.log(cliName);
  console.log();
  
  // Display action and description
  console.log(`\x1b[1m\x1b[33m>> ${action}\x1b[0m`); // Bold yellow text for action
  if (description) {
    console.log(`\x1b[90m${description}\x1b[0m`); // Gray text for description
  }
  console.log(); // Add some spacing
}

/**
 * Get the welcome message for a specific command
 * @param commandName The name of the command being executed
 */
function getWelcomeMessage(commandName: string): { action: string, description: string } {
  const messages = {
    'create:domain': {
      action: 'Creating a new domain with models, services, and ports',
      description: 'This will scaffold a complete domain structure following hexagonal architecture principles'
    },
    'create:handler': {
      action: 'Creates a new Middy handler with optional schema validation',
      description: 'This will generate handler code with proper error handling and middleware setup'
    },
    'create:port': {
      action: 'Creating a new port interface and adapter implementation',
      description: 'This will generate the port interface in the domain layer and its adapter in the infrastructure layer'
    },
    'create:service': {
      action: 'Creating a new domain service',
      description: 'This will generate a service class in the domain layer'
    },
    'generate': {
      action: 'Generating components using schematics',
      description: 'This operation will scaffold components based on the specified schematic'
    },
    'default': {
      action: 'Welcome to Domain CLI',
      description: 'A tool for scaffolding Middy-based serverless projects with hexagonal architecture'
    }
  } as const;

  type CommandKey = keyof typeof messages;
  
  // Safely handle command name lookup with fallback to default
  const key = Object.keys(messages).includes(commandName) 
    ? (commandName as CommandKey) 
    : ('default' as CommandKey);
    
  return messages[key];
}

async function main() {
  const program = new Command();
  
  // Get the command being executed
  const commandName = process.argv.length > 2 ? process.argv[2] : 'default';
  // Ensure commandName is never undefined
  const { action, description } = getWelcomeMessage(commandName || 'default');
  
  // Display the welcome message
  displayWelcomeMessage(action, description);
  
  program
    .name('vss-ol-cli')
    .description('CLI tool for scaffolding Middy-based serverless projects using schematics.')
    .version('1.0.0');

  // Command to generate components using schematics
  program
    .command('generate <schematic> [name]') // e.g., generate handler my-handler
    .alias('g')
    .description('Generate a specific schematic (handler, domain, port, service)')
    .option('--dry-run', 'Run through without making any changes')
    .option('--output-dir <path>', 'Specify output directory for generated code (default: current directory)')
    .allowUnknownOption() // Allow schematics-specific options
    .action(async (schematic: string, name: string | undefined, cmdOptions: { dryRun?: boolean, outputDir?: string }) => {
      const cli = new SchematicsCli();
      const schematicArgs = process.argv.slice(process.argv.indexOf(name || schematic) + 1)
        .filter(arg => arg !== '--dry-run')
        .filter(arg => arg !== '--output-dir' && !process.argv[process.argv.indexOf(arg) - 1]?.includes('--output-dir'));

      try {
        await cli.run({ 
          schematic, 
          name, 
          options: schematicArgs,
          dryRun: cmdOptions.dryRun,
          outputDir: cmdOptions.outputDir
        });
      } catch (error) {
        console.error('Error running schematic:', error);
        process.exit(1);
      }
    });

  // Add our custom command implementations
  program.addCommand(createDomainCommand());
  program.addCommand(createHandlerCommand());
  program.addCommand(createPortCommand());
  program.addCommand(createServiceCommand());

  await program.parseAsync(process.argv);

  // If no command is specified, show help
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

main();
