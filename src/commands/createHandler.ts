import { Command } from 'commander';
import { toDasherize } from '../utils/fileUtils';
import { runSchematic } from '../schematics-cli';

export function createHandlerCommand(): Command {
    const command = new Command('create:handler')
        .alias('ch')
        .description('Generate a new API handler with request schema validation.')
        .argument('<n>', 'Name of the handler (e.g., create-user, get-product)')
        .option('-p, --path <outputPath>', 'Specify a custom output path')
        .action(async (name, options) => {
            // Normalize the handler name to dash-case
            const handlerName = toDasherize(name);
            
            // Use the handler schematic instead of file templates
            try {
                console.log(`Generating handler ${handlerName}...`);
                await runSchematic('handler', {
                    name: handlerName,
                    path: options.path || '' // Pass the output path if specified
                });
                console.log('Handler created successfully!');
            } catch (error) {
                console.error('Failed to create handler:', error);
            }
        });

    return command;
}
