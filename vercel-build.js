// This file is used to customize the build process for Vercel
// It simply runs the existing build script in package.json
import { execSync } from 'child_process';

// Run the build script
console.log('Starting build process for Vercel deployment...');
execSync('npm run build', { stdio: 'inherit' });
console.log('Build completed successfully!');