/**
 * Production-ready mock data generators for E2E tests
 */

export class MockDataGenerators {
  private static counter = 0;

  /**
   * Generate unique test identifier
   */
  static getUniqueId(): string {
    this.counter++;
    return `${Date.now()}_${this.counter}`;
  }

  /**
   * Generate test user data
   */
  static generateUser(overrides: Partial<TestUser> = {}): TestUser {
    const uniqueId = this.getUniqueId();
    return {
      email: `test_user_${uniqueId}@test.com`,
      password: 'TestPass123!',
      role: 'client',
      ...overrides
    };
  }

  /**
   * Generate test admin data
   */
  static generateAdmin(overrides: Partial<TestUser> = {}): TestUser {
    const uniqueId = this.getUniqueId();
    return {
      email: `test_admin_${uniqueId}@test.com`,
      password: 'AdminPass123!',
      role: 'admin',
      ...overrides
    };
  }

  /**
   * Generate test client data
   */
  static generateClient(overrides: Partial<TestClient> = {}): TestClient {
    const uniqueId = this.getUniqueId();
    return {
      email: `test_client_${uniqueId}@test.com`,
      password: 'ClientPass123!',
      company_name: `Test Company ${uniqueId}`,
      contact_name: `Test Contact ${uniqueId}`,
      phone: '555-0100',
      address: '123 Test Street',
      city: 'Test City',
      state: 'CA',
      zip: '90210',
      ...overrides
    };
  }

  /**
   * Generate test project data
   */
  static generateProject(overrides: Partial<TestProject> = {}): TestProject {
    const uniqueId = this.getUniqueId();
    return {
      name: `test_project_${uniqueId}`,
      description: `Test project description for ${uniqueId}`,
      status: 'active',
      current_phase: 1,
      budget: 5000,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      service_type: 'branding',
      ...overrides
    };
  }

  /**
   * Generate test invoice data
   */
  static generateInvoice(projectId: number, overrides: Partial<TestInvoice> = {}): TestInvoice {
    const uniqueId = this.getUniqueId();
    return {
      project_id: projectId,
      invoice_number: `INV-TEST-${uniqueId}`,
      amount: 2500.00,
      tax: 200.00,
      total: 2700.00,
      status: 'pending',
      due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      items: [
        {
          description: 'Design Services',
          quantity: 1,
          rate: 2500.00,
          amount: 2500.00
        }
      ],
      ...overrides
    };
  }

  /**
   * Generate test file data
   */
  static generateFile(projectId: number, overrides: Partial<TestFile> = {}): TestFile {
    const uniqueId = this.getUniqueId();
    return {
      project_id: projectId,
      filename: `test_file_${uniqueId}.pdf`,
      original_name: `Test Document ${uniqueId}.pdf`,
      mime_type: 'application/pdf',
      size: 1024 * 1024, // 1MB
      path: `/uploads/test/${uniqueId}/test_file.pdf`,
      uploaded_by: 'client',
      phase: 1,
      ...overrides
    };
  }

  /**
   * Generate test message data
   */
  static generateMessage(projectId: number, overrides: Partial<TestMessage> = {}): TestMessage {
    const uniqueId = this.getUniqueId();
    return {
      project_id: projectId,
      sender_type: 'client',
      sender_name: 'Test Client',
      content: `Test message content ${uniqueId}`,
      attachments: [],
      read: false,
      ...overrides
    };
  }

  /**
   * Generate test inquiry data
   */
  static generateInquiry(overrides: Partial<TestInquiry> = {}): TestInquiry {
    const uniqueId = this.getUniqueId();
    return {
      name: `Test Inquirer ${uniqueId}`,
      email: `test_inquiry_${uniqueId}@test.com`,
      company: `Test Company ${uniqueId}`,
      project_type: 'branding',
      budget: '5k-10k',
      timeline: 'standard',
      message: `Test inquiry message for project ${uniqueId}`,
      status: 'new',
      ...overrides
    };
  }

  /**
   * Generate test form data
   */
  static generateFormData(formType: string): Record<string, any> {
    const uniqueId = this.getUniqueId();
    
    const formTemplates: Record<string, Record<string, any>> = {
      onboarding: {
        company_overview: `Test company overview ${uniqueId}`,
        target_audience: `Test target audience ${uniqueId}`,
        brand_values: ['Innovation', 'Quality', 'Trust'],
        competitors: ['Competitor A', 'Competitor B'],
        project_goals: `Test project goals ${uniqueId}`
      },
      design_brief: {
        design_style: 'modern',
        color_preferences: ['Blue', 'Green', 'White'],
        typography_preferences: 'Sans-serif',
        inspiration_urls: ['https://example.com/1', 'https://example.com/2'],
        avoid_elements: `Things to avoid ${uniqueId}`
      },
      feedback: {
        overall_rating: 5,
        design_feedback: `Excellent design work ${uniqueId}`,
        revision_requests: `Minor revision request ${uniqueId}`,
        approve_current: false
      }
    };
    
    return formTemplates[formType] || {
      field1: `Test value 1 ${uniqueId}`,
      field2: `Test value 2 ${uniqueId}`,
      field3: true,
      field4: 123
    };
  }

  /**
   * Generate valid test credit card for Stripe
   */
  static generateCreditCard(type: 'valid' | 'invalid' | 'declined' = 'valid'): TestCreditCard {
    const cards = {
      valid: {
        number: '4242424242424242',
        exp_month: '12',
        exp_year: String(new Date().getFullYear() + 2),
        cvc: '123',
        zip: '90210'
      },
      invalid: {
        number: '4000000000000002',
        exp_month: '12',
        exp_year: String(new Date().getFullYear() + 2),
        cvc: '123',
        zip: '90210'
      },
      declined: {
        number: '4000000000000002',
        exp_month: '12',
        exp_year: String(new Date().getFullYear() + 2),
        cvc: '123',
        zip: '90210'
      }
    };
    
    return cards[type];
  }

  /**
   * Generate test email template data
   */
  static generateEmailData(template: string): Record<string, any> {
    const uniqueId = this.getUniqueId();
    
    return {
      clientName: `Test Client ${uniqueId}`,
      projectName: `Test Project ${uniqueId}`,
      phaseName: 'Design',
      phaseNumber: 3,
      actionRequired: true,
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      message: `Test message content ${uniqueId}`,
      invoiceNumber: `INV-${uniqueId}`,
      amount: '$2,500.00',
      loginUrl: 'http://localhost:3000/portal.html',
      unsubscribeToken: `unsub_${uniqueId}`
    };
  }
}

// TypeScript interfaces for test data
export interface TestUser {
  email: string;
  password: string;
  role: 'client' | 'admin';
}

export interface TestClient {
  email: string;
  password: string;
  company_name: string;
  contact_name: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

export interface TestProject {
  name: string;
  description: string;
  status: string;
  current_phase: number;
  budget?: number;
  deadline?: Date;
  service_type?: string;
}

export interface TestInvoice {
  project_id: number;
  invoice_number: string;
  amount: number;
  tax: number;
  total: number;
  status: string;
  due_date: Date;
  items: Array<{
    description: string;
    quantity: number;
    rate: number;
    amount: number;
  }>;
}

export interface TestFile {
  project_id: number;
  filename: string;
  original_name: string;
  mime_type: string;
  size: number;
  path: string;
  uploaded_by: string;
  phase: number;
}

export interface TestMessage {
  project_id: number;
  sender_type: string;
  sender_name: string;
  content: string;
  attachments: any[];
  read: boolean;
}

export interface TestInquiry {
  name: string;
  email: string;
  company?: string;
  project_type: string;
  budget: string;
  timeline: string;
  message: string;
  status: string;
}

export interface TestCreditCard {
  number: string;
  exp_month: string;
  exp_year: string;
  cvc: string;
  zip: string;
}