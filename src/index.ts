#!/usr/bin/env node

import { Command } from 'commander';
import { SchematicsCli } from './schematics-cli'; // We'll create this helper
import { createDomainCommand } from './commands/createDomain';
import { createHandlerCommand } from './commands/createHandler';
import { createPortCommand } from './commands/createPort';
import { createServiceCommand } from './commands/createService';

async function main() {
  const program = new Command();

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
