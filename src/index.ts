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
    .option('--dry-run', 'Run through without making any changes')
    .allowUnknownOption() // Allow schematics-specific options
    .action(async (schematic: string, name: string | undefined, cmdOptions: { dryRun?: boolean }) => {
      const cli = new SchematicsCli();
      const schematicArgs = process.argv.slice(process.argv.indexOf(name || schematic) + 1)
        .filter(arg => arg !== '--dry-run'); // Remove dry-run from schematic args

      try {
        await cli.run({ 
          schematic, 
          name, 
          options: schematicArgs,
          dryRun: cmdOptions.dryRun
        });
      } catch (error) {
        console.error('Error running schematic:', error);
        process.exit(1);
      }
    });

  // Add direct commands for common schematics
  const createCommand = (name: string) => {
    return program
      .command(`create:${name} <name>`)
      .alias(`c${name.charAt(0)}`)
      .description(`Generate a new ${name}`)
      .option('--dry-run', 'Run through without making any changes')
      .allowUnknownOption()
      .action(async (componentName: string, cmdOptions: { dryRun?: boolean }) => {
        const cli = new SchematicsCli();
        const schematicArgs = process.argv.slice(process.argv.indexOf(componentName) + 1)
          .filter(arg => arg !== '--dry-run');

        try {
          await cli.run({ 
            schematic: name, 
            name: componentName, 
            options: schematicArgs,
            dryRun: cmdOptions.dryRun
          });
        } catch (error) {
          console.error(`Error generating ${name}:`, error);
          process.exit(1);
        }
      });
  };

  // Add convenience commands
  createCommand('domain');   // create:domain <name>
  createCommand('handler');  // create:handler <name>
  createCommand('port');     // create:port <name>
  createCommand('service');  // create:service <name>

  await program.parseAsync(process.argv);

  // If no command is specified, show help
  if (!process.argv.slice(2).length) {
    program.outputHelp();
  }
}

main();
