#!/usr/bin/env node

import { Command } from 'commander';
import { SchematicsCli } from './schematics-cli'; // We'll create this helper

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
    .allowUnknownOption() // Allow schematics-specific options
    .action(async (schematic: string, name: string | undefined) => {
      const cli = new SchematicsCli();
      const schematicArgs = process.argv.slice(process.argv.indexOf(name || schematic) + 1);

      try {
        await cli.run({ schematic, name, options: schematicArgs });
      } catch (error) {
        console.error('Error running schematic:', error);
        process.exit(1);
      }
    });

  // Add other top-level commands if necessary (e.g., build, serve - though not requested here)

  await program.parseAsync(process.argv);

  // If no command is specified, show help
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

main();
