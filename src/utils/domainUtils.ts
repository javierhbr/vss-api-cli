import * as fs from 'fs-extra';
import * as path from 'path';
import inquirer from 'inquirer';
import { runSchematic } from '../schematics-cli'; // Assuming schematics-cli exists

/**
 * Finds existing domain directories within the 'src' folder.
 */
export async function findExistingDomains(basePath: string = '.'): Promise<string[]> {
    const srcPath = path.join(basePath, 'src');
    try {
        const entries = await fs.readdir(srcPath, { withFileTypes: true });
        return entries
            .filter(dirent => dirent.isDirectory() && dirent.name !== 'infra' && dirent.name !== 'handlers' && dirent.name !== 'shared' && dirent.name !== 'config') // Exclude common non-domain folders
            .map(dirent => dirent.name);
    } catch (error) {
        // If src directory doesn't exist or other error, return empty array
        return [];
    }
}

/**
 * Finds existing services within domain directories.
 * Returns an array of objects { domain: string, service: string }.
 */
export async function findExistingServices(basePath: string = '.'): Promise<{ domain: string, service: string, name: string }[]> {
    const domains = await findExistingDomains(basePath);
    const services: { domain: string, service: string, name: string }[] = [];
    const srcPath = path.join(basePath, 'src');

    for (const domain of domains) {
        const servicesPath = path.join(srcPath, domain, 'services');
        try {
            if (await fs.pathExists(servicesPath)) {
                const files = await fs.readdir(servicesPath);
                files.forEach(file => {
                    if (file.endsWith('Service.ts') && !file.endsWith('.template')) {
                        const serviceName = file.replace('.ts', ''); // e.g., UserService
                        services.push({ domain, service: serviceName, name: `${serviceName} (domain: ${domain})` });
                    }
                });
            }
        } catch (error) {
            // Ignore errors for individual domains (e.g., permission issues)
            console.warn(`Could not read services in domain '${domain}':`, error);
        }
    }
    return services;
}

/**
 * Prompts the user to create a new domain interactively.
 * Handles all the necessary options and ensures consistent behavior
 */
export async function createDomainInteractively(options: {
  domainName?: string;
  path?: string;
  message?: string;
  showHeader?: boolean;
}): Promise<string | null> {
  const { domainName: providedName, path = '', message = 'Enter a name for the new domain:', showHeader = true } = options;
  
  try {
    if (showHeader) {
      console.log('\n📂 Creating a new domain...');
    }
    
    // Prompt for domain name if not provided
    let domainName = providedName || '';
    if (!domainName) {
      const domainAnswer = await inquirer.prompt([
        {
          type: 'input',
          name: 'domainName',
          message,
          validate: (input: string) => input.trim() !== '' || 'Domain name cannot be empty'
        }
      ]);
      domainName = domainAnswer.domainName;
    }
    
    // Ensure domainName is not empty or undefined
    if (!domainName) {
      console.error('Domain name cannot be empty');
      return null;
    }
    
    // Create schematic options 
    // We need to match EXACTLY what the domain schematic is expecting in index.ts
    const schematicOptions = {
      name: domainName,           // Raw name from user input
      path: path || '',
      model: true,
      service: true,
      port: true,
      adapterType: 'repository',
      
      // In the domain schematic (index.ts), these values are generated but NOT used directly
      // They are computed again inside the schematic. Therefore, we don't actually need to
      // pass them here. To avoid conflicts, we'll remove them.
    };
    
    // Run the domain schematic
    console.log(`\nGenerating domain ${domainName}...`);
    await runSchematic('domain', schematicOptions);
    console.log(`\n✅ Domain "${domainName}" created successfully.`);
    
    return domainName;
  } catch (error) {
    console.error('Failed to create domain:', error);
    return null;
  }
}