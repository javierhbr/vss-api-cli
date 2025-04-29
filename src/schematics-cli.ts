import { 
    SchematicEngine,
    formats,
    SchematicDescription, 
    Collection // Import Collection
} from '@angular-devkit/schematics';
import {
    NodeModulesTestEngineHost,
    NodeWorkflow,
    validateOptionsWithSchema 
} from '@angular-devkit/schematics/tools';
import { 
    schema, 
    logging, 
    JsonObject, 
    virtualFs,
    normalize 
} from '@angular-devkit/core';
import { NodeJsSyncHost } from '@angular-devkit/core/node'; 
import * as path from 'path';
import * as fs from 'fs-extra';
import { loadConfig, CliConfig } from './utils/configLoader';
import { DryRunEvent, DryRunErrorEvent } from '@angular-devkit/schematics/src/sink/dryrun'; 

// Basic logger implementation compatible with LoggerApi
class SimpleConsoleLogger extends logging.IndentLogger {
    constructor(name = 'vss-cli', parent: logging.Logger | null = null) {
        super(name, parent);

        this._observable.subscribe(entry => {
            let color = (x: string) => x; // Default no color
            // Explicitly type output to allow both stdout and stderr
            let output: NodeJS.WriteStream = process.stdout; 
            switch (entry.level) {
                case 'info':
                    color = (x) => `\x1b[32m${x}\x1b[0m`; // Green
                    break;
                case 'warn':
                    color = (x) => `\x1b[33m${x}\x1b[0m`; // Yellow
                    output = process.stderr;
                    break;
                case 'error':
                    color = (x) => `\x1b[31m${x}\x1b[0m`; // Red
                    output = process.stderr;
                    break;
                case 'fatal':
                    color = (x) => `\x1b[41m\x1b[37m${x}\x1b[0m`; // Red background, white text
                    output = process.stderr;
                    break;
            }
            // Ensure entry.message is a string before writing
            const message = typeof entry.message === 'string' ? entry.message : JSON.stringify(entry.message);
            output.write(color(message) + '\n');
        });
    }
}

export class SchematicsCli {
    private engineHost = new NodeModulesTestEngineHost();
    private engine: SchematicEngine<{}, {}>;
    private logger: logging.Logger = new SimpleConsoleLogger(); 

    constructor() {
        this.engine = new SchematicEngine(this.engineHost);
    }

    /**
     * Resolve the path to collection.json file
     */
    private resolveCollectionPath(): string {
        // When running as a developed module (from source)
        const projectRoot = path.resolve(__dirname, '..');
        
        // Primary preferred collection path - directly reference the known build output location
        const mainCollectionPath = path.resolve(projectRoot, 'dist/schematics/collection.json');
        
        // Fallback paths if the main one doesn't exist
        const possiblePaths = [
            mainCollectionPath,
            path.resolve(__dirname, './schematics/collection.json'),
            path.resolve(__dirname, '../schematics/collection.json'),
            path.resolve(process.cwd(), './dist/schematics/collection.json'),
            path.resolve(process.cwd(), './node_modules/vss-api-cli/dist/schematics/collection.json'),
            path.resolve(process.cwd(), './src/schematics/collection.json')
        ];
        
        // Check each path and ensure it's a file, not a directory
        for (const collectionPath of possiblePaths) {
            try {
                if (fs.existsSync(collectionPath)) {
                    const stats = fs.statSync(collectionPath);
                    if (stats.isFile()) {
                        this.logger.info(`Using collection at: ${collectionPath}`);
                        
                        // Verify it's valid JSON
                        const content = fs.readFileSync(collectionPath, 'utf-8');
                        JSON.parse(content); // Will throw if invalid
                        
                        return collectionPath;
                    } else {
                        this.logger.warn(`Found path but it's not a file: ${collectionPath}`);
                    }
                }
            } catch (e) {
                this.logger.warn(`Error checking collection path ${collectionPath}: ${e}`);
            }
        }

        const errorMsg = `Error: Could not find collection.json in any of the expected paths: ${possiblePaths.join(', ')}`;
        this.logger.fatal(errorMsg);
        throw new Error(errorMsg);
    }

    private parseSchematicArgs(args: string[]): Record<string, any> {
        const options: Record<string, any> = {};
        let currentKey: string | null = null;

        for (const arg of args) {
            if (arg.startsWith('--')) {
                if (arg === '--force') { // Skip --force, handled by workflow
                    currentKey = null; 
                    continue; 
                }
                currentKey = arg.substring(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
                options[currentKey] = true; 
            } else if (arg.startsWith('-')) {
                this.logger.warn(`Short alias '${arg}' ignored. Use long form (e.g., --option).`);
            } else if (currentKey !== null) {
                const value = arg === 'true' ? true : arg === 'false' ? false : arg;
                options[currentKey] = value;
                currentKey = null; 
            }
        }
        return options;
    }
    
    // Pass dryRun and force to initializeWorkflow
    private async initializeWorkflow(
        effectiveOutputDir: string, // The actual directory where files should be written
        dryRun: boolean, 
        force: boolean
    ): Promise<{
        // Return the Collection object
        collection: Collection<{}, {}>; 
        workflow: NodeWorkflow;
        workflowRoot: string; // This should be the effectiveOutputDir normalized
        config: CliConfig | null; // Config loaded from CWD
        collectionName: string; 
        registry: schema.SchemaRegistry;
    }> {
        // Always load config directly from the current working directory
        const cwd = process.cwd();
        this.logger.info(`Loading config relative to CWD: ${cwd}`);
        const config = loadConfig('.', false); // Always load from CWD, not treating it as absolute

        // The workflow root should be the directory where operations happen
        const workflowRoot = normalize(path.resolve(cwd, effectiveOutputDir)); 
        this.logger.info(`Workflow root set to: ${workflowRoot}`);

        const collectionPath = this.resolveCollectionPath();
        this.logger.info(`Collection path resolved to: ${collectionPath}`);
        
        const collectionDir = path.dirname(collectionPath);
        this.logger.info(`Collection directory: ${collectionDir}`);
        
        // Ensure the directory exists
        if (!fs.existsSync(collectionDir)) {
            throw new Error(`Collection directory not found: ${collectionDir}`);
        }
        
        const collectionName = 'vss-cli-schematics'; // Internal registration name

        this.logger.info(`🔧 Using configuration from ${config ? 'vss-api.config.json found in CWD' : 'defaults'}`);
        if (config) {
            this.logger.info(`Using fileNameCase from config: ${config.fileNameCase || 'default (pascal)'}`);
        }

        const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
        
        // Host is scoped to the workflowRoot (where files will be written)
        const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), workflowRoot); 
        
        const workflow = new NodeWorkflow(host, {
            force: force, 
            dryRun: dryRun, 
            packageManager: 'npm', 
            registry: registry,
            // Resolve paths should include CWD for node_modules, workflowRoot for output, and collectionDir for schematics
            resolvePaths: [cwd, path.resolve(cwd, effectiveOutputDir), collectionDir], 
            schemaValidation: true, 
        });

        // Register the collection using the directory - the engine host will resolve collection.json within this directory
        this.engineHost.registerCollection(collectionName, collectionDir);
        this.logger.info(`Registered collection '${collectionName}' using directory: ${collectionDir}`);
        
        workflow.registry.addPostTransform(schema.transforms.addUndefinedDefaults);
        workflow.engineHost.registerOptionsTransform(validateOptionsWithSchema(workflow.registry));

        const collection = this.engine.createCollection(collectionName);
        if (!collection) {
            throw new Error(`Failed to create collection '${collectionName}' from path '${collectionDir}'`);
        }

        return { collection, workflow, workflowRoot, config, collectionName, registry };
    }

    async run(
        schematicName: string,
        options: any, 
        dryRun = false,
        force = false
    ): Promise<void> {
        // Determine the base directory for output. Prioritize --output-dir, then --path, then CWD.
        const outputBase = options.outputDir || options.path || '.'; 
        
        // Initialize workflow with the determined output base directory
        const { collection, workflow, workflowRoot, config, collectionName } = await this.initializeWorkflow(outputBase, dryRun, force); 

        this.logger.info(`Effective output directory: ${workflowRoot}`); // Use workflowRoot for clarity

        const parsedArgs = this.parseSchematicArgs(options.options || []);
        
        // Pass the config loaded from CWD to the schematic
        const schematicOptions: JsonObject = {
            ...parsedArgs, 
            ...options,   
            _config: config || {}, // Use config loaded by initializeWorkflow
            // Ensure fileNameCase from config (or defaults) is passed correctly
            fileNameCase: config?.fileNameCase || options.fileNameCase || 'pascal', 
        };
        
        // Clean up options not meant for the schematic itself
        delete schematicOptions.options;    
        delete schematicOptions.outputDir; // Handled by workflow root
        delete schematicOptions.path;      // Handled by workflow root
        delete schematicOptions.y;         
        delete schematicOptions.yes;       
        delete schematicOptions.force;     // Handled by workflow constructor
        delete schematicOptions.dryRun;    // Handled by workflow constructor

        this.logger.info(`Executing schematic: ${schematicName}`);
        this.logger.debug(`Collection Name for Execution: ${collectionName}`);
        this.logger.debug(`Available Schematics in Collection: ${collection.listSchematicNames().join(', ')}`); 
        this.logger.debug(`Schematic Options Passed to Workflow: ${JSON.stringify(schematicOptions, null, 2)}`);

        // Correctly use collection.createSchematic() to get the description
        let schematicDescription: SchematicDescription<{}, {}> | undefined;
        try {
            // Get the schematic object first
            const schematic = collection.createSchematic(schematicName); 
            // Then get its description
            schematicDescription = schematic.description; 
        } catch (e) {
             // Provide a more informative error if schematic loading fails
             throw new Error(`Schematic "${schematicName}" not found or failed to load in collection "${collection.description.name}". Original error: ${e instanceof Error ? e.message : e}`);
        }
        
        // Ensure schematicDescription is valid before proceeding (though createSchematic should throw if not found)
        if (!schematicDescription) {
             throw new Error(`Failed to retrieve description for schematic "${schematicName}" in collection "${collection.description.name}".`);
        }

        workflow.reporter.subscribe((event: DryRunEvent) => {
            const eventPath = event.path.startsWith('/') ? event.path.substring(1) : event.path; 
            switch (event.kind) {
                case 'error':
                    const errorEvent = event as DryRunErrorEvent;
                    this.logger.error(`ERROR! ${eventPath} ${errorEvent.description}`); 
                    break;
                case 'update':
                    this.logger.info(`UPDATE ${eventPath} (${event.content.length} bytes)`);
                    break;
                case 'create':
                    this.logger.info(`CREATE ${eventPath} (${event.content.length} bytes)`);
                    break;
                case 'delete':
                    this.logger.info(`DELETE ${eventPath}`);
                    break;
                case 'rename':
                    const renamePath = event.to.startsWith('/') ? event.to.substring(1) : event.to; 
                    this.logger.info(`RENAME ${eventPath} => ${renamePath}`);
                    break;
            }
        });
        
        try {
            await workflow.execute({
                collection: collectionName, 
                schematic: schematicName,
                options: schematicOptions, 
                allowPrivate: true, 
                debug: true, // Keep debug true for more info if EISDIR persists
                logger: this.logger, 
            }).toPromise();

            if (dryRun) {
                this.logger.info('\n✨ Schematic run successful (dry run). No changes were made.');
            } else {
                this.logger.info('\n✨ Schematic run successful!');
            }
        } catch (e: any) {
            // Log the full error, including stack trace if available
            this.logger.fatal(`❌ Schematic run failed: ${e.message || e}`, e.stack || e); 
            process.exitCode = 1; 
        }
    }
}

// Helper function remains the same
export async function runSchematic(
    schematicName: string,
    options: any, 
    dryRun = false,
    force = false
): Promise<void> {
    const cli = new SchematicsCli();
    await cli.run(schematicName, options, dryRun, force);
}
