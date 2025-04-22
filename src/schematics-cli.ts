import { 
    SchematicEngine,
    UnsuccessfulWorkflowExecution,
    formats
} from '@angular-devkit/schematics';
import {
    NodeModulesTestEngineHost,
    NodeWorkflow
} from '@angular-devkit/schematics/tools';
import { 
    normalize
} from '@angular-devkit/core';
import * as path from 'path';
import * as fs from 'fs-extra';

interface SchematicRunOptions {
    schematic: string;
    name?: string;
    options: string[]; // Raw CLI arguments for the schematic
    dryRun?: boolean;
    outputDir?: string; // Optional output directory for generated code
    force?: boolean;    // Option to disable interactive prompts
}

export class SchematicsCli {
    private engineHost = new NodeModulesTestEngineHost();
    private engine: SchematicEngine<{}, {}>;
    private collectionName: string;
    private logger = console;

    constructor() {
        this.engine = new SchematicEngine(this.engineHost);
        this.collectionName = this.resolveCollectionPath();
    }

    /**
     * Resolve the path to collection.json file
     * First checks if running from source or from published package
     */
    private resolveCollectionPath(): string {
        const possiblePaths = [
            // When running from source via ts-node
            path.resolve(__dirname, './schematics/collection.json'),
            
            // When running from dist folder
            path.resolve(__dirname, '../src/schematics/collection.json'),
            
            // When running from dist folder (alternative)
            path.resolve(__dirname, './schematics/collection.json'),
            
            // When installed as package
            path.resolve(process.cwd(), './node_modules/vss-api-cli/dist/schematics/collection.json'),
            
            // When in development, use local path
            path.resolve(process.cwd(), './src/schematics/collection.json')
        ];

        for (const collectionPath of possiblePaths) {
            try {
                if (fs.existsSync(collectionPath)) {
                    console.log(`Using collection at: ${collectionPath}`);
                    return collectionPath;
                }
            } catch (err) {
                // Skip if path doesn't exist
            }
        }

        // If collection not found in any path, use a default path
        // The error will be reported later when trying to load the collection
        console.warn(`Warning: Could not find collection.json in any of the expected paths.`);
        // Make sure we always return a string (fix TypeScript error)
        return path.resolve(__dirname, './schematics/collection.json');
    }

    private parseSchematicArgs(args: string[]): Record<string, any> {
        const options: Record<string, any> = {};
        let currentKey: string | null = null;

        for (const arg of args) {
            if (arg.startsWith('--')) {
                // Explicitly ignore --force argument here
                if (arg === '--force') {
                    currentKey = null; // Reset key if it was --force
                    continue; 
                }
                // Convert kebab-case to camelCase
                currentKey = arg.substring(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                options[currentKey] = true; // Default to true for flags
            } else if (arg.startsWith('-')) {
                console.warn(`Short alias '${arg}' ignored. Use long form (e.g., --option).`);
            } else if (currentKey !== null) {
                // Assign value to the last seen key
                const value = arg === 'true' ? true : arg === 'false' ? false : arg;
                options[currentKey] = value;
                currentKey = null; // Reset key after assigning value
            }
        }
        return options;
    }

    private createWorkflow(options: { dryRun: boolean, force: boolean, outputDir?: string }): NodeWorkflow { // Add force parameter
        const { dryRun, force } = options; // Destructure force
        
        // SIMPLE APPROACH: Just use the current working directory as root
        // We'll handle the output directory later in the schematic itself
        const root = normalize(process.cwd());
        
        this.logger.info(`Using workflow root: ${root}`);
        
        const workflow = new NodeWorkflow(root, {
            dryRun,
            force, // Pass force to the workflow options
            resolvePaths: [process.cwd(), __dirname],
            schemaValidation: true,
        });

        // Register standard formats - proper TypeScript syntax
        for (const format of formats.standardFormats) {
            workflow.registry.addFormat(format);
        }
        
        // Add reporting logic for file operations
        workflow.reporter.subscribe((event) => {
            if (event.kind === 'error') {
                const desc = event.description || 'No description provided';
                this.logger.error(`\x1b[31mERROR!\x1b[0m ${event.path} ${desc}`);
                return;
            }

            // Format paths consistently
            const eventPath = event.path.startsWith('/') ? event.path.slice(1) : event.path;

            switch (event.kind) {
                case 'update':
                    this.logger.info(`\x1b[33mUPDATE\x1b[0m ${eventPath} (${event.content.length} bytes)`);
                    break;
                case 'create':
                    this.logger.info(`\x1b[35mCREATE\x1b[0m ${eventPath} (${event.content.length} bytes)`);
                    break;
                case 'delete':
                    this.logger.info(`\x1b[31mDELETE\x1b[0m ${eventPath}`);
                    break;
                case 'rename':
                    const toPath = event.to.startsWith('/') ? event.to.slice(1) : event.to;
                    this.logger.info(`\x1b[34mRENAME\x1b[0m ${eventPath} => ${toPath}`);
                    break;
                default:
                    break;
            }
        });

        return workflow;
    }

    async run(runOptions: SchematicRunOptions): Promise<void> {
        // Destructure force from runOptions
        const { schematic: schematicName, name, options: rawOptions, dryRun = false, force = false, outputDir } = runOptions; 

        const parsedOptions = this.parseSchematicArgs(rawOptions);
        if (name) {
            parsedOptions.name = name; // Add the positional name argument
        }
        // Remove force from parsedOptions - let the workflow handle it
        // delete parsedOptions.force; // Or just don't add it

        // Add path option if outputDir is provided
        if (outputDir) {
            this.logger.info(`Using output directory: ${outputDir}`);
            parsedOptions.path = outputDir;
        }

        try {
            // Create collection
            const collection = this.engine.createCollection(this.collectionName);
            
            try {
                // Check if schematic exists
                collection.createSchematic(schematicName, true);
                
                // Set up workflow, passing the force flag correctly
                const workflow = this.createWorkflow({ dryRun, force, outputDir }); 

                this.logger.info(`Executing schematic: ${schematicName}`);
                // Log options passed to the schematic itself (without force)
                this.logger.info(`Schematic Options: ${JSON.stringify(parsedOptions)}`); 
                
                if (dryRun) {
                    this.logger.info('Running in dry-run mode - no changes will be made to the filesystem');
                }
                if (force) {
                    // Log that the workflow is in force mode
                    this.logger.info('Workflow running in force mode - existing files may be overwritten'); 
                }

                // Execute the schematic with proper workflow
                return new Promise<void>((resolve, reject) => {
                    workflow.execute({
                        collection: this.collectionName,
                        schematic: schematicName,
                        options: parsedOptions, // Pass options without force
                    }).subscribe({
                        next: () => {
                            // Processing tree transformations
                        },
                        error: (error) => {
                            this.logger.error(`Error executing Code recipe: ${error.message}`);
                            reject(error);
                        },
                        complete: () => {
                            this.logger.info(`\x1b[32m✅ Code recipe ${schematicName} executed successfully! 🎉\x1b[0m`);
                            resolve();
                        }
                    });
                });
            } catch (error) {
                throw new Error(`Code recipe '${schematicName}' not found in collection '${this.collectionName}' or is invalid.`);
            }
        } catch (err) {
            if (err instanceof UnsuccessfulWorkflowExecution) {
                this.logger.error('The Code recipe workflow failed. See above.');
            } else {
                this.logger.error(`Error: ${(err as Error).message}`);
            }
            throw err; // Re-throw for the main index.ts to catch
        }
    }
}

/**
 * Helper function to run a schematic with the given options.
 * This simplifies schematic execution from command files.
 */
export async function runSchematic(
    schematicName: string, 
    options: Record<string, any> = {},
    dryRun: boolean = false,
    force: boolean = false // Add force parameter
): Promise<void> {
    const cli = new SchematicsCli();
    
    const schematicArgs: string[] = [];
    
    const { name, ...restOptions } = options;
    
    Object.entries(restOptions).forEach(([key, value]) => {
        // Ensure 'force' from the options object is not added to schematicArgs
        if (key === 'force') return; 

        if (typeof value === 'boolean') {
            // Only add boolean flags if true
            if (value) { 
                schematicArgs.push(`--${key}`);
            }
        } else if (value !== undefined && value !== null && value !== '') {
            schematicArgs.push(`--${key}`);
            schematicArgs.push(value.toString());
        }
    });
    
    try {
        await cli.run({ 
            schematic: schematicName,
            name, 
            options: schematicArgs, // Pass args without force
            outputDir: options.path, 
            dryRun,
            force // Pass the force flag value here to cli.run
        });
    } catch (error) {
        console.error(`Error executing Code recipe ${schematicName}:`, error);
        throw error;
    }
}
