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
        const possiblePaths = [
            path.resolve(__dirname, './schematics/collection.json'), // dist/schematics/collection.json
            path.resolve(__dirname, '../schematics/collection.json'), // dist/../schematics/collection.json (if src is sibling) - Less likely needed if build output is clean
            path.resolve(process.cwd(), './dist/schematics/collection.json'), // project_root/dist/schematics/collection.json
            path.resolve(process.cwd(), './node_modules/vss-api-cli/dist/schematics/collection.json'), // installed package
            path.resolve(process.cwd(), './src/schematics/collection.json') // project_root/src/schematics/collection.json (dev) - Keep for local dev
        ];

        for (const collectionPath of possiblePaths) {
            if (fs.existsSync(collectionPath)) {
                this.logger.info(`Using collection at: ${collectionPath}`);
                return collectionPath;
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
    private async initializeWorkflow(basePath: string, dryRun: boolean, force: boolean): Promise<{
        // Return the Collection object
        collection: Collection<{}, {}>; 
        workflow: NodeWorkflow;
        workflowRoot: string;
        config: CliConfig | null;
        collectionName: string; 
        registry: schema.SchemaRegistry;
    }> {
        const workflowRoot = normalize(path.resolve(process.cwd(), basePath)); 
        this.logger.info(`Loading config from path: ${basePath}`);
        const config = loadConfig(basePath); 

        const collectionPath = this.resolveCollectionPath();
        const collectionDir = path.dirname(collectionPath);
        const collectionName = 'vss-cli-schematics'; // Internal registration name

        this.logger.info(`🔧 Using configuration from ${config ? 'vss-api.config.json' : 'defaults'}`);
        if (config) {
            this.logger.info(`Using fileNameCase from config: ${config.fileNameCase || 'default (pascal)'}`);
        }

        const registry = new schema.CoreSchemaRegistry(formats.standardFormats);
        
        const host = new virtualFs.ScopedHost(new NodeJsSyncHost(), normalize(workflowRoot));
        
        // Pass force and dryRun here
        const workflow = new NodeWorkflow(host, {
            force: force, 
            dryRun: dryRun, 
            packageManager: 'npm', 
            registry: registry,
            resolvePaths: [process.cwd(), workflowRoot, collectionDir], 
            schemaValidation: true, 
        });

        this.engineHost.registerCollection(collectionName, collectionDir);
        workflow.registry.addPostTransform(schema.transforms.addUndefinedDefaults);
        workflow.engineHost.registerOptionsTransform(validateOptionsWithSchema(workflow.registry));

        const collection = this.engine.createCollection(collectionName);
        if (!collection) {
            throw new Error(`Failed to create collection '${collectionName}' from path '${collectionDir}'`);
        }
        // No need to get description separately here

        return { collection, workflow, workflowRoot, config, collectionName, registry };
    }

    async run(
        schematicName: string,
        options: any, 
        dryRun = false,
        force = false
    ): Promise<void> {
        const outputDir = options.outputDir || options.path || '.';
        // Get the collection object
        const { collection, workflow, workflowRoot, config, collectionName } = await this.initializeWorkflow(outputDir, dryRun, force); 

        this.logger.info(`Using output directory: ${outputDir}`);
        this.logger.info(`Using workflow root: ${workflowRoot}`);

        const parsedArgs = this.parseSchematicArgs(options.options || []);
        const schematicOptions: JsonObject = {
            ...parsedArgs, 
            ...options,   
            _config: config || {}, 
            fileNameCase: config?.fileNameCase || options.fileNameCase || 'pascal', 
        };
        
        delete schematicOptions.options;    
        delete schematicOptions.outputDir; 
        delete schematicOptions.y;         
        delete schematicOptions.yes;       
        delete schematicOptions.force;     // Handled by workflow
        delete schematicOptions.dryRun;    // Handled by workflow

        this.logger.info(`Executing schematic: ${schematicName}`);
        this.logger.debug(`Collection Name for Execution: ${collectionName}`);
        // Correctly use collection.listSchematicNames()
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
                debug: true, 
                logger: this.logger, 
            }).toPromise();

            if (dryRun) {
                this.logger.info('\n✨ Schematic run successful (dry run). No changes were made.');
            } else {
                this.logger.info('\n✨ Schematic run successful!');
            }
        } catch (e: any) {
            this.logger.fatal(`❌ Schematic run failed: ${e.message || e}`, e);
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
