#!/usr/bin/env node

/**
 * This script validates that the fileNameCase setting in vss-api.config.json
 * is consistent with the template variables used in file patterns.
 * It checks if the file patterns are using the appropriate case variable
 * according to the fileNameCase setting.
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
  snake: 'snakeName' // Note: snakeName is missing from documentation but should be added
};

// Map of case variables found in documentation
const variableDescriptions = {
  'name': 'Raw name as provided',
  'pascalName': 'PascalCase version',
  'dashName': 'Kebab-case version',
  'camelName': 'CamelCase version',
  'snakeName': 'Snake_case version', // This is the missing one
  'domainName': 'Domain name (if applicable)',
  'serviceName': 'Service name (if applicable)',
  'adapterType': 'Adapter type (if applicable)'
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
    log(`Validating config file: ${configPath}`, colors.cyan);
    
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
    
    // Check if snake case is used but snakeName is missing from docs
    if (config.fileNameCase === 'snake') {
      log(`${colors.yellow}Warning: You are using fileNameCase: "snake" but the template variable {{snakeName}} is not documented in README.${colors.reset}`);
      log(`Consider adding {{snakeName}} to the Template Variables Reference in your documentation.`, colors.yellow);
    }
    
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
    } else {
      log(`\n${colors.green}✓ No inconsistencies found between fileNameCase "${config.fileNameCase}" and template variables.${colors.reset}`);
    }
    
    return allValid;
  } catch (error) {
    log(`Error validating config file: ${error}`, colors.red);
    return false;
  }
}

// Process command line arguments
function main() {
  const configPath = process.argv[2] || path.join(process.cwd(), 'vss-api.config.json');
  validateConfigFile(configPath);
}

// Run the script
main();
