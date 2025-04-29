#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

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

function log(message, color = colors.white) {
  console.log(`${color}${message}${colors.reset}`);
}

function createTestDir(name) {
  const dir = path.join(process.cwd(), `config-test-${name}`);
  log(`Creating test directory: ${dir}`, colors.cyan);
  
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true });
  }
  
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function writeConfig(dir, config) {
  const configPath = path.join(dir, 'vss-api.config.json');
  log(`Writing config to: ${configPath}`, colors.cyan);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  return configPath;
}

function testConfigLoading(dir, description) {
  log(`\n${colors.bold}${colors.magenta}TEST: ${description}${colors.reset}`);
  
  // Create a simple test file that loads the config from the directory
  const testScript = `
  const { loadConfig } = require('./dist/utils/configLoader');
  console.log('Loading config from:', '${dir.replace(/\\/g, '\\\\')}');
  const config = loadConfig('${dir.replace(/\\/g, '\\\\')}', true);
  console.log('CONFIG:', JSON.stringify(config, null, 2));
  `;
  
  const testScriptPath = path.join(process.cwd(), '.temp-test.js');
  fs.writeFileSync(testScriptPath, testScript);
  
  try {
    log('Running config loading test...', colors.yellow);
    const output = execSync(`node ${testScriptPath}`, { encoding: 'utf8' });
    log(output, colors.green);
    log('✓ Config loaded successfully', colors.green);
    return true;
  } catch (error) {
    log(`✗ Error loading config: ${error.message}`, colors.red);
    if (error.stdout) log(`stdout: ${error.stdout}`, colors.yellow);
    if (error.stderr) log(`stderr: ${error.stderr}`, colors.red);
    return false;
  } finally {
    // Clean up
    fs.unlinkSync(testScriptPath);
  }
}

// Main test routine
function runTests() {
  log(`${colors.bold}${colors.blue}==== Config Loading Tests ====${colors.reset}`);
  
  // Test 1: Basic Config
  const basicDir = createTestDir('basic');
  writeConfig(basicDir, {
    basePath: "src",
    fileNameCase: "kebab"
  });
  testConfigLoading(basicDir, "Basic Config");
  
  // Test 2: Config with Directory Patterns
  const dirPatternsDir = createTestDir('dir-patterns');
  writeConfig(dirPatternsDir, {
    basePath: "src",
    fileNameCase: "camel",
    directories: {
      handler: {
        base: "functions",
        schema: "functions/schemas"
      }
    }
  });
  testConfigLoading(dirPatternsDir, "Directory Patterns Config");
  
  // Test 3: Config with File Patterns
  const filePatternsDir = createTestDir('file-patterns');
  writeConfig(filePatternsDir, {
    basePath: "src",
    fileNameCase: "pascal",
    filePatterns: {
      handler: {
        handlerFile: "{{pascalName}}Handler.ts",
        schemaFile: "{{pascalName}}Schema.ts",
      }
    }
  });
  testConfigLoading(filePatternsDir, "File Patterns Config");
  
  // Test 4: Complex Config
  const complexDir = createTestDir('complex');
  writeConfig(complexDir, {
    basePath: "app",
    fileNameCase: "snake",
    directories: {
      handler: {
        base: "functions/{{dashName}}",
        schema: "functions/{{dashName}}/schemas"
      },
      domain: {
        base: "domains/{{domainName}}",
        model: "domains/{{domainName}}/models",
        service: "domains/{{domainName}}/services"
      }
    },
    filePatterns: {
      handler: {
        handlerFile: "index.ts",
        schemaFile: "schema.ts"
      },
      domain: {
        modelFile: "{{snakeName}}_model.ts",
        serviceFile: "{{snakeName}}_service.ts"
      }
    }
  });
  testConfigLoading(complexDir, "Complex Config");
  
  log(`\n${colors.bold}${colors.blue}Tests completed.${colors.reset}`);
}

// Run the tests
runTests();
