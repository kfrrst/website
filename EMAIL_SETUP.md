# [RE]Print Studios Email Configuration

## Email Service: Mailjet

The system is now configured to use **Mailjet** as the email service provider. Mailjet provides reliable email delivery with excellent deliverability rates.

## Email Handles Structure

The following email addresses have been configured for different purposes:

### Primary Addresses
- **hello@reprintstudios.com** - Main contact and general inquiries
- **kendrick@reprintstudios.com** - Personal/administrative contact

### Departmental Addresses
- **support@reprintstudios.com** - Customer support inquiries
- **billing@reprintstudios.com** - Invoice and payment related emails
- **projects@reprintstudios.com** - Project updates and phase notifications

### System Addresses
- **system@reprintstudios.com** - Automated system notifications
- **noreply@reprintstudios.com** - No-reply automated emails

## Email Automation Mapping

Different types of emails use specific sender addresses:

| Email Type | Sender Address | Purpose |
|------------|---------------|---------|
| **Invoices** | billing@reprintstudios.com | Invoice delivery, payment confirmations, overdue reminders |
| **Project Updates** | projects@reprintstudios.com | Phase notifications, stuck project alerts, client action reminders |
| **Inquiries** | hello@reprintstudios.com | New inquiry confirmations and responses |
| **Support** | support@reprintstudios.com | Customer support related communications |
| **System Alerts** | system@reprintstudios.com | Internal system notifications and automation alerts |

## Setup Instructions

### 1. Mailjet Account Setup
1. Create a Mailjet account at https://www.mailjet.com
2. Verify your sender domain (reprintstudios.com)
3. Get your API Key and Secret Key from the account settings

### 2. Environment Variables
Add these variables to your `.env` file:

```env
# Email Service Configuration
EMAIL_SERVICE=mailjet
MAILJET_API_KEY=your_mailjet_api_key_here
MAILJET_API_SECRET=your_mailjet_secret_key_here

# Frontend URL for email links
FRONTEND_URL=https://your-domain.com
```

### 3. Domain Configuration
To ensure proper email delivery, configure these DNS records for `reprintstudios.com`:

#### SPF Record
```
v=spf1 include:spf.mailjet.com ~all
```

#### DKIM Records
Add the DKIM records provided by Mailjet in your domain DNS settings.

#### DMARC Record (Optional but recommended)
```
v=DMARC1; p=quarantine; rua=mailto:dmarc@reprintstudios.com
```

### 4. Email Address Setup
Set up forwarding for the departmental email addresses to the main inbox:

- **support@reprintstudios.com** → kendrick@reprintstudios.com
- **billing@reprintstudios.com** → kendrick@reprintstudios.com  
- **projects@reprintstudios.com** → kendrick@reprintstudios.com
- **system@reprintstudios.com** → kendrick@reprintstudios.com

## Testing

To test the email configuration:

1. Start the server: `npm start`
2. Try creating a new inquiry on the website
3. Check if the confirmation email is sent
4. Test invoice email functionality through the admin panel

## Email Templates

All email templates use the [RE]Print Studios branding with:
- **Primary Color**: #0057FF (Blue)
- **Secondary Color**: #F7C600 (Yellow)  
- **Success Color**: #27AE60 (Green)
- **Error Color**: #E63946 (Red)
- **Background**: #F9F6F1 (Bone white)

## Production Considerations

When deploying to production:

1. Update `FRONTEND_URL` to your actual domain
2. Use production Mailjet API keys
3. Verify all email addresses with Mailjet
4. Test email delivery thoroughly
5. Monitor email delivery rates and bounce rates

## Email Types Implemented

1. **Invoice Emails** - Professional invoice delivery with payment links
2. **Payment Confirmations** - Confirmation when payments are received
3. **Project Phase Updates** - Automated notifications when projects advance phases
4. **Stuck Project Alerts** - Notifications when projects need client attention
5. **Overdue Action Reminders** - Reminders for pending client actions
6. **Inquiry Confirmations** - Auto-reply to new project inquiries
7. **Invoice Reminders** - Pre-due date payment reminders
8. **Overdue Invoice Alerts** - Post-due date payment requests

Each email type uses appropriate sender addresses and professional templates with consistent branding.