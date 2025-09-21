/**
 * Environment Variables Validator
 * Ensures all required environment variables are set before starting the server
 */

const requiredVars = {
    // Database
    'NETLIFY_DATABASE_URL': 'Database connection URL is required',
    'DATABASE_URL': 'Main database URL is required',
    
    // Security
    'JWT_SECRET': 'JWT secret key is required for authentication',
    'REFRESH_TOKEN_SECRET': 'Refresh token secret is required',
    
    // API Configuration
    'NODE_ENV': 'Node environment must be set (development/production)',
    
    // Optional but recommended
    'SENDGRID_API_KEY': 'Email service API key (optional but recommended)',
    'SENTRY_DSN': 'Error tracking DSN (optional but recommended)',
    'DISCORD_WEBHOOK_URL': 'Discord webhook for alerts (optional)'
};

const warningVars = [
    'SENDGRID_API_KEY',
    'SENTRY_DSN', 
    'DISCORD_WEBHOOK_URL'
];

function validateEnvironment() {
    const missing = [];
    const warnings = [];
    
    // Check required variables
    Object.entries(requiredVars).forEach(([key, description]) => {
        if (!process.env[key]) {
            if (warningVars.includes(key)) {
                warnings.push(`WARNING: ${key}: ${description}`);
            } else {
                missing.push(`ERROR: ${key}: ${description}`);
            }
        }
    });
    
    // Check for insecure values
    const insecureValues = {
        'JWT_SECRET': ['test', 'secret', 'development', 'change_me'],
        'SENDGRID_API_KEY': ['SG.test_key_for_now', 'test_key'],
        'NODE_ENV': ['development']
    };
    
    Object.entries(insecureValues).forEach(([key, badValues]) => {
        const value = process.env[key];
        if (value && badValues.some(bad => value.includes(bad))) {
            warnings.push(`WARNING: ${key}: Using insecure/test value in production`);
        }
    });
    
    // Report results
    if (missing.length > 0) {
        console.error('CRITICAL: Missing required environment variables:');
        missing.forEach(msg => console.error(`  ${msg}`));
        console.error('\nSet these variables in your environment.');
        process.exit(1);
    }
    
    if (warnings.length > 0) {
        console.warn('Environment warnings (recommended to fix):');
        warnings.forEach(msg => console.warn(`  ${msg}`));
        console.warn('');
    }
    
    // Show production readiness
    const isProduction = process.env.NODE_ENV === 'production';
    const hasEmail = process.env.SENDGRID_API_KEY && !process.env.SENDGRID_API_KEY.includes('test');
    const hasMonitoring = process.env.SENTRY_DSN;
    const hasAlerts = process.env.DISCORD_WEBHOOK_URL;
    
    console.log('Environment Status:');
    console.log(`  Production Mode: ${isProduction ? 'OK' : 'Development'}`);
    console.log(`  Email Service: ${hasEmail ? 'OK' : 'Not configured'}`);
    console.log(`  Error Monitoring: ${hasMonitoring ? 'OK' : 'Not configured'}`);
    console.log(`  Discord Alerts: ${hasAlerts ? 'OK' : 'Not configured'}`);
    
    if (isProduction && (!hasEmail || !hasMonitoring)) {
        console.warn('Production deployment detected but some services are not configured.');
        console.warn('Users may not be able to verify accounts or reset passwords.');
    }
    
    return {
        isValid: missing.length === 0,
        hasWarnings: warnings.length > 0,
        isProduction,
        services: {
            email: hasEmail,
            monitoring: hasMonitoring,
            alerts: hasAlerts
        }
    };
}

module.exports = { validateEnvironment };
