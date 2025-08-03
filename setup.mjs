#!/usr/bin/env node

/**
 * Setup script for OpenAI Codex Developer
 */

import inquirer from 'inquirer';
import fs from 'fs-extra';
import chalk from 'chalk';

console.log(chalk.blue.bold('\n🚀 OpenAI Codex Developer Setup'));
console.log(chalk.gray('Setting up your automated development environment...\n'));

const { apiKey } = await inquirer.prompt([{
  type: 'password',
  name: 'apiKey',
  message: 'Enter your OpenAI API key:',
  mask: '*'
}]);

// Update .env file
let envContent = await fs.readFile('.env', 'utf8');
envContent = envContent.replace('your_openai_api_key_here', apiKey);
await fs.writeFile('.env', envContent);

console.log(chalk.green('\n✅ Setup complete!'));
console.log(chalk.blue('🎯 Run: npm run codex'));
console.log(chalk.gray('This will start the Codex Developer interface\n'));
