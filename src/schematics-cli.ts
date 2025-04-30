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
    private logger: logging.Logger = new SimpleConsoleLogger();
    // We'll initialize these during workflow setup for each run
    private engineHost!: NodeModulesTestEngineHost;
    private engine!: SchematicEngine<{}, {}>;

    constructor() {
        // We'll initialize the engine and host in the initializeWorkflow method
    }

    /**
     * Resolve the path to collection.json file
     * 
     * This function finds the collection.json file needed by the schematic engine.
     * The EISDIR error occurs when the system attempts to read a directory as a file,
     * so we need to be very careful to verify that we're dealing with actual files.
     * 
     * We prioritize the node_modules/vss-schematics location because Angular DevKit's
     * NodeModulesTestEngineHost expects collections to be in the node_modules directory.
     */
    private resolveCollectionPath(): string {
        // Start with the current execution directory (dist)
        const currentDir = __dirname;
        this.logger.info(`Resolving collection from execution directory: ${currentDir}`);
        
        // Define project root as one level up from the current execution directory (dist)
        const projectRoot = path.resolve(currentDir, '..');
        this.logger.info(`Project root identified as: ${projectRoot}`);
        
        // First check if our special node_modules location exists - this is our ideal path
        // that avoids EISDIR errors
        const npmCollectionPath = path.join(projectRoot, 'node_modules', 'vss-schematics', 'collection.json');
        if (fs.existsSync(npmCollectionPath) && fs.statSync(npmCollectionPath).isFile()) {
            this.logger.info(`Using vss-schematics from node_modules: ${npmCollectionPath}`);
            return npmCollectionPath;
        }
        
        // If we don't have the node_modules version, try possible locations
        const possiblePaths = [
            // Then try standard paths
            path.join(projectRoot, 'dist', 'schematics', 'collection.json'), 
            path.join(currentDir, 'schematics', 'collection.json'),
            path.join(projectRoot, 'schematics', 'collection.json'),
            path.join(process.cwd(), 'dist', 'schematics', 'collection.json'),
            path.join(process.cwd(), 'src', 'schematics', 'collection.json')
        ];
        
        // Debug all possible paths we're checking
        this.logger.debug(`Checking possible collection paths: ${JSON.stringify(possiblePaths, null, 2)}`);
        
        // Check each path and ensure it's a file, not a directory
        for (const collectionPath of possiblePaths) {
            try {
                // First check if the path exists
                if (fs.existsSync(collectionPath)) {
                    // Then verify it's a file, not a directory (crucial for avoiding EISDIR)
                    const stats = fs.statSync(collectionPath);
                    
                    if (stats.isFile()) {
                        this.logger.info(`Found collection file: ${collectionPath}`);
                        
                        // Verify it's valid JSON before proceeding
                        try {
                            const content = fs.readFileSync(collectionPath, 'utf-8');
                            const jsonContent = JSON.parse(content);
                            
                            // Validate that it's a proper collection file with the schematics property
                            if (jsonContent && jsonContent.schematics) {
                                this.logger.info(`Validated collection at: ${collectionPath}`);
                                return collectionPath;
                            } else {
                                this.logger.warn(`File at ${collectionPath} is not a valid collection (missing schematics property)`);
                            }
                        } catch (jsonError) {
                            this.logger.warn(`Error parsing JSON in ${collectionPath}: ${jsonError}`);
                        }
                    } else {
                        this.logger.warn(`Path exists but is not a file: ${collectionPath}`);
                    }
                }
            } catch (e) {
                this.logger.warn(`Error accessing path ${collectionPath}: ${e}`);
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
        // Make sure the path is normalized correctly to avoid path issues
        const workflowRoot = normalize(path.resolve(cwd, effectiveOutputDir));
        this.logger.info(`Workflow root set to: ${workflowRoot}`);

        // Ensure the collection path is resolved correctly
        const collectionPath = this.resolveCollectionPath();
        this.logger.info(`Collection path resolved to: ${collectionPath}`);
        
        // Get the directory containing the collection.json file
        const collectionDir = path.dirname(collectionPath);
        this.logger.info(`Collection directory: ${collectionDir}`);
        
        // Ensure the directory exists and is actually a directory
        try {
            const dirStats = fs.statSync(collectionDir);
            if (!dirStats.isDirectory()) {
                throw new Error(`Expected directory but found file: ${collectionDir}`);
            }
        } catch (error: any) { // Type assertion for error to access code property
            if (error.code === 'ENOENT') {
                throw new Error(`Collection directory not found: ${collectionDir}`);
            }
            throw error;
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

        // Use standard npm package resolution approach for collections
        try {
            // Before creating the engine, make sure schematics are in node_modules
            // This is the key fix for the EISDIR error - having schematics in a node_modules location
            // with proper structure that Angular DevKit expects
            this.ensureSchematicsInNodeModules(collectionDir, collectionName);
            
            // Create a new engine host that will look in node_modules for packages
            this.engineHost = new NodeModulesTestEngineHost();
            
            // Create the engine - now it will find our package in node_modules
            this.engine = new SchematicEngine(this.engineHost);
            
            this.logger.info(`Using schematic collection '${collectionName}' from node_modules`);
        } catch (error) {
            this.logger.fatal(`Failed to initialize schematic engine: ${error instanceof Error ? error.message : String(error)}`);
            throw new Error(`Schematic engine setup failed: ${error instanceof Error ? error.message : String(error)}`);
        }
        
        // Register the options transform with the workflow's engine host
        workflow.engineHost.registerOptionsTransform(validateOptionsWithSchema(workflow.registry));
        
        // Create the collection from our engine using the npm package strategy
        let collection;
        try {
            this.logger.debug(`Creating collection using name: ${collectionName}`);
            
            // Get the collection directly from the engine
            // This will use NodeModulesTestEngineHost's package resolution
            collection = this.engine.createCollection(collectionName);
            
            if (!collection) {
                throw new Error(`Failed to create collection '${collectionName}'`);
            }
            
            // Verify that we can access the collection description
            this.logger.debug(`Successfully loaded collection: ${collection.description.name}`);
            
            // Try to list the available schematics as a basic validation
            const schematicNames = collection.listSchematicNames();
            this.logger.info(`Available schematics in collection: ${schematicNames.join(', ')}`);
            
            if (schematicNames.length === 0) {
                this.logger.warn(`Warning: Collection contains no schematics!`);
            }
        } catch (error) {
            // Provide detailed error information for troubleshooting
            this.logger.fatal(`Failed to create collection: ${error instanceof Error ? error.message : String(error)}`);
            this.logger.debug(`Collection name: ${collectionName}`);
            this.logger.debug(`Collection path: ${collectionPath}`);
            
            // Special handling for EISDIR errors
            if (error instanceof Error && error.message.includes('EISDIR')) {
                this.logger.fatal(`
EISDIR error detected. The schematic engine is trying to read a directory as a file.
This is usually caused by incorrect collection.json path resolution.

Try manually checking:
- node_modules/${collectionName}/collection.json exists and is a valid file
- node_modules/${collectionName}/package.json exists with "schematics" field
`);
            }
            
            throw new Error(`Failed to load schematics collection. Check node_modules/${collectionName} structure.`);
        }

        // Return all the objects needed for schematic execution
        return { 
            collection, 
            workflow, 
            workflowRoot, 
            config, 
            collectionName, 
            registry 
        };
    }

    /**
     * Ensures that schematic files are copied to node_modules location
     * This is crucial to avoid EISDIR errors
     */
    private ensureSchematicsInNodeModules(collectionDir: string, collectionName: string): void {
        const projectRoot = path.resolve(__dirname, '..');
        const nodeModulesPath = path.join(projectRoot, 'node_modules', collectionName);
        
        // Ensure we normalize any absolute paths to be relative, to avoid EISDIR errors
        this.normalizeSchematicsPathsInModules();
        
        try {
            // Create the directory if it doesn't exist
            if (!fs.existsSync(nodeModulesPath)) {
                this.logger.debug(`Creating directory: ${nodeModulesPath}`);
                fs.mkdirpSync(nodeModulesPath);
            }
            
            // Copy all files from the collection directory to node_modules
            this.logger.debug(`Copying schematics from ${collectionDir} to ${nodeModulesPath}`);
            fs.copySync(collectionDir, nodeModulesPath);
            
            // Ensure there's a package.json in the node_modules directory
            const packageJsonPath = path.join(nodeModulesPath, 'package.json');
            if (!fs.existsSync(packageJsonPath)) {
                this.logger.debug(`Creating package.json in ${nodeModulesPath}`);
                fs.writeFileSync(packageJsonPath, JSON.stringify({
                    name: collectionName,
                    version: "1.0.0",
                    description: "VSS CLI Schematics",
                    schematics: "./collection.json"
                }, null, 2));
            }
            
            // Fix import paths in schematic files if needed
            this.fixSchematicImportPaths(nodeModulesPath);
            
            this.logger.debug(`Successfully copied schematics to ${nodeModulesPath}`);
            
            // Copy utility files if needed
            const utilsPath = path.join(nodeModulesPath, 'utils');
            if (!fs.existsSync(utilsPath)) {
                fs.mkdirSync(utilsPath, { recursive: true });
            }
            
            // Copy necessary utility files from dist to node_modules
            const fileUtilsSource = path.join(projectRoot, 'dist', 'utils', 'fileUtils.js');
            const fileUtilsTarget = path.join(utilsPath, 'fileUtils.js');
            if (fs.existsSync(fileUtilsSource)) {
                fs.copyFileSync(fileUtilsSource, fileUtilsTarget);
                this.logger.debug(`Copied utilities to ${fileUtilsTarget}`);
            }
        } catch (error) {
            this.logger.warn(`Error copying schematics to node_modules: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Fix import paths in schematic files
     * Sometimes the paths need to be adjusted when running from node_modules
     */
    private fixSchematicImportPaths(schematicsDir: string): void {
        try {
            // List of schematic types to fix
            const schematicTypes = ['handler', 'domain', 'port', 'service', 'adapter'];
            
            // Fix paths in each schematic type
            for (const type of schematicTypes) {
                const indexPath = path.join(schematicsDir, type, 'index.js');
                if (fs.existsSync(indexPath)) {
                    let content = fs.readFileSync(indexPath, 'utf8');
                    
                    // Fix various import patterns that might exist
                    content = content.replace(/require\(['"]@\/utils\/fileUtils['"]\)/g, "require('../utils/fileUtils')");
                    content = content.replace(/require\(['"]\.\.\/\.\.\/utils\/fileUtils['"]\)/g, "require('../utils/fileUtils')");
                    
                    // Write back the fixed content
                    fs.writeFileSync(indexPath, content);
                    this.logger.debug(`Fixed import paths in ${type} schematic`);
                }
            }
        } catch (error) {
            this.logger.warn(`Error fixing import paths: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    
    /**
     * Normalizes paths in schematic files to ensure they're relative rather than absolute
     * This prevents EISDIR errors and ensures files are created in the correct location
     */
    private normalizeSchematicsPathsInModules(): void {
        try {
            const projectRoot = path.resolve(__dirname, '..');
            const collectionNames = ['vss-schematics', 'vss-cli-schematics'];
            
            // Fix paths in all possible schematic locations
            for (const collectionName of collectionNames) {
                const nodeModulesPath = path.join(projectRoot, 'node_modules', collectionName);
                if (!fs.existsSync(nodeModulesPath)) continue;
                
                // List of schematic types to check
                const schematicTypes = ['handler', 'domain', 'port', 'service', 'adapter'];
                
                for (const type of schematicTypes) {
                    const schematicIndexPath = path.join(nodeModulesPath, type, 'index.js');
                    if (!fs.existsSync(schematicIndexPath)) continue;
                    
                    // Read the file content
                    let content = fs.readFileSync(schematicIndexPath, 'utf8');
                    
                    // Find and fix absolute paths like '/src/handlers'
                    content = content.replace(/path\.join\(['"]\/([^'"]+)['"]/g, "path.join('$1'");
                    content = content.replace(/['"]\/([^'"\/]+\/[^'"]+)['"]/g, "'$1'");
                    
                    // Write the modified content back
                    fs.writeFileSync(schematicIndexPath, content);
                    this.logger.debug(`Fixed absolute paths in ${type} schematic`);
                }
            }
        } catch (error) {
            this.logger.warn(`Error normalizing schematic paths: ${error instanceof Error ? error.message : String(error)}`);
        }
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
            this.logger.info(`Executing schematic '${schematicName}' from collection '${collectionName}'`);
            
            // Get the schematic from the collection object rather than directly from the workflow
            const schematic = collection.createSchematic(schematicName);
            if (!schematic) {
                throw new Error(`Could not find schematic '${schematicName}' in collection.`);
            }
            
            // Fix for schema validation errors with null values:
            // Replace null values with empty strings in the options to satisfy schema validation
            const cleanOptions = { ...schematicOptions };
            Object.entries(cleanOptions).forEach(([key, value]) => {
                if (value === null && key !== '_config') {
                    cleanOptions[key] = ''; // Replace null with empty string
                }
            });
            
            // Use the schematic directly with the workflow for execution
            const tree$ = workflow.execute({
                collection: collectionName,
                schematic: schematicName,
                options: cleanOptions,
                allowPrivate: true,
                debug: true,
                logger: this.logger
            });
            
            // Listen for various events to provide better feedback
            tree$.subscribe({
                error: (error: any) => {
                    // Create a helpful error message for EISDIR errors
                    const errorMsg = error instanceof Error ? error.message : String(error);
                    
                    if (errorMsg.includes('EISDIR')) {
                        this.logger.fatal(`
EISDIR error detected during schematic execution. This typically happens when the 
system tries to read a directory as a file. Please check your schematic structure.

Details:
- Schematic: ${schematicName}
- Collection: ${collectionName}
- Working directory: ${process.cwd()}
`);
                    }
                    
                    // Make sure we still throw the error to terminate execution properly
                    process.exitCode = 1;
                }
            });
            
            // Wait for completion
            await tree$.toPromise();

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
