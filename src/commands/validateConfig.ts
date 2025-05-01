import { Command } from 'commander';
import * as path from 'path';
import * as fs from 'fs-extra';
import { spawn } from 'child_process';

/**
 * Command to validate file case consistency in configuration
 */
export function createValidateConfigCommand(program: Command): void {
  program
    .command('validate-config')
    .description('Validate file naming case consistency in configuration files')
    .option('-f, --fix', 'Apply automatic fixes to configuration files (creates backups)')
    .option('-v, --verbose', 'Show detailed information')
    .option('-p, --path <path>', 'Path to search for config files or specific config file', process.cwd())
    .action(async (options) => {
      try {
        const scriptPath = path.join(__dirname, '../../validate-file-cases-fixed.js');
        
        // Display welcome message
        console.clear();
        console.log('\x1b[36m' + `
  __     __   ______    ______          ______   _______   ______         ______   __        ______ 
  /  |   /  | /      \  /      \        /      \ /       \ /      |       /      \ /  |      /      |
  $$ |   $$ |/$$$$$$  |/$$$$$$  |      /$$$$$$  |$$$$$$$  |$$$$$$/       /$$$$$$  |$$ |      $$$$$$/ 
  $$ |   $$ |$$ \\__$$/ $$ \\__$$/         $$ |__$$ |$$ |__$$ |  $$ |        $$ |  $$/ $$ |        $$ |  
  $$  \\ /$$/ $$      \\ $$      \\          $$    $$ |$$    $$/   $$ |        $$ |      $$ |        $$ |  
   $$  /$$/   $$$$$$  | $$$$$$  |      $$$$$$$$ |$$$$$$$/    $$ |        $$ |   __ $$ |        $$ |  
    $$ $$/   /  \\__$$ |/  \\__$$ |        $$ |  $$ |$$ |       _$$ |_       $$ \\__/  |$$ |_____  _$$ |_ 
     $$$/    $$    $$/ $$    $$/       $$ |  $$ |$$ |      / $$   |      $$    $$/ $$       |/ $$   |
      $/      $$$$$$/   $$$$$$/        $$/   $$/ $$/       $$$$$$/        $$$$$$/  $$$$$$$$/ $$$$$$/ 
                                                                                                     
        ` + '\x1b[0m');
        console.log();
        console.log('\x1b[1m\x1b[33m>> Config Validation\x1b[0m');
        console.log('\x1b[90mValidating file naming case consistency in configuration files\x1b[0m');
        console.log();
        
        // Check if the validation script exists
        if (!fs.existsSync(scriptPath)) {
          console.error('\x1b[31mError: Validation script not found.\x1b[0m');
          return;
        }
        
        // Build arguments array
        const args = [scriptPath];
        
        // Add path if specified
        if (options.path && options.path !== process.cwd()) {
          args.push(options.path);
        }
        
        // Add fix and verbose flags if specified
        if (options.fix) {
          args.push('--fix');
        }
        
        if (options.verbose) {
          args.push('--verbose');
        }
        
        // Run the validation script
        const child = spawn('node', args, { stdio: 'inherit' });
        
        // Handle process exit
        child.on('close', (code) => {
          if (code === 0) {
            console.log('\n\x1b[32mValidation completed successfully\x1b[0m');
          } else {
            console.log('\n\x1b[31mValidation encountered issues\x1b[0m');
          }
          
          console.log('\n\x1b[90mFor more information, see the documentation:\x1b[0m');
          console.log('\x1b[36mhttps://domain/docs/file-naming-case\x1b[0m');
          console.log('\x1b[36mhttps://domain/docs/configuration-validation\x1b[0m');
        });
      } catch (error) {
        console.error('\x1b[31mError running validation:\x1b[0m', error);
      }
    });
}
