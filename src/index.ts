#!/usr/bin/env node

import { Command } from 'commander';
import { SchematicsCli } from './schematics-cli';
import { createDomainCommand } from './commands/createDomain';
import { createHandlerCommand } from './commands/createHandler';
import { createPortCommand } from './commands/createPort';
import { createServiceCommand } from './commands/createService';
import { displayWithPagination } from './utils/fileUtils';

/**
 * Display a welcome message with ASCII art and action description
 * @param action The action being performed
 * @param description Description of what will happen
 */
function displayWelcomeMessage(action: string, description?: string): void {
  // CLI name with corrected ASCII art to show "VSS OL CLI"
  const cliName = `
 

  __     __   ______    ______          ______   _______   ______         ______   __        ______ 
  /  |   /  | /      \  /      \        /      \ /       \ /      |       /      \ /  |      /      |
  $$ |   $$ |/$$$$$$  |/$$$$$$  |      /$$$$$$  |$$$$$$$  |$$$$$$/       /$$$$$$  |$$ |      $$$$$$/ 
  $$ |   $$ |$$ \__$$/ $$ \__$$/       $$ |__$$ |$$ |__$$ |  $$ |        $$ |  $$/ $$ |        $$ |  
  $$  \ /$$/ $$      \ $$      \       $$    $$ |$$    $$/   $$ |        $$ |      $$ |        $$ |  
   $$  /$$/   $$$$$$  | $$$$$$  |      $$$$$$$$ |$$$$$$$/    $$ |        $$ |   __ $$ |        $$ |  
    $$ $$/   /  \__$$ |/  \__$$ |      $$ |  $$ |$$ |       _$$ |_       $$ \__/  |$$ |_____  _$$ |_ 
     $$$/    $$    $$/ $$    $$/       $$ |  $$ |$$ |      / $$   |      $$    $$/ $$       |/ $$   |
      $/      $$$$$$/   $$$$$$/        $$/   $$/ $$/       $$$$$$/        $$$$$$/  $$$$$$$$/ $$$$$$/ 
                                                                                                     
                                                                                                     
                                                                                                     
  `;

  // Clear any previous output
  console.clear();
  
  // Display styled CLI name (remove any previous ASCII art)
  console.log("\x1b[36m" + cliName + "\x1b[0m");
  console.log();
  
  // Display action and description
  console.log("\x1b[1m\x1b[33m>> " + action + "\x1b[0m"); // Bold yellow text for action
  if (description) {
    console.log("\x1b[90m" + description + "\x1b[0m"); // Gray text for description
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
  
  // Only display the welcome message when no help flag is present
  if (!process.argv.includes('--help') && !process.argv.includes('-h')) {
    displayWelcomeMessage(action, description);
  }
  
  program
    .name('vss-api-cli')
    .description(`CLI tool for scaffolding Middy-based serverless projects using schematics.`)
    .version('1.0.0')
    .hook('preAction', async () => {
      // Show detailed help with pagination when --help is used on the root command
      if ((process.argv.includes('--help') || process.argv.includes('-h')) && process.argv.length <= 3) {
        const helpContent = `
CLI tool for scaffolding Middy-based serverless projects using schematics.
    
🔧 Features:
  • Create complete domain structures with Hexagonal Architecture
  • Generate AWS Lambda handlers with Middy middleware
  • Scaffold ports and adapters for clean architecture
  • Create domain services with best practices
  
📝 Examples:
  $ vss-api-cli create:domain user
  $ vss-api-cli create:handler createUser --schema
  $ vss-api-cli create:port UserRepository -d user
  $ vss-api-cli create:service UserCreator -d user

Available Commands:
  • create:domain    (cd)  Scaffold a new domain with models, services, and ports
  • create:handler   (ch)  Generate a new API handler with request schema validation
  • create:port      (cp)  Create a new port interface and adapter implementation
  • create:service   (cs)  Generate a new domain service
  • generate, g           Generate components using schematics

🔧 Environment Variables:
  OUTPUT_DIR        Set a default output directory for generated files
  
⚙️  Configuration:
  The CLI will look for a vss-api.config.json file in your project root for default settings.
  
📚 Documentation:
  For detailed documentation and guides, visit: https://github.com/yourusername/vss-api-cli

Options:
  -V, --version              Output the version number
  -h, --help                Display this help message`;

        await displayWithPagination(helpContent);
        process.exit(0);
      }
    });

  // Command to generate components using schematics with enhanced help
  program
    .command('generate <schematic> [name]')
    .alias('g')
    .description(`\x1b[1mGenerate a specific schematic (handler, domain, port, service)\x1b[0m
    
\x1b[36m📦 Available Options:\x1b[0m
  \x1b[33m•\x1b[0m \x1b[1mhandler\x1b[0m  - AWS Lambda handler with Middy middleware
  \x1b[33m•\x1b[0m \x1b[1mdomain\x1b[0m   - Complete domain structure with models, services, and ports
  \x1b[33m•\x1b[0m \x1b[1mport\x1b[0m     - Port interface and adapter implementation
  \x1b[33m•\x1b[0m \x1b[1mservice\x1b[0m  - Domain service class
    
\x1b[36m💡 Examples:\x1b[0m
  \x1b[90m$\x1b[0m vss-api-cli g handler createUser
  \x1b[90m$\x1b[0m vss-api-cli g domain payment --path src/domains
  \x1b[90m$\x1b[0m vss-api-cli g port UserRepository --domain user`)
    .option('--dry-run', 'Run through without making any changes')
    .option('--output-dir <path>', 'Specify output directory for generated code')
    .option('--force', 'Override existing files')
    .allowUnknownOption()
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
