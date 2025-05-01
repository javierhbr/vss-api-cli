#!/usr/bin/env node

/**
 * This script validates that the fileNameCase setting in vss-api.config.json
 * is consistent with the template variables used in file patterns.
 * 
 * It walks through all directories in the workspace looking for vss-api.config.json files
 * and validates each one.
 * 
 * Usage:
 *  - ./validate-file-cases-fixed.js                         # Search in current directory
 *  - ./validate-file-cases-fixed.js path/to/search          # Search in specified directory
 *  - ./validate-file-cases-fixed.js config.json             # Validate specific config file
 *  - ./validate-file-cases-fixed.js --fix                   # Apply auto-fixes (creates backups) 
 *  - ./validate-file-cases-fixed.js path/to/search --fix    # Fix configs in specified directory
 */

const fs = require('fs');
const path = require('path');

// Colors for better terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m"
};

// Logging function with color
function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

// Case mapping between fileNameCase setting and template variables
const caseToVariableMap = {
  pascal: 'pascalName',
  camel: 'camelName',
  kebab: 'dashName',
  snake: 'snakeName'
};

// Map of case variables and their descriptions
const variableDescriptions = {
  'name': 'Raw name as provided',
  'pascalName': 'PascalCase version',
  'dashName': 'Kebab-case version',
  'camelName': 'CamelCase version',
  'snakeName': 'Snake_case version',
  'domainName': 'Domain name (if applicable)',
  'serviceName': 'Service name (if applicable)',
  'adapterType': 'Adapter type (if applicable)'
};

// Command line arguments
const ARGS = {
  shouldFix: process.argv.includes('--fix') || process.argv.includes('-f'),
  verbose: process.argv.includes('--verbose') || process.argv.includes('-v'),
};

// Get all template variables in a string
function extractTemplateVars(template) {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches = [];
  let match;
  
  while ((match = regex.exec(template)) !== null) {
    matches.push(match[1]);
  }
  
  return matches;
}

// Validate a config file
function validateConfigFile(configPath) {
  try {
    log(`\n${colors.bold}${colors.blue}Validating config file: ${configPath}${colors.reset}`);
    
    // Read and parse config file
    if (!fs.existsSync(configPath)) {
      log(`Config file not found: ${configPath}`, colors.red);
      return false;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    
    // Check if fileNameCase is set
    if (!config.fileNameCase) {
      log(`No fileNameCase specified in config, using default: pascal`, colors.yellow);
      config.fileNameCase = 'pascal'; // Default
    }
    
    // Get the recommended variable based on fileNameCase
    const recommendedVar = caseToVariableMap[config.fileNameCase];
    
    if (!recommendedVar) {
      log(`Invalid fileNameCase value: ${config.fileNameCase}. Valid values are: pascal, camel, kebab, snake`, colors.red);
      return false;
    }
    
    log(`${colors.cyan}Config using fileNameCase: "${config.fileNameCase}" (expected template variable: {{${recommendedVar}}})${colors.reset}`);
    
    let allValid = true;
    let warnings = 0;
    
    // Validate file patterns
    if (config.filePatterns) {
      log(`\nValidating file patterns...`, colors.blue);
      
      for (const [componentType, patterns] of Object.entries(config.filePatterns)) {
        for (const [fileType, pattern] of Object.entries(patterns)) {
          const varsInPattern = extractTemplateVars(pattern);
          const filenameVars = varsInPattern.filter(v => ['name', 'pascalName', 'camelName', 'dashName', 'snakeName'].includes(v));
          
          // Check if the pattern contains the recommended variable
          if (filenameVars.length > 0 && !filenameVars.includes(recommendedVar)) {
            log(`${colors.yellow}Warning: ${componentType}.${fileType}: "${pattern}" does not use {{${recommendedVar}}}, which is recommended for fileNameCase: "${config.fileNameCase}"${colors.reset}`);
            warnings++;
            
            // Show which case-specific variable is being used instead
            filenameVars.forEach(v => {
              if (v !== recommendedVar && Object.values(caseToVariableMap).includes(v)) {
                const usedCase = Object.entries(caseToVariableMap).find(([key, value]) => value === v)[0];
                log(`  - Using {{${v}}} which is for fileNameCase: "${usedCase}"`, colors.yellow);
              }
            });
          } else if (filenameVars.length === 0) {
            // No case variables used at all
            log(`${colors.yellow}Warning: ${componentType}.${fileType}: "${pattern}" doesn't use any case variable. Consider using {{${recommendedVar}}}${colors.reset}`);
            warnings++;
          } else {
            log(`✓ ${componentType}.${fileType}: "${pattern}" correctly uses {{${recommendedVar}}}`, colors.green);
          }
        }
      }
    }
    
    // Overall results
    if (warnings > 0) {
      log(`\n${colors.yellow}${warnings} warning(s) found. The config will work but may produce inconsistent file naming.${colors.reset}`);
      log(`Recommended template variable for fileNameCase "${config.fileNameCase}" is {{${recommendedVar}}}.`, colors.blue);
      
      // Show suggested fix
      log(`\n${colors.bold}${colors.magenta}Suggested fixes:${colors.reset}`);
      log(`1. Change your fileNameCase to match the template variables you're using, OR`, colors.magenta);
      log(`2. Update your file patterns to use {{${recommendedVar}}} instead of other case variables`, colors.magenta);
      
      // Example
      log(`\n${colors.cyan}Example config:${colors.reset}`);
      log(`{
  "fileNameCase": "${config.fileNameCase}",
  "filePatterns": {
    "handler": {
      "handlerFile": "{{${recommendedVar}}}.handler.ts",
      "schemaFile": "{{${recommendedVar}}}Schema.ts" 
    }
  }
}`, colors.cyan);
    } else {
      log(`\n${colors.green}✓ No inconsistencies found between fileNameCase "${config.fileNameCase}" and template variables.${colors.reset}`);
    }
    
    return allValid;
  } catch (error) {
    log(`Error validating config file: ${error}`, colors.red);
    return false;
  }
}

// Fix a config file to use consistent template variables
function fixConfigFile(configPath, backup = true) {
  try {
    log(`\n${colors.bold}${colors.magenta}Fixing config file: ${configPath}${colors.reset}`);
    
    // Read and parse config file
    if (!fs.existsSync(configPath)) {
      log(`Config file not found: ${configPath}`, colors.red);
      return false;
    }
    
    // Create backup first
    if (backup) {
      const backupPath = `${configPath}.bak`;
      fs.copyFileSync(configPath, backupPath);
      log(`Created backup at ${backupPath}`, colors.blue);
    }
    
    const configContent = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(configContent);
    let configUpdated = false;
    
    // Check if fileNameCase is set
    if (!config.fileNameCase) {
      log(`No fileNameCase specified in config, using default: pascal`, colors.yellow);
      config.fileNameCase = 'pascal';
    }
    
    // Get the recommended variable based on fileNameCase
    const recommendedVar = caseToVariableMap[config.fileNameCase];
    
    if (!recommendedVar) {
      log(`Invalid fileNameCase value: ${config.fileNameCase}. Cannot fix.`, colors.red);
      return false;
    }
    
    log(`Fixing template variables to be consistent with fileNameCase: "${config.fileNameCase}" (using {{${recommendedVar}}})`, colors.cyan);
    
    // Fix file patterns
    if (config.filePatterns) {
      for (const [componentType, patterns] of Object.entries(config.filePatterns)) {
        for (const [fileType, pattern] of Object.entries(patterns)) {
          const varsInPattern = extractTemplateVars(pattern);
          const filenameVars = varsInPattern.filter(v => 
            ['name', 'pascalName', 'camelName', 'dashName', 'snakeName'].includes(v)
          );
          
          if (filenameVars.length > 0 && !filenameVars.includes(recommendedVar)) {
            // Replace other case variables with the recommended one
            let newPattern = pattern;
            filenameVars.forEach(v => {
              if (v !== recommendedVar && Object.values(caseToVariableMap).includes(v)) {
                const regex = new RegExp(`\\{\\{${v}\\}\\}`, 'g');
                newPattern = newPattern.replace(regex, `{{${recommendedVar}}}`);
              }
            });
            
            if (newPattern !== pattern) {
              log(`  Fixed ${componentType}.${fileType}: "${pattern}" → "${newPattern}"`, colors.green);
              config.filePatterns[componentType][fileType] = newPattern;
              configUpdated = true;
            }
          }
        }
      }
    }
    
    if (configUpdated) {
      // Write the fixed config back to the file
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      log(`✓ Updated config file with consistent template variables`, colors.green);
      return true;
    } else {
      log(`✓ No fixes needed, config is already consistent`, colors.green);
      return false;
    }
  } catch (error) {
    log(`Error fixing config file: ${error}`, colors.red);
    return false;
  }
}

// Find all vss-api.config.json files in the given directory and its subdirectories
function findConfigFiles(startDir, maxDepth = 4, currentDepth = 0) {
  if (currentDepth > maxDepth) return [];
  
  const files = [];
  try {
    const entries = fs.readdirSync(startDir, { withFileTypes: true });
    
    // First check for config file in current directory
    if (entries.some(entry => !entry.isDirectory() && entry.name === 'vss-api.config.json')) {
      files.push(path.join(startDir, 'vss-api.config.json'));
    }
    
    // Then recursively check subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const subDir = path.join(startDir, entry.name);
        files.push(...findConfigFiles(subDir, maxDepth, currentDepth + 1));
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }
  
  return files;
}

// Process command line arguments
function main() {
  // Filter out --fix and --verbose arguments for directory/file path detection
  const args = process.argv.slice(2).filter(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  const startDir = args[0] || process.cwd();
  
  if (args[0] && args[0].endsWith('vss-api.config.json')) {
    // If a specific config file is provided
    const configPath = args[0];
    
    if (ARGS.shouldFix) {
      // Fix the specific config file
      fixConfigFile(configPath);
      // Validate again to confirm fixes
      log('\n--- Validating after fix ---');
      validateConfigFile(configPath);
    } else {
      // Just validate the specific config file
      const isValid = validateConfigFile(configPath);
      if (!isValid) {
        log(`\nRun with --fix option to automatically fix issues:`, colors.cyan);
        log(`  ${process.argv[0]} ${configPath} --fix`, colors.cyan);
      }
    }
  } else {
    // Search for config files
    log(`${colors.bold}${colors.blue}Searching for vss-api.config.json files in: ${startDir}${colors.reset}`);
    const configFiles = findConfigFiles(startDir);
    
    if (configFiles.length === 0) {
      log(`No vss-api.config.json files found.`, colors.yellow);
      return;
    }
    
    log(`Found ${configFiles.length} config file(s)`, colors.blue);
    
    if (ARGS.shouldFix) {
      // Fix each config file
      let fixedCount = 0;
      configFiles.forEach(configFile => {
        const wasFixed = fixConfigFile(configFile);
        if (wasFixed) fixedCount++;
      });
      
      log(`\n${colors.bold}${colors.blue}Fix Summary: ${fixedCount}/${configFiles.length} config files were updated${colors.reset}`);
      
      // Validate again after fixing
      log('\n--- Validating after fixes ---');
      let validCount = 0;
      configFiles.forEach(configFile => {
        const isValid = validateConfigFile(configFile);
        if (isValid) validCount++;
      });
      
      log(`\n${colors.bold}${colors.blue}Validation Summary: ${validCount}/${configFiles.length} config files are now fully consistent${colors.reset}`);
    } else {
      // Just validate each config file
      let validCount = 0;
      configFiles.forEach(configFile => {
        const isValid = validateConfigFile(configFile);
        if (isValid) validCount++;
      });
      
      log(`\n${colors.bold}${colors.blue}Summary: ${validCount}/${configFiles.length} config files are fully consistent with fileNameCase settings${colors.reset}`);
      
      if (validCount < configFiles.length) {
        log(`\nRun with --fix option to automatically fix all issues:`, colors.cyan);
        log(`  ${process.argv[0]} ${startDir} --fix`, colors.cyan);
      }
    }
  }
}

// Run the script
main();
