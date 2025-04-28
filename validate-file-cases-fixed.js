#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Base directory for tests
const BASE_DIR = path.join(process.cwd(), 'test-validation');

// Case styles to test
const CASE_STYLES = ['pascal', 'camel', 'kebab', 'snake'];

// Clean up previous test directory
if (fs.existsSync(BASE_DIR)) {
  console.log('Removing existing test directory...');
  fs.rmSync(BASE_DIR, { recursive: true, force: true });
}

// Create base directory
fs.mkdirSync(BASE_DIR, { recursive: true });

// Setup test directories with config files
console.log('Setting up test directories...');
CASE_STYLES.forEach(style => {
  const styleDir = path.join(BASE_DIR, style);
  fs.mkdirSync(styleDir, { recursive: true });
  
  const configContent = JSON.stringify({
    fileNameCase: style,
    basePath: "src"
  }, null, 2);
  
  fs.writeFileSync(path.join(styleDir, 'vss-api.config.json'), configContent);
  console.log(`Created config for ${style} case`);
});

// Run domain command for all styles
console.log('\nTesting create:domain command...');
CASE_STYLES.forEach(style => {
  console.log(`\n==== Testing ${style} case style ====`);
  const command = `node ./dist/index.js create:domain product --model --service --port --path ./test-validation/${style} --yes`;
  
  console.log(`\nRunning: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Successfully executed create:domain with ${style} case`);
  } catch (error) {
    console.error(`❌ Error executing create:domain with ${style} case: ${error.message}`);
  }
});

// Run port command for all styles
console.log('\nTesting create:port command...');
CASE_STYLES.forEach(style => {
  console.log(`\n==== Testing ${style} case style ====`);
  const command = `node ./dist/index.js create:port dataAccess --domain product --adapterType repository --path ./test-validation/${style} --yes`;
  
  console.log(`\nRunning: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Successfully executed create:port with ${style} case`);
  } catch (error) {
    console.error(`❌ Error executing create:port with ${style} case: ${error.message}`);
  }
});

// Run adapter command for all styles
console.log('\nTesting create:adapter command...');
CASE_STYLES.forEach(style => {
  console.log(`\n==== Testing ${style} case style ====`);
  const command = `node ./dist/index.js create:adapter mongoDb --domain product --port ProductRepositoryPort --type repository --path ./test-validation/${style} --yes`;
  
  console.log(`\nRunning: ${command}`);
  try {
    execSync(command, { stdio: 'inherit' });
    console.log(`✅ Successfully executed create:adapter with ${style} case`);
  } catch (error) {
    console.error(`❌ Error executing create:adapter with ${style} case: ${error.message}`);
  }
});

// List generated files
console.log('\n\nGenerated files summary:');
CASE_STYLES.forEach(style => {
  console.log(`\n==== ${style.toUpperCase()} case style files ====`);
  
  const styleDir = path.join(BASE_DIR, style);
  try {
    const files = execSync(`find ${styleDir} -type f -name "*.ts" | sort`, { encoding: 'utf8' });
    console.log(files);
    
    // Show content of one adapter file to verify imports
    const adapterFiles = execSync(`find ${styleDir}/src/infra -type f -name "*Adapter.ts" | head -1`, { encoding: 'utf8' }).trim();
    if (adapterFiles) {
      console.log(`\nAdapter file content (to verify imports):`);
      const content = fs.readFileSync(adapterFiles, 'utf8');
      console.log(content);
    }
  } catch (error) {
    console.error(`Error listing files for ${style}: ${error.message}`);
  }
});

console.log('\n✅ Validation complete!');
