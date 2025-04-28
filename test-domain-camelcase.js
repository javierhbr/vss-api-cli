// Test script for domain creation with camelCase
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Create test directory
const testDir = path.join(process.env.HOME, 'others', 'dev', 'poc', 'test-camel-case');
const configFile = path.join(testDir, 'vss-api.config.json');

// Create directory if it doesn't exist
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create config file with camelCase setting
const config = {
  basePath: "src",
  fileNameCase: "camel",
  filePatterns: {
    domain: {
      modelFile: "{{camelName}}.ts",
      serviceFile: "{{camelName}}Service.ts",
      portFile: "{{camelName}}{{adapterType}}Port.ts",
      adapterFile: "{{camelName}}{{adapterType}}Adapter.ts"
    }
  }
};

fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
console.log(`Created config file at ${configFile}`);

// Run the CLI command directly
try {
  const cmd = `npx ts-node src/index.ts create:domain payment --yes -p ${testDir}`;
  console.log(`Running command: ${cmd}`);
  const output = execSync(cmd, { stdio: 'inherit' });
} catch (error) {
  console.error('Error running command:', error);
}

// Check created files
console.log('\n--- Created files ---');
const createdFiles = findFiles(testDir);
createdFiles.forEach(file => console.log(file));

function findFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    if (fs.statSync(filePath).isDirectory()) {
      findFiles(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  });
  
  return fileList;
}
