#!/usr/bin/env node

/**
 * OpenAI Codex Automation Script for Kendrick Forrest Client Portal
 * This script uses OpenAI's GPT-4 (Codex) to automate development tasks
 */

import OpenAI from 'openai';
import fs from 'fs-extra';
import path from 'path';
import inquirer from 'inquirer';
import chalk from 'chalk';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

class CodexDeveloper {
  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
    
    this.projectContext = {
      name: "Kendrick Forrest Client Portal",
      description: "Minimalist portfolio transformation to client portal with invoicing",
      stack: ["HTML", "CSS", "JavaScript", "Node.js", "Express", "SQLite"],
      designPrinciples: [
        "Minimalism", "Purpose-driven", "Exposure", "Future-focused",
        "Balance", "Action-oriented", "Resourcefulness", "Continuous improvement",
        "Collaboration"
      ],
      aesthetic: {
        background: "#F9F6F1", // Bone white
        textColor: "#333",
        font: "Montserrat",
        style: "Clean, minimal with square bracket typography [Section]"
      }
    };
  }

  async initialize() {
    console.log(chalk.blue.bold('\n🤖 OpenAI Codex Developer Initialized'));
    console.log(chalk.gray('Ready to automate your client portal development\n'));
    
    if (!process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
      console.log(chalk.red('⚠️  Please set your OpenAI API key in .env file'));
      console.log(chalk.yellow('OPENAI_API_KEY=your_actual_api_key_here'));
      return;
    }
    
    await this.showMainMenu();
  }

  async showMainMenu() {
    const choices = [
      '🏗️  Phase 1: Transform Landing Page',
      '🔐 Phase 2: Build Authentication System', 
      '📊 Phase 3: Create Client Portal Dashboard',
      '💰 Phase 4: Implement Invoice System',
      '🎨 Phase 5: Add Design Polish & Animations',
      '🧪 Generate Tests for Current Code',
      '📝 Generate Documentation',
      '🔍 Code Review & Optimization',
      '🚀 Deploy & Production Setup',
      '❓ Custom Development Task',
      '🔧 Project Analysis',
      '❌ Exit'
    ];

    const { action } = await inquirer.prompt([{
      type: 'list',
      name: 'action',
      message: 'What would you like Codex to build?',
      choices
    }]);

    await this.handleMenuChoice(action);
  }

  async handleMenuChoice(choice) {
    switch (choice) {
      case '🏗️  Phase 1: Transform Landing Page':
        await this.transformLandingPage();
        break;
      case '🔐 Phase 2: Build Authentication System':
        await this.buildAuthSystem();
        break;
      case '📊 Phase 3: Create Client Portal Dashboard':
        await this.createClientPortal();
        break;
      case '💰 Phase 4: Implement Invoice System':
        await this.implementInvoiceSystem();
        break;
      case '🎨 Phase 5: Add Design Polish & Animations':
        await this.addDesignPolish();
        break;
      case '🧪 Generate Tests for Current Code':
        await this.generateTests();
        break;
      case '📝 Generate Documentation':
        await this.generateDocumentation();
        break;
      case '🔍 Code Review & Optimization':
        await this.reviewAndOptimize();
        break;
      case '🚀 Deploy & Production Setup':
        await this.setupDeployment();
        break;
      case '❓ Custom Development Task':
        await this.customTask();
        break;
      case '🔧 Project Analysis':
        await this.analyzeProject();
        break;
      default:
        console.log(chalk.green('Goodbye! 👋'));
        process.exit(0);
    }
  }

  async generateCodeWithCodex(prompt, context = '') {
    try {
      console.log(chalk.yellow('🧠 Codex is thinking...'));
      
      const fullPrompt = `
You are an expert full-stack developer working on Kendrick Forrest's client portal project.

PROJECT CONTEXT:
${JSON.stringify(this.projectContext, null, 2)}

CURRENT FILES CONTEXT:
${context}

TASK:
${prompt}

REQUIREMENTS:
- Maintain the minimalist aesthetic with bone white background (#F9F6F1)
- Use Montserrat font (300 for body, 700 for headings)
- Keep the square bracket typography style [Section Title]
- Ensure mobile responsiveness
- Follow modern security practices
- Write clean, commented code
- Preserve the existing design principles

Provide complete, production-ready code with explanations.
`;

      const completion = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system", 
            content: "You are a senior full-stack developer specializing in clean, minimalist web applications. You write production-ready code with proper error handling, security considerations, and follow best practices."
          },
          {
            role: "user",
            content: fullPrompt
          }
        ],
        max_tokens: 4000,
        temperature: 0.1
      });

      return completion.choices[0].message.content;
    } catch (error) {
      console.error(chalk.red('Error generating code:', error.message));
      return null;
    }
  }

  async transformLandingPage() {
    console.log(chalk.blue.bold('\n🏗️  Transforming Landing Page with Codex...'));
    
    // Read current files
    const currentHTML = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
    const currentCSS = await fs.readFile(path.join(__dirname, 'styles.css'), 'utf8');
    const currentJS = await fs.readFile(path.join(__dirname, 'script.js'), 'utf8');
    
    const context = `
CURRENT HTML:
${currentHTML}

CURRENT CSS:
${currentCSS}

CURRENT JS:
${currentJS}
`;

    const prompt = `
Transform the current portfolio website into a landing page for the client portal system.

Changes needed:
1. Update hero section to introduce the new purpose
2. Add two primary CTAs: "Start a Project" and "Client Login"
3. Add a minimal inquiry form section
4. Keep the minimalist aesthetic but make it more professional
5. Ensure the design flows toward client onboarding
6. Add subtle animations and hover effects
7. Optimize for both new clients and existing client access

Generate the updated HTML, CSS, and JavaScript files.
`;

    const code = await this.generateCodeWithCodex(prompt, context);
    
    if (code) {
      console.log(chalk.green('\n✅ Landing page transformation complete!'));
      console.log(chalk.gray('Files have been generated. Review and apply the changes.'));
      
      // Save the generated code to a new file for review
      await fs.writeFile(path.join(__dirname, 'codex_landing_page.md'), code);
      console.log(chalk.blue('📁 Generated code saved to: codex_landing_page.md'));
    }
    
    await this.showMainMenu();
  }

  async buildAuthSystem() {
    console.log(chalk.blue.bold('\n🔐 Building Authentication System with Codex...'));
    
    const prompt = `
Create a complete authentication system for the client portal.

Components needed:
1. Backend API with Express.js
2. User model with SQLite database
3. JWT token management
4. Login/logout endpoints
5. Password hashing with bcrypt
6. Middleware for protected routes
7. Role-based access (admin/client)
8. Password reset functionality
9. Session management
10. Security best practices

Generate all necessary files:
- server.js (main server file)
- models/User.js (user model)
- routes/auth.js (authentication routes)
- middleware/auth.js (authentication middleware)
- database/init.sql (database schema)
- package.json updates
`;

    const code = await this.generateCodeWithCodex(prompt);
    
    if (code) {
      console.log(chalk.green('\n✅ Authentication system generated!'));
      await fs.writeFile(path.join(__dirname, 'codex_auth_system.md'), code);
      console.log(chalk.blue('📁 Generated code saved to: codex_auth_system.md'));
    }
    
    await this.showMainMenu();
  }

  async createClientPortal() {
    console.log(chalk.blue.bold('\n📊 Creating Client Portal Dashboard with Codex...'));
    
    const prompt = `
Create a complete client portal dashboard system.

Components needed:
1. Client dashboard HTML page
2. Dashboard CSS with minimalist styling
3. Dashboard JavaScript for interactivity
4. File management system (upload/download)
5. Project status tracking
6. Messaging system between client and admin
7. Progress indicators and timelines
8. Mobile-responsive design
9. Navigation between portal sections
10. Real-time updates (if possible)

Features:
- Welcome message with client name
- Recent activity feed
- Project files section
- Communication area
- Invoice/billing section
- Account settings
- Logout functionality

Generate all portal files maintaining the minimalist aesthetic.
`;

    const code = await this.generateCodeWithCodex(prompt);
    
    if (code) {
      console.log(chalk.green('\n✅ Client portal dashboard generated!'));
      await fs.writeFile(path.join(__dirname, 'codex_client_portal.md'), code);
      console.log(chalk.blue('📁 Generated code saved to: codex_client_portal.md'));
    }
    
    await this.showMainMenu();
  }

  async implementInvoiceSystem() {
    console.log(chalk.blue.bold('\n💰 Implementing Invoice System with Codex...'));
    
    const prompt = `
Create a complete invoice management system.

Components needed:
1. Invoice model and database schema
2. Admin interface for creating invoices
3. Invoice display page (client view)
4. PDF generation using Puppeteer
5. Stripe payment integration
6. Payment status tracking
7. Email notifications
8. Invoice templates with branded design
9. Line item management
10. Tax calculations

Features:
- Create/edit/delete invoices (admin)
- View invoices (client)
- Online payment processing
- PDF download functionality
- Payment history
- Automated reminders
- Professional invoice design matching the minimal aesthetic

Generate all invoice-related files and integration code.
`;

    const code = await this.generateCodeWithCodex(prompt);
    
    if (code) {
      console.log(chalk.green('\n✅ Invoice system generated!'));
      await fs.writeFile(path.join(__dirname, 'codex_invoice_system.md'), code);
      console.log(chalk.blue('📁 Generated code saved to: codex_invoice_system.md'));
    }
    
    await this.showMainMenu();
  }

  async addDesignPolish() {
    console.log(chalk.blue.bold('\n🎨 Adding Design Polish & Animations with Codex...'));
    
    const prompt = `
Add design polish and subtle animations to enhance the user experience.

Enhancements needed:
1. Smooth transitions and hover effects
2. Loading animations and states
3. Micro-interactions for buttons and forms
4. Subtle background animations (optional)
5. Improved typography hierarchy
6. Enhanced mobile experience
7. Accessibility improvements
8. Brand consistency elements
9. Interactive feedback
10. Performance optimizations

Maintain the minimalist aesthetic while adding "cool" professional touches.
Focus on user experience improvements that align with the design principles.
`;

    const code = await this.generateCodeWithCodex(prompt);
    
    if (code) {
      console.log(chalk.green('\n✅ Design polish generated!'));
      await fs.writeFile(path.join(__dirname, 'codex_design_polish.md'), code);
      console.log(chalk.blue('📁 Generated code saved to: codex_design_polish.md'));
    }
    
    await this.showMainMenu();
  }

  async generateTests() {
    console.log(chalk.blue.bold('\n🧪 Generating Tests with Codex...'));
    
    // Read current codebase
    const files = await this.readProjectFiles();
    
    const prompt = `
Generate comprehensive tests for the current codebase.

Test types needed:
1. Unit tests for all functions
2. Integration tests for API endpoints
3. Authentication flow tests
4. Database operation tests
5. Frontend interaction tests
6. Security vulnerability tests
7. Performance tests
8. Cross-browser compatibility tests

Generate test files using Jest/Mocha and appropriate testing libraries.
Include setup and teardown procedures.
`;

    const code = await this.generateCodeWithCodex(prompt, files);
    
    if (code) {
      console.log(chalk.green('\n✅ Test suite generated!'));
      await fs.writeFile(path.join(__dirname, 'codex_tests.md'), code);
      console.log(chalk.blue('📁 Generated tests saved to: codex_tests.md'));
    }
    
    await this.showMainMenu();
  }

  async generateDocumentation() {
    console.log(chalk.blue.bold('\n📝 Generating Documentation with Codex...'));
    
    const files = await this.readProjectFiles();
    
    const prompt = `
Generate comprehensive documentation for the project.

Documentation needed:
1. README.md with setup instructions
2. API documentation
3. Database schema documentation
4. Deployment guide
5. User manual for clients
6. Admin guide
7. Troubleshooting guide
8. Code comments and inline documentation
9. Architecture overview
10. Security considerations

Make the documentation clear and professional.
`;

    const code = await this.generateCodeWithCodex(prompt, files);
    
    if (code) {
      console.log(chalk.green('\n✅ Documentation generated!'));
      await fs.writeFile(path.join(__dirname, 'codex_documentation.md'), code);
      console.log(chalk.blue('📁 Generated documentation saved to: codex_documentation.md'));
    }
    
    await this.showMainMenu();
  }

  async customTask() {
    const { task } = await inquirer.prompt([{
      type: 'input',
      name: 'task',
      message: 'Describe what you want Codex to build:'
    }]);

    console.log(chalk.blue.bold(`\n🛠️  Custom Task: ${task}`));
    
    const files = await this.readProjectFiles();
    const code = await this.generateCodeWithCodex(task, files);
    
    if (code) {
      console.log(chalk.green('\n✅ Custom task completed!'));
      const filename = `codex_custom_${Date.now()}.md`;
      await fs.writeFile(path.join(__dirname, filename), code);
      console.log(chalk.blue(`📁 Generated code saved to: ${filename}`));
    }
    
    await this.showMainMenu();
  }

  async analyzeProject() {
    console.log(chalk.blue.bold('\n🔧 Analyzing Project with Codex...'));
    
    const files = await this.readProjectFiles();
    
    const prompt = `
Analyze the current project and provide:

1. Code quality assessment
2. Architecture recommendations
3. Security analysis
4. Performance optimization suggestions
5. Best practices review
6. Missing features identification
7. Technical debt assessment
8. Scalability considerations
9. Deployment readiness
10. Next steps recommendations

Provide actionable insights and prioritized recommendations.
`;

    const analysis = await this.generateCodeWithCodex(prompt, files);
    
    if (analysis) {
      console.log(chalk.green('\n✅ Project analysis complete!'));
      await fs.writeFile(path.join(__dirname, 'codex_project_analysis.md'), analysis);
      console.log(chalk.blue('📁 Analysis saved to: codex_project_analysis.md'));
    }
    
    await this.showMainMenu();
  }

  async readProjectFiles() {
    const files = {};
    try {
      files.html = await fs.readFile(path.join(__dirname, 'index.html'), 'utf8');
      files.css = await fs.readFile(path.join(__dirname, 'styles.css'), 'utf8');
      files.js = await fs.readFile(path.join(__dirname, 'script.js'), 'utf8');
      files.package = await fs.readFile(path.join(__dirname, 'package.json'), 'utf8');
      files.gitignore = await fs.readFile(path.join(__dirname, '.gitignore'), 'utf8');
      
      // Check for additional files
      const additionalFiles = ['server.js', 'routes', 'models', 'middleware'];
      for (const file of additionalFiles) {
        try {
          files[file] = await fs.readFile(path.join(__dirname, file), 'utf8');
        } catch (e) {
          // File doesn't exist, skip
        }
      }
    } catch (error) {
      console.log(chalk.yellow('⚠️  Some files could not be read'));
    }
    
    return JSON.stringify(files, null, 2);
  }
}

// Initialize and run the Codex Developer
const codexDev = new CodexDeveloper();
codexDev.initialize().catch(console.error);
