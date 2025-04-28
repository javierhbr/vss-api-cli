// Direct test script
const { execSync } = require('child_process');

try {
  console.log('Running domain command...');
  const output = execSync('npx ts-node src/index.ts create:domain user --yes -p ~/others/dev/poc/cli-test', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('Error:', error.message);
}
