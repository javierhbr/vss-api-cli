const { execSync } = require('child_process');
const fs = require('fs-extra');
const path = require('path');

// Setup test directory
const testDir = path.resolve(__dirname, 'test-domain');
fs.removeSync(testDir);
fs.ensureDirSync(testDir);

// Create config file with camelCase specified
const configContent = `{
  "basePath": "src",
  "fileNameCase": "camel",
  "filePatterns": {
    "domain": {
      "modelFile": "{{camelName}}.ts",
      "serviceFile": "{{camelName}}Service.ts",
      "portFile": "{{camelName}}{{adapterType}}Port.ts",
      "adapterFile": "{{camelName}}{{adapterType}}Adapter.ts"
    }
  }
}`;

fs.writeFileSync(path.join(testDir, 'vss-api.config.json'), configContent);

// Run the command
try {
  console.log('Running domain command...');
  execSync(`npx ts-node src/index.ts create:domain payment -y -p ${testDir}`, {
    stdio: 'inherit',
    cwd: path.resolve(__dirname)
  });
  
  // Check if files were created with camelCase naming
  const files = fs.readdirSync(path.join(testDir, 'src/payment/models'));
  console.log('Files created:', files);
  
  if (files[0] === 'payment.ts') {
    console.log('✅ Success! File names use camelCase as specified in config.');
  } else {
    console.log('❌ Failed! File names do not use camelCase:', files);
  }
} catch (error) {
  console.error('Error running test:', error);
}
