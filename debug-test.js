// Test script with better logging
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const testDir = path.join(process.env.HOME, 'others', 'dev', 'poc', 'simple-test');
console.log(`Using test directory: ${testDir}`);

// Ensure the test directory exists and is clean
if (fs.existsSync(testDir)) {
  try {
    // Clean up src directory if it exists
    const srcDir = path.join(testDir, 'src');
    if (fs.existsSync(srcDir)) {
      console.log('Cleaning up existing src directory');
      execSync(`rm -rf ${srcDir}`);
    }
  } catch (err) {
    console.error('Error cleaning directory:', err);
  }
} else {
  fs.mkdirSync(testDir, { recursive: true });
}

// Create a config file
const configFile = path.join(testDir, 'vss-api.config.json');
const config = {
  basePath: "src",
  fileNameCase: "camel"
};

fs.writeFileSync(configFile, JSON.stringify(config, null, 2), 'utf8');
console.log(`Created config file at ${configFile}`);

// Use spawn to better capture real-time output
console.log('\nRunning command with spawn to capture real-time output:');
const cwd = process.cwd();
const command = `npx ts-node src/index.ts create:domain product --yes -p ${testDir}`;
console.log(`Command: ${command}`);

const parts = command.split(' ');
const child = spawn(parts[0], parts.slice(1), {
  cwd,
  shell: true,
  stdio: 'inherit'
});

child.on('close', (code) => {
  console.log(`\nCommand exited with code ${code}`);
  
  // Check what files were created
  console.log('\nListing files created:');
  try {
    const findResult = execSync(`find ${testDir} -type f | sort`, { encoding: 'utf8' });
    console.log(findResult || 'No files found');
    
    // Check directory structure
    console.log('\nDirectory structure:');
    const treeResult = execSync(`find ${testDir} -type d | sort`, { encoding: 'utf8' });
    console.log(treeResult);
    
    // Check src folder specifically
    const srcDir = path.join(testDir, 'src');
    if (fs.existsSync(srcDir)) {
      console.log('\nContents of src directory:');
      const lsResult = execSync(`find ${srcDir} -type f -name "*.ts" | sort`, { encoding: 'utf8' });
      console.log(lsResult || 'No TypeScript files found');
      
      // Show content of each TypeScript file
      const files = lsResult.trim().split('\n').filter(f => f);
      if (files.length > 0) {
        console.log('\nFile contents:');
        files.forEach(file => {
          console.log(`\n--- ${file} ---`);
          const content = fs.readFileSync(file, 'utf8');
          console.log(content);
        });
      }
    } else {
      console.log('\nNo src directory was created');
    }
  } catch (err) {
    console.error('Error inspecting results:', err);
  }
});
