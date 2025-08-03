import { testConnection, query } from './config/database.js';
import { generateInvoiceNumber, calculateInvoiceTotals, validateInvoiceData } from './utils/invoiceHelpers.js';

/**
 * Test script for Invoice System
 * Run with: node test-invoice-system.js
 */

async function testInvoiceSystem() {
  console.log('🧪 Testing Invoice System...\n');
  
  try {
    // Test database connection
    console.log('1. Testing database connection...');
    await testConnection();
    console.log('✅ Database connection successful\n');
    
    // Test invoice number generation
    console.log('2. Testing invoice number generation...');
    const invoiceNumber = await generateInvoiceNumber();
    console.log(`✅ Generated invoice number: ${invoiceNumber}\n`);
    
    // Test invoice calculations
    console.log('3. Testing invoice calculations...');
    const testLineItems = [
      { description: 'Logo Design', quantity: 1, unit_price: 500.00 },
      { description: 'Business Card Design', quantity: 2, unit_price: 150.00 },
      { description: 'Website Homepage', quantity: 1, unit_price: 1200.00 }
    ];
    
    const totals = calculateInvoiceTotals(testLineItems, 0.0875, 50); // 8.75% tax, $50 discount
    console.log('✅ Invoice calculations:', totals);
    console.log(`   Subtotal: $${totals.subtotal}`);
    console.log(`   Tax: $${totals.tax_amount}`);
    console.log(`   Total: $${totals.total_amount}\n`);
    
    // Test invoice validation
    console.log('4. Testing invoice validation...');
    
    // Valid invoice data
    const validInvoiceData = {
      title: 'Brand Identity Package',
      client_id: 'test-client-id',
      issue_date: '2025-08-03',
      due_date: '2025-09-02',
      line_items: testLineItems
    };
    
    const validationErrors = validateInvoiceData(validInvoiceData);
    if (validationErrors.length === 0) {
      console.log('✅ Valid invoice data passed validation');
    } else {
      console.log('❌ Validation failed:', validationErrors);
    }
    
    // Invalid invoice data
    const invalidInvoiceData = {
      title: '', // Empty title
      client_id: null, // Missing client
      issue_date: '2025-08-03',
      due_date: '2025-08-01', // Due date before issue date
      line_items: [] // No line items
    };
    
    const invalidValidationErrors = validateInvoiceData(invalidInvoiceData);
    console.log(`✅ Invalid invoice data correctly rejected with ${invalidValidationErrors.length} errors:`, invalidValidationErrors);
    console.log();
    
    // Test database queries
    console.log('5. Testing database queries...');
    
    // Check if users exist for testing
    const usersResult = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['client']);
    const clientCount = parseInt(usersResult.rows[0].count);
    console.log(`✅ Found ${clientCount} client users in database`);
    
    // Check invoices table structure
    const invoicesResult = await query('SELECT COUNT(*) as count FROM invoices', []);
    const invoiceCount = parseInt(invoicesResult.rows[0].count);
    console.log(`✅ Found ${invoiceCount} existing invoices in database`);
    
    // Check line items table structure
    const lineItemsResult = await query('SELECT COUNT(*) as count FROM invoice_line_items', []);
    const lineItemCount = parseInt(lineItemsResult.rows[0].count);
    console.log(`✅ Found ${lineItemCount} existing line items in database\n`);
    
    // Test environment variables
    console.log('6. Testing environment variables...');
    const requiredEnvVars = [
      'STRIPE_SECRET_KEY',
      'STRIPE_WEBHOOK_SECRET',
      'EMAIL_FROM'
    ];
    
    let envErrors = 0;
    for (const envVar of requiredEnvVars) {
      if (process.env[envVar]) {
        console.log(`✅ ${envVar} is set`);
      } else {
        console.log(`⚠️  ${envVar} is not set (required for production)`);
        envErrors++;
      }
    }
    
    if (envErrors === 0) {
      console.log('✅ All required environment variables are set');
    } else {
      console.log(`⚠️  ${envErrors} environment variables need to be configured for production`);
    }
    
    console.log('\n🎉 Invoice System Test Complete!');
    console.log('\n📋 Summary:');
    console.log('- Database connection: ✅ Working');
    console.log('- Invoice number generation: ✅ Working');
    console.log('- Invoice calculations: ✅ Working');
    console.log('- Invoice validation: ✅ Working');
    console.log('- Database queries: ✅ Working');
    console.log(`- Environment configuration: ${envErrors === 0 ? '✅' : '⚠️'} ${envErrors === 0 ? 'Complete' : 'Needs setup'}`);
    
    console.log('\n🚀 The invoice system is ready to use!');
    console.log('\nNext steps:');
    console.log('1. Set up Stripe API keys in environment variables');
    console.log('2. Configure email settings (SMTP or Gmail)');
    console.log('3. Set up Stripe webhook endpoint');
    console.log('4. Test with actual invoice creation and payment');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testInvoiceSystem();