// This script is used by Vercel to build the project
const { execSync } = require('child_process');

// Build the frontend
console.log('Building the frontend...');
execSync('npm run build', { stdio: 'inherit' });

console.log('Vercel build completed successfully!');