/**
 * Helper script to get Google Cloud Access Token
 * 
 * Usage:
 *   node utils/getGoogleToken.js
 * 
 * This will print the access token that you can use in GOOGLE_CLOUD_ACCESS_TOKEN
 */

const { exec } = require('child_process');
const util = require('util');
const execPromise = util.promisify(exec);

async function getAccessToken() {
    try {
        console.log('Getting Google Cloud access token...\n');

        // Try to get token using gcloud CLI
        const { stdout } = await execPromise('gcloud auth print-access-token');
        const token = stdout.trim();

        console.log('✅ Access token retrieved successfully!\n');
        console.log('Copy this token to your .env file:');
        console.log('─────────────────────────────────────────────────────────');
        console.log(`GOOGLE_CLOUD_ACCESS_TOKEN=${token}`);
        console.log('─────────────────────────────────────────────────────────\n');
        console.log('⚠️  Note: This token will expire in 1 hour.');
        console.log('   For production, use Service Account instead.\n');

        return token;
    } catch (error) {
        console.error('❌ Error getting access token:', error.message);
        console.error('\nPlease ensure:');
        console.error('1. Google Cloud SDK (gcloud) is installed');
        console.error('2. You are logged in: gcloud auth login');
        console.error('3. Project is set: gcloud config set project YOUR_PROJECT_ID\n');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    getAccessToken();
}

module.exports = getAccessToken;

