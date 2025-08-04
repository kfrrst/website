-- Default Document Templates Migration
-- Adds initial document templates for common use cases

BEGIN;

-- Screen Printing Proposal Template
INSERT INTO document_modules (
  module_id,
  name,
  description,
  template_type,
  template,
  service_filters,
  phase_filters,
  version
) VALUES (
  'proposal_screenprint',
  'Screen Printing Project Proposal',
  'Professional proposal template for screen printing projects',
  'proposal',
  '{{> header}}

<div class="document-title">
  <h1>Screen Printing Project Proposal</h1>
  <p class="subtitle">Prepared for {{client.name}}</p>
</div>

{{> client-info}}

{{> project-summary}}

<div class="section">
  <h2>Project Overview</h2>
  <p>{{project.description}}</p>
  
  {{#if form_data.project_details}}
  <p>{{form_data.project_details}}</p>
  {{/if}}
</div>

<div class="section">
  <h2>Scope of Work</h2>
  <h3>Screen Printing Services Include:</h3>
  <ul>
    <li>Design consultation and artwork preparation</li>
    <li>Screen creation and setup</li>
    <li>Color matching and testing</li>
    <li>Production run of {{form_data.quantity}} items</li>
    <li>Quality control and packaging</li>
  </ul>
  
  {{#if form_data.special_requirements}}
  <h3>Special Requirements:</h3>
  <p>{{form_data.special_requirements}}</p>
  {{/if}}
</div>

<div class="section">
  <h2>Timeline</h2>
  <table>
    <tr>
      <th>Phase</th>
      <th>Duration</th>
      <th>Deliverables</th>
    </tr>
    {{#each phases}}
    <tr>
      <td>{{this.name}}</td>
      <td>{{this.estimated_duration}} days</td>
      <td>{{this.deliverables}}</td>
    </tr>
    {{/each}}
  </table>
</div>

<div class="section">
  <h2>Investment</h2>
  <table>
    <tr>
      <td>Setup Fee:</td>
      <td>{{formatCurrency form_data.setup_fee}}</td>
    </tr>
    <tr>
      <td>Per Unit Cost:</td>
      <td>{{formatCurrency form_data.unit_cost}}</td>
    </tr>
    <tr>
      <td>Quantity:</td>
      <td>{{form_data.quantity}}</td>
    </tr>
    <tr class="total-row">
      <td><strong>Total Investment:</strong></td>
      <td><strong>{{formatCurrency project.total_budget}}</strong></td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Next Steps</h2>
  <ol>
    <li>Review and approve this proposal</li>
    <li>Sign the service agreement</li>
    <li>Submit 50% deposit to begin production</li>
    <li>Provide final artwork files</li>
  </ol>
</div>

<div class="section signature-section">
  <h2>Acceptance</h2>
  <p>By signing below, you agree to the terms outlined in this proposal.</p>
  
  <div class="signature-grid">
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>Client Signature & Date</p>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>[RE]Print Studios Representative & Date</p>
    </div>
  </div>
</div>

{{> footer}}',
  ARRAY['SP']::TEXT[],
  ARRAY['ONB', 'IDEA']::TEXT[],
  1
);

-- Web Development Proposal Template
INSERT INTO document_modules (
  module_id,
  name,
  description,
  template_type,
  template,
  service_filters,
  phase_filters,
  version
) VALUES (
  'proposal_web',
  'Website Development Proposal',
  'Comprehensive proposal for web development projects',
  'proposal',
  '{{> header}}

<div class="document-title">
  <h1>Website Development Proposal</h1>
  <p class="subtitle">Custom Web Solution for {{client.company}}</p>
</div>

{{> client-info}}

{{> project-summary}}

<div class="section">
  <h2>Project Goals</h2>
  {{#if form_data.project_goals}}
  <p>{{form_data.project_goals}}</p>
  {{else}}
  <ul>
    <li>Create a modern, responsive website</li>
    <li>Improve user experience and engagement</li>
    <li>Increase online visibility and conversions</li>
    <li>Establish a strong digital presence</li>
  </ul>
  {{/if}}
</div>

<div class="section">
  <h2>Proposed Solution</h2>
  <h3>Website Features:</h3>
  <ul>
    <li>Responsive design for all devices</li>
    <li>Content Management System (CMS)</li>
    <li>Search Engine Optimization (SEO)</li>
    <li>Analytics integration</li>
    <li>Contact forms and lead generation</li>
    {{#if form_data.additional_features}}
    <li>{{form_data.additional_features}}</li>
    {{/if}}
  </ul>
  
  <h3>Technology Stack:</h3>
  <ul>
    <li>Frontend: {{form_data.frontend_tech}}</li>
    <li>Backend: {{form_data.backend_tech}}</li>
    <li>Database: {{form_data.database_tech}}</li>
    <li>Hosting: {{form_data.hosting_solution}}</li>
  </ul>
</div>

<div class="section">
  <h2>Development Process</h2>
  <table>
    <tr>
      <th>Phase</th>
      <th>Activities</th>
      <th>Timeline</th>
    </tr>
    <tr>
      <td>Research & Planning</td>
      <td>Requirements gathering, competitor analysis, wireframing</td>
      <td>1 week</td>
    </tr>
    <tr>
      <td>Design</td>
      <td>Visual design, mockups, client review</td>
      <td>2 weeks</td>
    </tr>
    <tr>
      <td>Development</td>
      <td>Frontend & backend development, CMS setup</td>
      <td>4-6 weeks</td>
    </tr>
    <tr>
      <td>Testing & Launch</td>
      <td>Quality assurance, deployment, training</td>
      <td>1 week</td>
    </tr>
  </table>
</div>

<div class="section">
  <h2>Investment Details</h2>
  <table>
    <tr>
      <th>Service</th>
      <th>Cost</th>
    </tr>
    <tr>
      <td>Design & Development</td>
      <td>{{formatCurrency form_data.development_cost}}</td>
    </tr>
    <tr>
      <td>CMS Setup & Configuration</td>
      <td>{{formatCurrency form_data.cms_cost}}</td>
    </tr>
    <tr>
      <td>SEO Optimization</td>
      <td>{{formatCurrency form_data.seo_cost}}</td>
    </tr>
    <tr>
      <td>Training & Documentation</td>
      <td>{{formatCurrency form_data.training_cost}}</td>
    </tr>
    <tr class="total-row">
      <td><strong>Total Investment:</strong></td>
      <td><strong>{{formatCurrency project.total_budget}}</strong></td>
    </tr>
  </table>
  
  <p><strong>Payment Terms:</strong> 50% deposit to begin, 25% at design approval, 25% at launch</p>
</div>

<div class="section">
  <h2>Ongoing Support</h2>
  <ul>
    <li>30 days of complimentary support post-launch</li>
    <li>Monthly maintenance packages available</li>
    <li>Priority support for updates and changes</li>
    <li>Regular security updates and backups</li>
  </ul>
</div>

<div class="section signature-section">
  <h2>Agreement</h2>
  <p>This proposal is valid for 30 days from the date below. By signing, you agree to proceed with the project as outlined.</p>
  
  <div class="signature-grid">
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>{{client.name}} - {{formatDate "now"}}</p>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>[RE]Print Studios - {{formatDate "now"}}</p>
    </div>
  </div>
</div>

{{> footer}}',
  ARRAY['WEB']::TEXT[],
  ARRAY['ONB', 'IDEA']::TEXT[],
  1
);

-- Service Agreement Template
INSERT INTO document_modules (
  module_id,
  name,
  description,
  template_type,
  template,
  service_filters,
  phase_filters,
  version
) VALUES (
  'contract_standard',
  'Standard Service Agreement',
  'General service agreement for all project types',
  'contract',
  '{{> header}}

<div class="document-title">
  <h1>Service Agreement</h1>
  <p class="subtitle">Between [RE]Print Studios and {{client.company}}</p>
</div>

<div class="section">
  <h2>1. Parties</h2>
  <p>This Service Agreement ("Agreement") is entered into on {{formatDate project.created_at}} between:</p>
  <ul>
    <li><strong>[RE]Print Studios</strong> ("Service Provider")</li>
    <li><strong>{{client.company}}</strong> ("Client")</li>
  </ul>
</div>

<div class="section">
  <h2>2. Services</h2>
  <p>Service Provider agrees to provide the following services:</p>
  <ul>
    {{#each project.services}}
    <li class="service-badge">{{this.name}}</li>
    {{/each}}
  </ul>
  <p>As detailed in the project proposal dated {{formatDate project.created_at}}.</p>
</div>

<div class="section">
  <h2>3. Timeline</h2>
  <p>Project Start Date: {{formatDate project.start_date}}</p>
  <p>Estimated Completion: {{formatDate project.estimated_end_date}}</p>
  <p>The project will follow the 8-phase process as outlined in the project management system.</p>
</div>

<div class="section">
  <h2>4. Payment Terms</h2>
  <p>Total Project Cost: <strong>{{formatCurrency project.total_budget}}</strong></p>
  <p>Payment Schedule:</p>
  <ul>
    <li>50% deposit upon signing: {{formatCurrency (multiply project.total_budget 0.5)}}</li>
    <li>25% at design approval: {{formatCurrency (multiply project.total_budget 0.25)}}</li>
    <li>25% upon completion: {{formatCurrency (multiply project.total_budget 0.25)}}</li>
  </ul>
  <p>Payments are due within 15 days of invoice date.</p>
</div>

<div class="section">
  <h2>5. Client Responsibilities</h2>
  <ul>
    <li>Provide timely feedback and approvals</li>
    <li>Supply necessary content and materials</li>
    <li>Adhere to project timeline</li>
    <li>Make payments according to schedule</li>
  </ul>
</div>

<div class="section">
  <h2>6. Intellectual Property</h2>
  <p>Upon final payment, all deliverables become the property of the Client, except for any pre-existing intellectual property of Service Provider.</p>
</div>

<div class="section">
  <h2>7. Confidentiality</h2>
  <p>Both parties agree to maintain confidentiality regarding sensitive business information shared during the project.</p>
</div>

<div class="section">
  <h2>8. Termination</h2>
  <p>Either party may terminate this agreement with 15 days written notice. Client is responsible for payment of all work completed to date.</p>
</div>

<div class="section">
  <h2>9. Limitation of Liability</h2>
  <p>Service Provider liability is limited to the total amount paid by Client under this agreement.</p>
</div>

<div class="section signature-section">
  <h2>10. Signatures</h2>
  <p>By signing below, both parties agree to the terms of this Service Agreement.</p>
  
  <div class="signature-grid">
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>{{client.name}}, {{client.company}}</p>
      <p>Date: _________________</p>
    </div>
    <div class="signature-block">
      <div class="signature-line"></div>
      <p>Kendrick Forrest, [RE]Print Studios</p>
      <p>Date: _________________</p>
    </div>
  </div>
</div>

{{> footer}}',
  NULL,
  ARRAY['ONB']::TEXT[],
  1
);

-- Update all templates to include standard CSS styles
UPDATE document_modules 
SET template = REPLACE(template, '{{> header}}', '{{> header}}
<style>
  .document-title {
    text-align: center;
    margin: 40px 0;
  }
  
  .document-title h1 {
    color: {{brand.colors.blue}};
    margin-bottom: 10px;
  }
  
  .subtitle {
    color: {{brand.colors.graphite}};
    font-size: 1.2rem;
  }
  
  .section {
    margin-bottom: 40px;
  }
  
  .service-badge {
    display: inline-block;
    background-color: {{brand.colors.blue}};
    color: white;
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 14px;
    margin-right: 8px;
  }
  
  .status-active,
  .status-in_progress {
    color: {{brand.colors.blue}};
  }
  
  .status-completed {
    color: {{brand.colors.green}};
  }
  
  .status-on_hold {
    color: {{brand.colors.yellow}};
  }
  
  .total-row {
    border-top: 2px solid {{brand.colors.charcoal}};
    font-size: 1.2rem;
  }
  
  .signature-section {
    margin-top: 60px;
  }
  
  .signature-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 40px;
    margin-top: 40px;
  }
  
  .signature-block {
    text-align: center;
  }
  
  .signature-line {
    border-bottom: 2px solid {{brand.colors.charcoal}};
    margin-bottom: 10px;
    height: 40px;
  }
  
  .progress-bar {
    background-color: #E0E0E0;
    height: 20px;
    border-radius: 10px;
    overflow: hidden;
    margin: 20px 0;
  }
  
  .progress-fill {
    background-color: {{brand.colors.blue}};
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .progress-text {
    text-align: center;
    font-weight: 600;
    color: {{brand.colors.blue}};
  }
</style>
')
WHERE template_type IN ('proposal', 'contract', 'report');

COMMIT;