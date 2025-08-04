/**
 * Document Generator Utility
 * Handles document generation using Handlebars templates
 */

import Handlebars from 'handlebars';
import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import db from '../config/database.js';
import { BRAND } from '../config/brand.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DocumentGenerator {
  constructor() {
    this.templateCache = new Map();
    this.helpers = new Map();
    this.partials = new Map();
    
    // Register default Handlebars helpers
    this.registerDefaultHelpers();
    
    // Load default partials
    this.loadDefaultPartials();
  }

  /**
   * Register default Handlebars helpers
   */
  registerDefaultHelpers() {
    // Date formatting helper
    Handlebars.registerHelper('formatDate', (date, format) => {
      if (!date) return '';
      const d = new Date(date);
      
      switch (format) {
        case 'short':
          return d.toLocaleDateString();
        case 'long':
          return d.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
        case 'time':
          return d.toLocaleTimeString();
        default:
          return d.toLocaleString();
      }
    });

    // Currency formatting helper
    Handlebars.registerHelper('formatCurrency', (amount) => {
      if (typeof amount !== 'number') return '$0.00';
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(amount);
    });

    // Conditional helpers
    Handlebars.registerHelper('eq', (a, b) => a === b);
    Handlebars.registerHelper('ne', (a, b) => a !== b);
    Handlebars.registerHelper('lt', (a, b) => a < b);
    Handlebars.registerHelper('gt', (a, b) => a > b);
    Handlebars.registerHelper('lte', (a, b) => a <= b);
    Handlebars.registerHelper('gte', (a, b) => a >= b);

    // Array/Object helpers
    Handlebars.registerHelper('length', (arr) => {
      if (Array.isArray(arr)) return arr.length;
      if (typeof arr === 'object' && arr !== null) return Object.keys(arr).length;
      return 0;
    });

    // String helpers
    Handlebars.registerHelper('uppercase', (str) => String(str).toUpperCase());
    Handlebars.registerHelper('lowercase', (str) => String(str).toLowerCase());
    Handlebars.registerHelper('capitalize', (str) => {
      const s = String(str);
      return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
    });

    // Phase status helper
    Handlebars.registerHelper('phaseStatus', (phase) => {
      if (phase.is_completed) return 'completed';
      if (phase.is_current) return 'active';
      return 'pending';
    });

    // Service type name helper
    Handlebars.registerHelper('serviceName', async (serviceCode) => {
      const result = await db.query(
        'SELECT display_name FROM service_types WHERE code = $1',
        [serviceCode]
      );
      return result.rows[0]?.display_name || serviceCode;
    });
    
    // Math helpers
    Handlebars.registerHelper('add', (a, b) => Number(a) + Number(b));
    Handlebars.registerHelper('subtract', (a, b) => Number(a) - Number(b));
    Handlebars.registerHelper('multiply', (a, b) => Number(a) * Number(b));
    Handlebars.registerHelper('divide', (a, b) => Number(a) / Number(b));
  }

  /**
   * Load default partials from the templates directory
   */
  async loadDefaultPartials() {
    try {
      const partialsDir = path.join(__dirname, '../templates/partials');
      const files = await fs.readdir(partialsDir);
      
      for (const file of files) {
        if (file.endsWith('.hbs') || file.endsWith('.handlebars')) {
          const name = file.replace(/\.(hbs|handlebars)$/, '');
          const content = await fs.readFile(path.join(partialsDir, file), 'utf8');
          Handlebars.registerPartial(name, content);
          this.partials.set(name, content);
        }
      }
    } catch (error) {
      console.log('No default partials directory found, skipping...');
    }
  }

  /**
   * Get or compile a template
   */
  async getTemplate(templateId) {
    // Check cache first
    if (this.templateCache.has(templateId)) {
      return this.templateCache.get(templateId);
    }

    // Load from database
    const result = await db.query(
      `SELECT * FROM document_modules WHERE module_id = $1 AND is_active = true`,
      [templateId]
    );

    if (result.rows.length === 0) {
      throw new Error(`Template not found: ${templateId}`);
    }

    const template = result.rows[0];
    const compiled = Handlebars.compile(template.template);
    
    // Cache the compiled template
    this.templateCache.set(templateId, {
      compiled,
      metadata: template
    });

    return { compiled, metadata: template };
  }

  /**
   * Generate HTML document from template and data
   */
  async generateHTML(templateId, data) {
    try {
      const { compiled, metadata } = await this.getTemplate(templateId);
      
      // Merge brand colors and project data
      const context = {
        ...data,
        brand: BRAND,
        generated_at: new Date(),
        template_version: metadata.version
      };

      // Generate HTML
      const html = compiled(context);
      
      // Wrap in document template if not already wrapped
      if (!html.includes('<!DOCTYPE html>')) {
        return this.wrapInDocumentTemplate(html, metadata.name);
      }

      return html;
    } catch (error) {
      console.error('Error generating HTML:', error);
      throw error;
    }
  }

  /**
   * Wrap content in a full HTML document template
   */
  wrapInDocumentTemplate(content, title) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} - [RE]Print Studios</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap');
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Montserrat', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      color: ${BRAND.colors.charcoal};
      background-color: ${BRAND.colors.boneWhite};
    }
    
    .document-container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
      background-color: ${BRAND.colors.white};
      box-shadow: 0 0 20px rgba(0, 0, 0, 0.1);
    }
    
    h1, h2, h3, h4, h5, h6 {
      font-weight: 600;
      margin-bottom: 1rem;
      color: ${BRAND.colors.charcoal};
    }
    
    h1 { font-size: 2.5rem; }
    h2 { font-size: 2rem; }
    h3 { font-size: 1.5rem; }
    
    p {
      margin-bottom: 1rem;
    }
    
    .header {
      border-bottom: 2px solid ${BRAND.colors.blue};
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    
    .logo {
      font-size: 24px;
      font-weight: 700;
      color: ${BRAND.colors.blue};
    }
    
    .section {
      margin-bottom: 30px;
    }
    
    .highlight {
      background-color: ${BRAND.colors.yellow};
      padding: 2px 4px;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #E0E0E0;
    }
    
    th {
      font-weight: 600;
      background-color: ${BRAND.colors.boneWhite};
    }
    
    .footer {
      margin-top: 50px;
      padding-top: 20px;
      border-top: 1px solid #E0E0E0;
      font-size: 14px;
      color: ${BRAND.colors.graphite};
      text-align: center;
    }
    
    @media print {
      body {
        background-color: white;
      }
      
      .document-container {
        box-shadow: none;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="document-container">
    ${content}
  </div>
</body>
</html>`;
  }

  /**
   * Generate PDF from HTML
   */
  async generatePDF(templateId, data) {
    let browser = null;
    
    try {
      const html = await this.generateHTML(templateId, data);
      
      // Launch puppeteer
      browser = await puppeteer.launch({
        headless: 'new',
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      });
      
      const page = await browser.newPage();
      
      // Set the HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0'
      });
      
      // Generate PDF with proper settings
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '1in',
          right: '1in',
          bottom: '1in',
          left: '1in'
        },
        displayHeaderFooter: false,
        preferCSSPageSize: false
      });
      
      return {
        buffer: pdfBuffer,
        contentType: 'application/pdf'
      };
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    } finally {
      if (browser) {
        await browser.close();
      }
    }
  }

  /**
   * Get applicable document templates for a project
   */
  async getProjectDocuments(projectId) {
    const result = await db.query(`
      SELECT 
        p.*,
        array_agg(DISTINCT s.code) as service_codes,
        pp.phase_key as current_phase
      FROM projects p
      LEFT JOIN unnest(p.services) as s(code) ON true
      LEFT JOIN project_phase_tracking pt ON pt.project_id = p.id AND pt.is_completed = false
      LEFT JOIN project_phases pp ON pt.current_phase_id = pp.id
      WHERE p.id = $1
      GROUP BY p.id, pp.phase_key
    `, [projectId]);

    if (result.rows.length === 0) {
      throw new Error('Project not found');
    }

    const project = result.rows[0];
    
    // Get applicable document templates
    const templates = await db.query(`
      SELECT * FROM document_modules 
      WHERE is_active = true
        AND (service_filters IS NULL OR service_filters && $1)
        AND (phase_filters IS NULL OR $2 = ANY(phase_filters))
      ORDER BY sort_order, name
    `, [project.service_codes, project.current_phase]);

    return templates.rows;
  }

  /**
   * Generate all documents for a project phase
   */
  async generatePhaseDocuments(projectId, phaseKey) {
    const documents = [];
    
    // Get project data
    const projectData = await this.getProjectData(projectId);
    
    // Get applicable templates
    const templates = await db.query(`
      SELECT * FROM document_modules 
      WHERE is_active = true
        AND (phase_filters IS NULL OR $1 = ANY(phase_filters))
        AND (service_filters IS NULL OR service_filters && $2)
      ORDER BY sort_order
    `, [phaseKey, projectData.services]);

    // Generate each document
    for (const template of templates.rows) {
      try {
        const html = await this.generateHTML(template.module_id, projectData);
        documents.push({
          template_id: template.module_id,
          name: template.name,
          type: template.template_type,
          html,
          generated_at: new Date()
        });
      } catch (error) {
        console.error(`Error generating document ${template.module_id}:`, error);
      }
    }

    return documents;
  }

  /**
   * Get comprehensive project data for document generation
   */
  async getProjectData(projectId) {
    // Get project details
    const projectResult = await db.query(`
      SELECT 
        p.*,
        u.first_name as client_first_name,
        u.last_name as client_last_name,
        u.email as client_email,
        u.phone as client_phone,
        u.company as client_company
      FROM projects p
      JOIN users u ON p.client_id = u.id
      WHERE p.id = $1
    `, [projectId]);

    if (projectResult.rows.length === 0) {
      throw new Error('Project not found');
    }

    const project = projectResult.rows[0];

    // Get project phases
    const phasesResult = await db.query(`
      SELECT 
        pp.*,
        pt.phase_started_at,
        pt.phase_completed_at,
        pt.is_completed,
        pt.is_completed as is_current
      FROM project_phases pp
      LEFT JOIN project_phase_tracking pt ON pt.current_phase_id = pp.id AND pt.project_id = $1
      WHERE pp.project_id = $1
      ORDER BY pp.sort_order
    `, [projectId]);

    // Get form data
    const formDataResult = await db.query(`
      SELECT * FROM forms_data 
      WHERE project_id = $1 
      ORDER BY created_at DESC
    `, [projectId]);

    // Get files
    const filesResult = await db.query(`
      SELECT * FROM files 
      WHERE project_id = $1 
      ORDER BY created_at DESC
    `, [projectId]);

    // Get invoices
    const invoicesResult = await db.query(`
      SELECT * FROM invoices 
      WHERE project_id = $1 
      ORDER BY created_at DESC
    `, [projectId]);

    // Compile all data
    return {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        services: project.services,
        status: project.status,
        created_at: project.created_at,
        total_budget: project.total_budget,
        paid_amount: project.paid_amount
      },
      client: {
        id: project.client_id,
        name: `${project.client_first_name} ${project.client_last_name}`,
        first_name: project.client_first_name,
        last_name: project.client_last_name,
        email: project.client_email,
        phone: project.client_phone,
        company: project.client_company
      },
      phases: phasesResult.rows,
      form_data: formDataResult.rows.reduce((acc, row) => {
        return { ...acc, ...row.data };
      }, {}),
      files: filesResult.rows,
      invoices: invoicesResult.rows,
      generated_date: new Date()
    };
  }

  /**
   * Clear template cache
   */
  clearCache() {
    this.templateCache.clear();
  }

  /**
   * Register a custom helper
   */
  registerHelper(name, fn) {
    Handlebars.registerHelper(name, fn);
    this.helpers.set(name, fn);
  }

  /**
   * Register a custom partial
   */
  registerPartial(name, template) {
    Handlebars.registerPartial(name, template);
    this.partials.set(name, template);
  }
}

// Create singleton instance
const documentGenerator = new DocumentGenerator();

export default documentGenerator;