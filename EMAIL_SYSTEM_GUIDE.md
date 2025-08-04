# Email Notification System Guide

## Overview
The [RE]Print Studios portal includes a comprehensive email notification system that automatically sends emails for key project events, phase transitions, and system notifications.

## Email Templates

### Phase Notifications
1. **phase-approval-needed** - Sent when a phase needs client review
2. **phase-approved** - Confirmation when client approves a phase
3. **phase-changes-requested** - Notification when changes are requested
4. **phase-completed** - Sent when a phase is marked complete

### Project Notifications
1. **project-welcome** - Welcome email when project is created
2. **project-completed** - Celebration email when project finishes
3. **project-deadline-reminder** - Reminder about upcoming deadlines
4. **project-weekly-summary** - Weekly digest of project activity

### Invoice & Payment
1. **invoice-sent** - Invoice delivery with payment link
2. **invoice-reminder** - Friendly payment reminder
3. **invoice-overdue** - Overdue notice
4. **payment-received** - Payment confirmation

### File Management
1. **file-uploaded** - Notification when new files are added

### Authentication & Security
1. **password-reset** - Password reset instructions
2. **security-alert** - Alert for new login locations
3. **account-activated** - Account activation confirmation

## Configuration

### Environment Variables
```env
# Email Service Configuration
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_USER=your-api-key
SMTP_PASS=your-secret-key
EMAIL_FROM=noreply@reprintstudios.com
EMAIL_FROM_NAME=RE Print Studios

# Base URL for email links
BASE_URL=https://portal.reprintstudios.com
```

### Database Tables
- `email_log` - Tracks all sent emails
- `user_email_preferences` - User notification settings
- `unsubscribe_tokens` - Manages unsubscribe links
- `email_suppression_list` - Bounced/complained addresses

## Managing Email Templates

### Via Admin Portal
1. Navigate to Settings → Email Templates
2. Click "Manage Templates"
3. Select a template from the sidebar
4. Edit the HTML content
5. Use the toolbar to insert elements:
   - **Variables**: Click `[Client Name]` to insert `{{clientName}}`
   - **Elements**: Add headings, paragraphs, buttons, dividers
   - **Logic**: Add loops (`{{#each}}`) and conditions (`{{#if}}`)
6. Preview in desktop or mobile view
7. Save changes (automatic backup created)

### Available Variables

#### Common Variables (All Templates)
- `[Client Name]` → `{{clientName}}`
- `[Project Name]` → `{{projectName}}`
- `[Project URL]` → `{{projectUrl}}`
- `[Portal URL]` → `{{portalUrl}}`
- `[Current Year]` → `{{currentYear}}`
- `[Unsubscribe URL]` → `{{unsubscribeUrl}}`

#### Template-Specific Variables
Each template has additional variables specific to its context. These are shown in the admin portal when editing.

### Template Helpers
- `{{formatDate dateVariable}}` - Formats dates nicely
- `{{formatCurrency amount}}` - Formats currency values
- `{{#each items}}...{{/each}}` - Loop through arrays
- `{{#if condition}}...{{/if}}` - Conditional content

## Email Queue System

The system uses a queue with retry logic:
1. Emails are queued with initial status `queued`
2. Background processor sends emails
3. Failed emails retry with exponential backoff
4. Max 5 retries over 24 hours
5. Status tracked: `queued`, `sent`, `failed`, `bounced`

## Scheduled Emails (Cron Jobs)

### Weekly Summary
- **Schedule**: Every Monday at 9:00 AM
- **Recipients**: Active clients with `weekly_summary` enabled
- **Content**: Project progress, recent activity, upcoming deadlines

### Invoice Reminders
- **Schedule**: Daily at 10:00 AM
- **Logic**:
  - 3 days before due: Friendly reminder
  - Due date: Payment due today
  - Overdue: Weekly reminders with escalating urgency

### Project Deadline Reminders
- **Schedule**: Daily at 9:30 AM
- **Logic**: Sends reminders 7, 3, and 1 day before deadlines

## Testing Emails

### Send Test Email
```javascript
// Use the test script
node test-email-system.js

// Or test individual template
node test-email-notifications.js
```

### Check Email Status
```sql
-- View recent emails
SELECT * FROM email_log 
ORDER BY created_at DESC 
LIMIT 20;

-- Check queue status
SELECT status, COUNT(*) 
FROM email_log 
GROUP BY status;

-- View bounces/complaints
SELECT * FROM email_suppression_list;
```

## User Preferences

Users can manage their email preferences:
1. Phase notifications (on/off)
2. Project notifications (on/off)
3. File notifications (on/off)
4. Weekly summaries (on/off)
5. Marketing emails (off by default)

### API Endpoints
- `GET /api/email/preferences` - Get user preferences
- `PUT /api/email/preferences` - Update preferences
- `GET /api/email/unsubscribe/:token` - Unsubscribe via link

## Email Deliverability

### Best Practices
1. **SPF/DKIM**: Configure DNS records for authentication
2. **Content**: Avoid spam trigger words
3. **Images**: Use absolute URLs, include alt text
4. **Unsubscribe**: Always include unsubscribe link
5. **Testing**: Test with mail-tester.com

### Monitoring
1. Check bounce rates in email_log
2. Monitor complaint rates
3. Review delivery times
4. Track open/click rates (if enabled)

## Troubleshooting

### Common Issues

#### Emails Not Sending
1. Check SMTP credentials in .env
2. Verify email service is running
3. Check email_log for errors
4. Ensure recipient isn't suppressed

#### Template Not Rendering
1. Verify all variables are provided
2. Check for syntax errors in Handlebars
3. Test with preview feature
4. Review console logs

#### Slow Delivery
1. Check queue size
2. Verify SMTP connection
3. Review retry attempts
4. Consider rate limits

### Debug Mode
Enable detailed logging:
```javascript
// In emailService.js
this.debug = true; // Set to true for verbose logs
```

## Security Considerations

1. **Rate Limiting**: Prevents email flooding
2. **Authentication**: All email endpoints require auth
3. **Validation**: Email addresses validated
4. **Sanitization**: User input escaped in templates
5. **Tokens**: Secure random tokens for unsubscribe

## Future Enhancements

1. **Analytics**: Track open/click rates
2. **A/B Testing**: Test different templates
3. **Personalization**: More dynamic content
4. **Localization**: Multi-language support
5. **Rich Media**: Better image handling

## Support

For issues or questions:
1. Check this documentation
2. Review error logs
3. Test with the provided scripts
4. Contact technical support

---

Last Updated: 2025-08-04
Version: 1.0