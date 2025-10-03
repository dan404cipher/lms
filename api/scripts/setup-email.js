#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setupEmail() {
  console.log('📧 LMS Email Setup Wizard');
  console.log('========================\n');

  console.log('Choose your email provider:');
  console.log('1. Gmail (Recommended for beginners)');
  console.log('2. SendGrid (Recommended for production)');
  console.log('3. AWS SES (For high volume)');
  console.log('4. Custom SMTP\n');

  const choice = await question('Enter your choice (1-4): ');

  let config = {};

  switch (choice) {
    case '1':
      config = await setupGmail();
      break;
    case '2':
      config = await setupSendGrid();
      break;
    case '3':
      config = await setupAWSSES();
      break;
    case '4':
      config = await setupCustomSMTP();
      break;
    default:
      console.log('❌ Invalid choice. Exiting...');
      process.exit(1);
  }

  // Update .env file
  await updateEnvFile(config);

  console.log('\n✅ Email configuration updated!');
  console.log('\nNext steps:');
  console.log('1. Test your configuration: npm run test:email your-email@example.com');
  console.log('2. Check the EMAIL_SETUP_GUIDE.md for detailed instructions');
  console.log('3. Restart your server to apply changes');

  rl.close();
}

async function setupGmail() {
  console.log('\n📮 Gmail Setup');
  console.log('=============\n');

  console.log('Before proceeding, make sure you have:');
  console.log('1. Enabled 2-Factor Authentication on your Google account');
  console.log('2. Generated an App Password for "LMS Platform"');
  console.log('3. The 16-character App Password ready\n');

  const email = await question('Enter your Gmail address: ');
  const appPassword = await question('Enter your 16-character App Password: ');
  const fromName = await question('Enter sender name (default: LMS Platform): ') || 'LMS Platform';

  return {
    SMTP_HOST: 'smtp.gmail.com',
    SMTP_PORT: '587',
    SMTP_USER: email,
    SMTP_PASS: appPassword,
    SMTP_FROM_NAME: fromName
  };
}

async function setupSendGrid() {
  console.log('\n🚀 SendGrid Setup');
  console.log('================\n');

  console.log('Before proceeding, make sure you have:');
  console.log('1. Created a SendGrid account');
  console.log('2. Generated an API key with "Mail Send" permissions');
  console.log('3. Verified your sender identity\n');

  const apiKey = await question('Enter your SendGrid API key: ');
  const fromName = await question('Enter sender name (default: LMS Platform): ') || 'LMS Platform';

  return {
    SMTP_HOST: 'smtp.sendgrid.net',
    SMTP_PORT: '587',
    SMTP_USER: 'apikey',
    SMTP_PASS: apiKey,
    SMTP_FROM_NAME: fromName
  };
}

async function setupAWSSES() {
  console.log('\n☁️ AWS SES Setup');
  console.log('================\n');

  console.log('Before proceeding, make sure you have:');
  console.log('1. Set up AWS SES');
  console.log('2. Created SMTP credentials');
  console.log('3. Verified your email address or domain\n');

  const region = await question('Enter your AWS region (e.g., us-east-1): ');
  const smtpUsername = await question('Enter your SES SMTP username: ');
  const smtpPassword = await question('Enter your SES SMTP password: ');
  const fromName = await question('Enter sender name (default: LMS Platform): ') || 'LMS Platform';

  return {
    SMTP_HOST: `email-smtp.${region}.amazonaws.com`,
    SMTP_PORT: '587',
    SMTP_USER: smtpUsername,
    SMTP_PASS: smtpPassword,
    SMTP_FROM_NAME: fromName
  };
}

async function setupCustomSMTP() {
  console.log('\n🔧 Custom SMTP Setup');
  console.log('===================\n');

  const host = await question('Enter SMTP host: ');
  const port = await question('Enter SMTP port (default: 587): ') || '587';
  const user = await question('Enter SMTP username: ');
  const pass = await question('Enter SMTP password: ');
  const fromName = await question('Enter sender name (default: LMS Platform): ') || 'LMS Platform';

  return {
    SMTP_HOST: host,
    SMTP_PORT: port,
    SMTP_USER: user,
    SMTP_PASS: pass,
    SMTP_FROM_NAME: fromName
  };
}

async function updateEnvFile(config) {
  const envPath = path.join(__dirname, '..', '.env');
  
  try {
    let envContent = fs.readFileSync(envPath, 'utf8');
    
    // Update or add email configuration
    const emailConfig = [
      `# Email Configuration (SMTP)`,
      `SMTP_HOST=${config.SMTP_HOST}`,
      `SMTP_PORT=${config.SMTP_PORT}`,
      `SMTP_USER=${config.SMTP_USER}`,
      `SMTP_PASS=${config.SMTP_PASS}`,
      `SMTP_FROM_NAME=${config.SMTP_FROM_NAME}`,
      ''
    ].join('\n');

    // Remove existing email configuration
    envContent = envContent.replace(/# Email Configuration \(SMTP\).*?(?=\n#|\n$)/gs, '');
    
    // Add new email configuration
    envContent = envContent.replace(/(# AWS S3 Configuration.*?\n)/, `$1\n${emailConfig}`);

    fs.writeFileSync(envPath, envContent);
    console.log('\n📝 .env file updated successfully!');
  } catch (error) {
    console.error('❌ Failed to update .env file:', error.message);
    console.log('\nPlease manually update your .env file with these settings:');
    Object.entries(config).forEach(([key, value]) => {
      console.log(`${key}=${value}`);
    });
  }
}

// Run the setup
setupEmail().catch(console.error);
