# Invoice System Documentation

## Overview

The [RE]Print Studios Client Portal now includes a complete invoice system with Stripe payment integration, PDF generation, and email notifications. This system allows administrators to create, manage, and send invoices to clients, while clients can view and pay invoices online.

## Features

### Core Functionality
- ✅ **Invoice Management**: Create, read, update, delete invoices
- ✅ **Line Items**: Multiple line items per invoice with quantities and rates
- ✅ **Status Tracking**: Draft, sent, paid, overdue, cancelled statuses
- ✅ **Invoice Numbering**: Automatic generation (format: INV-YYYY-0001)
- ✅ **Tax Calculation**: Configurable tax rates per invoice
- ✅ **Discounts**: Support for discount amounts

### Payment Integration
- ✅ **Stripe Integration**: Secure payment processing
- ✅ **Payment Intent**: Create and confirm payments
- ✅ **Webhook Support**: Handle payment confirmations
- ✅ **Payment Tracking**: Record payment methods and references

### PDF Generation
- ✅ **Professional PDFs**: Generate branded invoice PDFs
- ✅ **Download/Email**: PDFs can be downloaded or emailed
- ✅ **Company Branding**: Includes Kendrick Forrest Design branding

### Email Notifications
- ✅ **Invoice Sending**: Email invoices to clients with PDF attachment
- ✅ **Payment Confirmations**: Automatic payment confirmation emails
- ✅ **Overdue Reminders**: Automated overdue invoice notifications

### Analytics & Reporting
- ✅ **Revenue Statistics**: Track total revenue, pending amounts
- ✅ **Invoice Stats**: Count by status (draft, sent, paid, overdue)
- ✅ **Overdue Tracking**: Monitor and manage overdue invoices

## API Endpoints

### Invoice CRUD Operations

#### GET /api/invoices
List invoices with pagination and filtering
- **Query Parameters**: `status`, `client_id`, `project_id`, `page`, `limit`
- **Authentication**: Required
- **Authorization**: Clients see only their invoices, admins see all

#### GET /api/invoices/:id
Get invoice details with line items
- **Authentication**: Required
- **Authorization**: Clients can only access their own invoices

#### POST /api/invoices
Create a new invoice
- **Authentication**: Required (Admin only)
- **Body**: Invoice data with line items
- **Returns**: Created invoice with line items

#### PUT /api/invoices/:id
Update invoice (draft status only)
- **Authentication**: Required (Admin only)
- **Body**: Updated invoice data
- **Note**: Only draft invoices can be updated

### Invoice Actions

#### POST /api/invoices/:id/send
Send invoice to client via email
- **Authentication**: Required (Admin only)
- **Action**: Sends email with PDF attachment, updates status to 'sent'

#### POST /api/invoices/:id/pay
Process payment via Stripe
- **Authentication**: Required
- **Body**: `{ "payment_method_id": "pm_..." }`
- **Authorization**: Clients can only pay their own invoices

#### POST /api/invoices/:id/cancel
Cancel an invoice
- **Authentication**: Required (Admin only)
- **Body**: `{ "reason": "Optional cancellation reason" }`

#### GET /api/invoices/:id/pdf
Generate and download PDF invoice
- **Authentication**: Required
- **Returns**: PDF file as attachment

### Statistics

#### GET /api/invoices/stats
Get revenue and invoice statistics
- **Authentication**: Required
- **Returns**: Revenue totals, invoice counts by status

### Webhooks

#### POST /api/invoices/webhook/stripe
Stripe webhook endpoint for payment confirmations
- **Authentication**: Stripe signature verification
- **Handles**: `payment_intent.succeeded` events

## Database Schema

### Invoices Table
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID NOT NULL REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(30) NOT NULL DEFAULT 'draft',
    subtotal DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    tax_rate DECIMAL(5,4) DEFAULT 0.0000,
    tax_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(10,2) DEFAULT 0.00,
    total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(3) DEFAULT 'USD',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    paid_date DATE,
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    notes TEXT,
    terms TEXT,
    stripe_invoice_id VARCHAR(100),
    is_recurring BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### Invoice Line Items Table
```sql
CREATE TABLE invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    quantity DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unit_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    line_total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    order_index INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## Invoice Status Workflow

1. **Draft** → Initial status when invoice is created
2. **Sent** → Invoice has been emailed to client
3. **Viewed** → Client has viewed the invoice (optional status)
4. **Paid** → Payment has been processed successfully
5. **Overdue** → Invoice is past due date and unpaid
6. **Cancelled** → Invoice has been cancelled

## Environment Variables

Add these to your `.env` file:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Configuration (Choose one)
# Option 1: Gmail
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password

# Option 2: SMTP
SMTP_HOST=smtp.your-provider.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-username
SMTP_PASSWORD=your-password

# General Email Settings
EMAIL_FROM=kendrick@kendrickforrest.com

# Frontend URL (for email links)
FRONTEND_URL=https://yourdomain.com
```

## Stripe Setup

1. **Create Stripe Account**: Sign up at https://stripe.com
2. **Get API Keys**: From Stripe Dashboard → Developers → API keys
3. **Create Webhook**: Dashboard → Developers → Webhooks
   - Endpoint URL: `https://yourdomain.com/api/invoices/webhook/stripe`
   - Events: `payment_intent.succeeded`
4. **Test Mode**: Use test keys for development

## Email Setup

### Gmail Setup
1. Enable 2-factor authentication on your Gmail account
2. Generate an app-specific password
3. Use the app password in `EMAIL_PASSWORD`

### SMTP Setup
Use your hosting provider's SMTP settings or services like SendGrid, Mailgun, etc.

## Usage Examples

### Creating an Invoice

```javascript
const invoiceData = {
  client_id: "client-uuid-here",
  project_id: "project-uuid-here", // optional
  title: "Brand Identity Package",
  description: "Complete brand identity design including logo, business cards, and style guide",
  issue_date: "2025-08-03",
  due_date: "2025-09-02",
  tax_rate: 0.0875, // 8.75%
  discount_amount: 100.00,
  currency: "USD",
  terms: "Payment due within 30 days",
  notes: "Thank you for your business!",
  line_items: [
    {
      description: "Logo Design",
      quantity: 1,
      unit_price: 800.00
    },
    {
      description: "Business Card Design",
      quantity: 2,
      unit_price: 200.00
    },
    {
      description: "Style Guide",
      quantity: 1,
      unit_price: 400.00
    }
  ]
};

// POST /api/invoices
```

### Processing Payment

```javascript
const paymentData = {
  payment_method_id: "pm_card_visa" // From Stripe.js on frontend
};

// POST /api/invoices/{invoice-id}/pay
```

## Overdue Invoice Management

### Automatic Overdue Detection
The system automatically:
- Marks invoices as overdue when past due date
- Can send reminder emails at configurable intervals
- Tracks days overdue for reporting

### Manual Overdue Check
```javascript
import { dailyOverdueCheck } from './utils/overdueInvoiceChecker.js';

// Run daily overdue check
const results = await dailyOverdueCheck();
```

### Cron Job Setup
Add to your server's crontab to run daily at 9 AM:
```bash
0 9 * * * cd /path/to/your/app && node -e "import('./utils/overdueInvoiceChecker.js').then(m => m.dailyOverdueCheck())"
```

## Security Features

- **Authentication**: All endpoints require valid JWT tokens
- **Authorization**: Role-based access (admin vs client)
- **Input Validation**: Comprehensive validation of invoice data
- **SQL Injection Protection**: Parameterized queries
- **Rate Limiting**: Applied to all API endpoints
- **Stripe Webhook Verification**: Signature validation

## Testing

Run the test suite:
```bash
node test-invoice-system.js
```

The test verifies:
- Database connectivity
- Invoice number generation
- Calculation accuracy
- Data validation
- Environment configuration

## File Structure

```
/routes/invoices.js           # Main invoice API routes
/utils/invoiceHelpers.js      # Helper functions and utilities
/utils/pdfGenerator.js        # PDF generation with PDFKit
/utils/emailService.js        # Email notifications with Nodemailer
/utils/overdueInvoiceChecker.js # Overdue invoice management
/test-invoice-system.js       # System test script
```

## Troubleshooting

### Common Issues

1. **Stripe Payments Failing**
   - Check API keys are correct
   - Verify webhook endpoint is accessible
   - Test with Stripe test cards

2. **Emails Not Sending**
   - Verify email configuration
   - Check SMTP settings
   - Test email credentials

3. **PDF Generation Errors**
   - Ensure PDFKit is installed correctly
   - Check file permissions for temp directories

4. **Database Errors**
   - Confirm database schema is up to date
   - Check connection parameters
   - Verify user permissions

### Logs
Check server logs for detailed error messages:
```bash
tail -f server.log
```

## Future Enhancements

- Recurring invoice support
- Multi-currency support
- Invoice templates
- Client payment portals
- Advanced reporting dashboard
- Integration with accounting software

## Support

For issues or questions about the invoice system, please:
1. Check the troubleshooting section
2. Review server logs
3. Test with the provided test script
4. Verify environment configuration

---

**Note**: This invoice system is production-ready but should be thoroughly tested in your specific environment before going live. Always backup your database before running migrations or updates.