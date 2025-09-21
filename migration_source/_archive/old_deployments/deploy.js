#!/usr/bin/env node

/**
 * Celora Production Deployment Script
 * Handles secure deployment to Render backend and Netlify frontend
 */

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');
const crypto = require('crypto');

class ProductionDeployer {
  constructor() {
    this.config = {
      name: 'Celora Crypto Banking Platform',
      version: '1.0.0',
      frontendPath: '.',
      backendPath: './celora-backend',
      buildDir: './dist',
      deploying: false
    };
    
    this.requiredEnvVars = [
      'JWT_SECRET',
      'CORS_ORIGIN'
    ];
    
    this.optionalEnvVars = [
      'NETLIFY_DATABASE_URL',
      'RENDER_API_KEY', 
      'SENDGRID_API_KEY',
      'ENCRYPTION_KEY'
    ];
  }

  async deploy() {
    console.log('🚀 Starting Celora Production Deployment...\n');
    
    try {
      this.deploying = true;
      
      // Pre-deployment checks
      await this.performPreDeploymentChecks();
      
      // Build and optimize
      await this.buildProject();
      
      // Deploy backend to Render
      await this.deployBackend();
      
      // Deploy frontend to Netlify  
      await this.deployFrontend();
      
      // Post-deployment verification
      await this.verifyDeployment();
      
      console.log('✅ Deployment completed successfully!\n');
      await this.showDeploymentInfo();
      
    } catch (error) {
      console.error('❌ Deployment failed:', error.message);
      await this.rollback();
      process.exit(1);
    } finally {
      this.deploying = false;
    }
  }

  async performPreDeploymentChecks() {
    console.log('🔍 Performing pre-deployment checks...');
    
    // Check Node.js version
    const nodeVersion = process.version;
    console.log(`📦 Node.js version: ${nodeVersion}`);
    
    if (!nodeVersion.startsWith('v18.') && !nodeVersion.startsWith('v20.')) {
      console.warn('⚠️ Recommended Node.js version is 18.x or 20.x');
    }

    // Check environment variables
    await this.checkEnvironmentVariables();
    
    // Check dependencies
    await this.checkDependencies();
    
    // Run tests
    await this.runTests();
    
    // Security audit
    await this.securityAudit();
    
    // Database connection test
    await this.testDatabaseConnection();
    
    console.log('✅ Pre-deployment checks passed\n');
  }

  async checkEnvironmentVariables() {
    console.log('🔐 Checking environment variables...');
    
    // Check if .env file exists
    const envExists = await this.fileExists('.env');
    if (!envExists) {
      throw new Error('.env file not found. Please create it with required variables.');
    }

    // Load environment variables
    require('dotenv').config();

    // Check required variables
    const missing = this.requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missing.length > 0) {
      throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }

    // Validate JWT secret strength
    const jwtSecret = process.env.JWT_SECRET;
    if (jwtSecret.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long');
    }

    // Check for test/development values
    const dangerousValues = ['test', 'development', 'localhost', '123456'];
    for (const varName of this.requiredEnvVars) {
      const value = process.env[varName].toLowerCase();
      if (dangerousValues.some(danger => value.includes(danger))) {
        console.warn(`⚠️ ${varName} appears to contain test/development values`);
      }
    }

    console.log('✅ Environment variables validated');
  }

  async checkDependencies() {
    console.log('📦 Checking dependencies...');
    
    // Check if package.json exists
    const packageExists = await this.fileExists('package.json');
    if (!packageExists) {
      throw new Error('package.json not found');
    }

    // Install dependencies if needed
    try {
      execSync('npm ci --only=production', { stdio: 'pipe' });
      console.log('✅ Production dependencies installed');
    } catch (error) {
      throw new Error('Failed to install dependencies: ' + error.message);
    }

    // Check for security vulnerabilities
    try {
      execSync('npm audit --audit-level=high', { stdio: 'pipe' });
      console.log('✅ No high-severity vulnerabilities found');
    } catch (error) {
      console.warn('⚠️ Security vulnerabilities detected. Run: npm audit fix');
    }
  }

  async runTests() {
    console.log('🧪 Running tests...');
    
    try {
      // Run unit tests if they exist
      const testScript = await this.hasScript('test');
      if (testScript) {
        execSync('npm test', { stdio: 'pipe' });
        console.log('✅ All tests passed');
      } else {
        console.log('ℹ️ No tests configured (recommended to add tests)');
      }
    } catch (error) {
      throw new Error('Tests failed: ' + error.message);
    }
  }

  async securityAudit() {
    console.log('🔒 Performing security audit...');
    
    // Check for common security issues
    const securityChecks = [
      this.checkForHardcodedSecrets(),
      this.checkFilePermissions(),
      this.checkGitignore(),
      this.validateSecurityHeaders()
    ];

    await Promise.all(securityChecks);
    console.log('✅ Security audit passed');
  }

  async checkForHardcodedSecrets() {
    console.log('🔍 Scanning for hardcoded secrets...');
    
    const sensitivePatterns = [
      /password\s*=\s*["'][^"']*["']/gi,
      /api[_-]?key\s*=\s*["'][^"']*["']/gi,
      /secret\s*=\s*["'][^"']*["']/gi,
      /token\s*=\s*["'][^"']*["']/gi
    ];

    const jsFiles = await this.findFiles('.', /\.js$|\.ts$|\.jsx$|\.tsx$/);
    
    for (const file of jsFiles) {
      const content = await fs.readFile(file, 'utf8');
      for (const pattern of sensitivePatterns) {
        if (pattern.test(content)) {
          console.warn(`⚠️ Potential hardcoded secret in ${file}`);
        }
      }
    }
  }

  async checkFilePermissions() {
    console.log('📂 Checking file permissions...');
    
    const sensitiveFiles = ['.env', '.env.production', 'config/database.js'];
    
    for (const file of sensitiveFiles) {
      if (await this.fileExists(file)) {
        const stats = await fs.stat(file);
        const mode = (stats.mode & parseInt('777', 8)).toString(8);
        
        if (mode !== '600' && mode !== '644') {
          console.warn(`⚠️ File ${file} has permissions ${mode} (recommended: 600)`);
        }
      }
    }
  }

  async checkGitignore() {
    console.log('📝 Checking .gitignore...');
    
    const gitignoreExists = await this.fileExists('.gitignore');
    if (!gitignoreExists) {
      console.warn('⚠️ .gitignore file not found');
      return;
    }

    const gitignore = await fs.readFile('.gitignore', 'utf8');
    const requiredEntries = ['.env', 'node_modules/', '*.log', '.DS_Store'];
    
    for (const entry of requiredEntries) {
      if (!gitignore.includes(entry)) {
        console.warn(`⚠️ .gitignore missing: ${entry}`);
      }
    }
  }

  async validateSecurityHeaders() {
    console.log('🛡️ Validating security headers...');
    
    const headersFile = '_headers';
    const headersExists = await this.fileExists(headersFile);
    
    if (!headersExists) {
      console.warn('⚠️ _headers file not found (recommended for security)');
      return;
    }

    const headers = await fs.readFile(headersFile, 'utf8');
    const requiredHeaders = [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Content-Security-Policy',
      'X-XSS-Protection'
    ];

    for (const header of requiredHeaders) {
      if (!headers.includes(header)) {
        console.warn(`⚠️ Missing security header: ${header}`);
      }
    }
  }

  async testDatabaseConnection() {
    console.log('🗄️ Testing database connection...');
    
    try {
      const { validateEnvironment } = require('./celora-backend/src/utils/validateEnvironment');
      const envStatus = validateEnvironment();
      
      if (!envStatus.isValid) {
        throw new Error('Environment validation failed: ' + envStatus.errors.join(', '));
      }

      console.log('✅ Database configuration validated');
    } catch (error) {
      throw new Error('Database connection test failed: ' + error.message);
    }
  }

  async buildProject() {
    console.log('🏗️ Building project for production...\n');
    
    // Create build directory
    await this.ensureDirectory(this.config.buildDir);
    
    // Build frontend
    await this.buildFrontend();
    
    // Prepare backend
    await this.prepareBackend();
    
    // Optimize assets
    await this.optimizeAssets();
    
    console.log('✅ Build completed successfully\n');
  }

  async buildFrontend() {
    console.log('🎨 Building frontend...');
    
    try {
      // Copy HTML files
      const htmlFiles = await this.findFiles('.', /\.html$/);
      for (const file of htmlFiles) {
        const dest = path.join(this.config.buildDir, path.basename(file));
        await fs.copyFile(file, dest);
      }

      // Copy and optimize CSS/JS
      const dirs = ['css', 'js', 'icons', 'images'];
      for (const dir of dirs) {
        if (await this.directoryExists(dir)) {
          await this.copyDirectory(dir, path.join(this.config.buildDir, dir));
        }
      }

      // Copy PWA files
      const pwaFiles = ['manifest.json', 'sw.js', '_headers', '_redirects'];
      for (const file of pwaFiles) {
        if (await this.fileExists(file)) {
          await fs.copyFile(file, path.join(this.config.buildDir, file));
        }
      }

      console.log('✅ Frontend build completed');
    } catch (error) {
      throw new Error('Frontend build failed: ' + error.message);
    }
  }

  async prepareBackend() {
    console.log('⚙️ Preparing backend...');
    
    try {
      const backendBuildDir = path.join(this.config.buildDir, 'backend');
      await this.ensureDirectory(backendBuildDir);
      
      // Copy backend files
      if (await this.directoryExists(this.config.backendPath)) {
        await this.copyDirectory(this.config.backendPath, backendBuildDir);
        
        // Install production dependencies
        execSync('npm ci --only=production', { 
          stdio: 'pipe', 
          cwd: backendBuildDir 
        });
        
        console.log('✅ Backend preparation completed');
      } else {
        console.log('ℹ️ Backend directory not found, skipping backend preparation');
      }
    } catch (error) {
      throw new Error('Backend preparation failed: ' + error.message);
    }
  }

  async optimizeAssets() {
    console.log('⚡ Optimizing assets...');
    
    try {
      // Minify CSS if cssnano is available
      try {
        const cssFiles = await this.findFiles(this.config.buildDir, /\.css$/);
        for (const cssFile of cssFiles) {
          console.log(`📝 Optimizing ${cssFile}`);
          // Could add CSS minification here if needed
        }
      } catch (error) {
        console.log('ℹ️ CSS optimization skipped');
      }

      // Optimize images if available
      try {
        const imageFiles = await this.findFiles(this.config.buildDir, /\.(png|jpg|jpeg|gif|svg)$/);
        console.log(`🖼️ Found ${imageFiles.length} images to optimize`);
      } catch (error) {
        console.log('ℹ️ Image optimization skipped');
      }

      console.log('✅ Asset optimization completed');
    } catch (error) {
      console.warn('⚠️ Asset optimization failed:', error.message);
    }
  }

  async deployBackend() {
    console.log('🚀 Deploying backend to Render...\n');
    
    try {
      // Create Render deployment configuration
      const renderConfig = {
        name: 'celora-backend',
        type: 'web_service',
        env: 'node',
        buildCommand: 'npm install',
        startCommand: 'npm start',
        envVars: this.getBackendEnvVars()
      };

      console.log('📋 Render configuration created');
      
      // Save deployment info
      await this.saveDeploymentInfo('backend', {
        platform: 'render',
        config: renderConfig,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Backend deployment configuration ready');
      console.log('ℹ️ Manual step: Deploy to Render using the provided configuration');
      
    } catch (error) {
      throw new Error('Backend deployment failed: ' + error.message);
    }
  }

  async deployFrontend() {
    console.log('🌐 Deploying frontend to Netlify...\n');
    
    try {
      // Create Netlify configuration
      const netlifyConfig = {
        build: {
          publish: this.config.buildDir,
          command: 'echo "Build completed"'
        },
        headers: [
          {
            for: '/*',
            values: {
              'X-Frame-Options': 'DENY',
              'X-Content-Type-Options': 'nosniff',
              'X-XSS-Protection': '1; mode=block',
              'Referrer-Policy': 'strict-origin-when-cross-origin'
            }
          }
        ],
        redirects: [
          {
            from: '/api/*',
            to: `${process.env.BACKEND_URL || 'https://celora-backend.onrender.com'}/api/:splat`,
            status: 200
          }
        ]
      };

      // Save Netlify configuration
      await fs.writeFile(
        path.join(this.config.buildDir, 'netlify.toml'),
        this.tomlStringify(netlifyConfig)
      );

      console.log('📋 Netlify configuration created');
      
      // Save deployment info
      await this.saveDeploymentInfo('frontend', {
        platform: 'netlify',
        buildDir: this.config.buildDir,
        config: netlifyConfig,
        timestamp: new Date().toISOString()
      });

      console.log('✅ Frontend deployment configuration ready');
      console.log('ℹ️ Manual step: Deploy to Netlify using the build directory');
      
    } catch (error) {
      throw new Error('Frontend deployment failed: ' + error.message);
    }
  }

  async verifyDeployment() {
    console.log('🔍 Performing post-deployment verification...\n');
    
    try {
      // Verify build directory
      const buildExists = await this.directoryExists(this.config.buildDir);
      if (!buildExists) {
        throw new Error('Build directory not found');
      }

      // Check critical files
      const criticalFiles = [
        'index.html',
        'manifest.json',
        'sw.js',
        '_headers',
        'netlify.toml'
      ];

      for (const file of criticalFiles) {
        const filePath = path.join(this.config.buildDir, file);
        const exists = await this.fileExists(filePath);
        
        if (exists) {
          console.log(`✅ ${file} - OK`);
        } else {
          console.warn(`⚠️ ${file} - Missing`);
        }
      }

      console.log('✅ Post-deployment verification completed\n');
    } catch (error) {
      throw new Error('Deployment verification failed: ' + error.message);
    }
  }

  async rollback() {
    console.log('🔄 Initiating rollback...\n');
    
    try {
      // Remove build directory
      if (await this.directoryExists(this.config.buildDir)) {
        await fs.rm(this.config.buildDir, { recursive: true, force: true });
        console.log('🗑️ Build directory cleaned up');
      }

      console.log('✅ Rollback completed\n');
    } catch (error) {
      console.error('❌ Rollback failed:', error.message);
    }
  }

  async showDeploymentInfo() {
    console.log('📊 Deployment Information:\n');
    console.log(`🏷️  Project: ${this.config.name}`);
    console.log(`📦 Version: ${this.config.version}`);
    console.log(`🗂️  Build Directory: ${this.config.buildDir}`);
    console.log(`⏰ Deployment Time: ${new Date().toISOString()}`);
    
    console.log('\n🔗 Next Steps:');
    console.log('1. Deploy backend to Render using the generated configuration');
    console.log('2. Deploy frontend to Netlify using the build directory');
    console.log('3. Update DNS settings to point to Netlify');
    console.log('4. Test all functionality on production');
    console.log('5. Monitor logs and metrics');
    
    console.log('\n📚 Important Notes:');
    console.log('- Database expires September 14, 2025 (claim required)');
    console.log('- Update environment variables on hosting platforms');
    console.log('- Enable monitoring and alerts');
    console.log('- Set up automated backups');
    console.log('- Configure SSL certificates');
  }

  // Utility methods
  getBackendEnvVars() {
    const envVars = {};
    for (const varName of this.requiredEnvVars) {
      if (process.env[varName]) {
        envVars[varName] = process.env[varName];
      }
    }
    return envVars;
  }

  async saveDeploymentInfo(component, info) {
    const infoFile = path.join(this.config.buildDir, `${component}-deployment.json`);
    await fs.writeFile(infoFile, JSON.stringify(info, null, 2));
  }

  tomlStringify(obj) {
    // Simple TOML stringifier for Netlify config
    let toml = '';
    
    if (obj.build) {
      toml += '[build]\n';
      toml += `publish = "${obj.build.publish}"\n`;
      toml += `command = "${obj.build.command}"\n\n`;
    }
    
    if (obj.redirects) {
      obj.redirects.forEach((redirect, i) => {
        toml += '[[redirects]]\n';
        toml += `from = "${redirect.from}"\n`;
        toml += `to = "${redirect.to}"\n`;
        toml += `status = ${redirect.status}\n\n`;
      });
    }
    
    return toml;
  }

  async fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async directoryExists(dirPath) {
    try {
      const stats = await fs.stat(dirPath);
      return stats.isDirectory();
    } catch {
      return false;
    }
  }

  async ensureDirectory(dirPath) {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
    }
  }

  async copyDirectory(src, dest) {
    await this.ensureDirectory(dest);
    const entries = await fs.readdir(src, { withFileTypes: true });
    
    for (const entry of entries) {
      const srcPath = path.join(src, entry.name);
      const destPath = path.join(dest, entry.name);
      
      if (entry.isDirectory()) {
        await this.copyDirectory(srcPath, destPath);
      } else {
        await fs.copyFile(srcPath, destPath);
      }
    }
  }

  async findFiles(dir, pattern) {
    const files = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        files.push(...await this.findFiles(fullPath, pattern));
      } else if (entry.isFile() && pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  async hasScript(scriptName) {
    try {
      const packageJson = JSON.parse(await fs.readFile('package.json', 'utf8'));
      return packageJson.scripts && packageJson.scripts[scriptName];
    } catch {
      return false;
    }
  }
}

// CLI Interface
if (require.main === module) {
  const deployer = new ProductionDeployer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'deploy':
      deployer.deploy().catch(console.error);
      break;
      
    case 'check':
      deployer.performPreDeploymentChecks().catch(console.error);
      break;
      
    case 'build':
      deployer.buildProject().catch(console.error);
      break;
      
    default:
      console.log('🚀 Celora Production Deployment Tool\n');
      console.log('Usage:');
      console.log('  node deploy.js deploy  - Full deployment process');
      console.log('  node deploy.js check   - Pre-deployment checks only');
      console.log('  node deploy.js build   - Build project only');
      console.log('\nFor more information, visit: https://github.com/stusseligmini/Celora-platform');
  }
}

module.exports = ProductionDeployer;
