const fs = require('fs');
const archiver = require('archiver');
const path = require('path');

async function createDeploymentPackage() {
  const output = fs.createWriteStream('backend-minimal.zip');
  const archive = archiver('zip', {
    zlib: { level: 9 } // Maximum compression
  });

  output.on('close', () => {
    console.log(`Package created: ${archive.pointer()} bytes`);
    console.log(`Size: ${Math.round(archive.pointer() / 1024 / 1024 * 100) / 100} MB`);
  });

  archive.on('error', (err) => {
    throw err;
  });

  archive.pipe(output);
  
  // Add essential files
  archive.file('simple-handler.js', { name: 'index.js' });
  archive.file('package.json');
  
  // Add only essential node_modules with dependencies
  const essentialModules = [
    'serverless-http',
    'express', 
    'cors',
    'helmet',
    'express-rate-limit',
    'dotenv',
    // Express dependencies
    'accepts',
    'array-flatten',
    'content-disposition',
    'content-type',
    'cookie',
    'cookie-signature',
    'debug',
    'depd',
    'destroy',
    'ee-first',
    'encodeurl',
    'escape-html',
    'etag',
    'finalhandler',
    'forwarded',
    'fresh',
    'http-errors',
    'ipaddr.js',
    'media-typer',
    'merge-descriptors',
    'methods',
    'mime',
    'negotiator',
    'on-finished',
    'parseurl',
    'path-to-regexp',
    'proxy-addr',
    'qs',
    'range-parser',
    'safe-buffer',
    'send',
    'serve-static',
    'setprototypeof',
    'statuses',
    'type-is',
    'utils-merge',
    'vary',
    'ms',
    'inherits',
    'toidentifier',
    'unpipe'
  ];

  for (const module of essentialModules) {
    const modulePath = `./node_modules/${module}`;
    if (fs.existsSync(modulePath)) {
      archive.directory(modulePath, `node_modules/${module}`);
    }
  }

  await archive.finalize();
}

createDeploymentPackage().catch(console.error);
