import inquirer from 'inquirer';
import { runSchematic } from '../schematics-cli';

/**
 * Creates a new domain that can be used by different commands
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