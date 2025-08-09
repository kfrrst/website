# Database Schema Summary - [RE]Print Studios Portal

## Current State (v4.0 - 2025-08-08)

### Database: `kendrick_portal_dev`
- **PostgreSQL** with UUID primary keys
- **37 tables** total
- **8-step project flow** fully integrated

## Core Architecture

### User & Authentication Model
- **No separate clients table** - Users with `role='client'` represent client companies
- `users` table handles both authentication and client management
- Projects have `client_id` that references `users.id` (where role='client')

### 8-Step Project Flow
Projects progress through these phases:
1. **ONB** - Onboarding (intake forms, agreement, deposit)
2. **IDEA** - Ideation (creative brief, concepts)
3. **DSGN** - Design (drafts, iterations)
4. **REV** - Review & Feedback (approval gates)
5. **PROD** - Production/Build (execution)
6. **PAY** - Payment (final invoice)
7. **SIGN** - Sign-off & Docs (completion agreement)
8. **LAUNCH** - Launch/Delivery (handoff)

## Key Tables

### Core Business (6 tables)
- `users` - Combined auth + client management
- `projects` - Central project entity with phase tracking
- `files` - Asset management
- `messages` - Communication
- `invoices` - Billing and payments
- `activity_log` - Audit trail

### 8-Step Flow Tables (6 tables)
- `forms_submissions` - Dynamic intake form responses
- `documents` - Generated PDFs (Puppeteer)
- `sign_events` - Electronic signatures
- `phase_requirements` - Client action requirements
- `project_phase_tracking` - Phase progress
- `phase_automation_rules` - Workflow automation

### Communication (4 tables)
- `notifications` - In-app alerts
- `email_queue` - Email management
- `email_templates` - Email templates
- `notification_templates` - Notification templates

## Recent Changes (v4.0)

### Structural Updates
- ✅ Removed `clients` table - merged into users
- ✅ Added `forms_submissions` for intake forms
- ✅ Added `documents` for PDF tracking
- ✅ Added `sign_events` for e-signatures
- ✅ Fixed all foreign key relationships

### API Fixes
- Projects route now queries `users` table instead of non-existent `clients`
- Fixed column references (contact_person → CONCAT(first_name, ' ', last_name))
- Client filtering works with `p.client_id = user.id`

## Integration Points

### External Services
- **Stripe**: Payment processing, webhook for phase advancement
- **Puppeteer**: PDF generation for documents
- **Handlebars**: Document templating
- **Nodemailer/Mailjet**: Email delivery

### Security Features
- UUID primary keys
- JWT authentication
- bcryptjs password hashing
- Parameterized queries
- Row-level security via client_id

## Test Credentials
For development/testing:
- Email: `test@client.com`
- Password: `test123`
- Role: client

## Connection Details
```javascript
DATABASE_URL=postgresql://username:password@localhost:5432/kendrick_portal_dev
```

## Migration Status
- ✅ Base schema created
- ✅ 8-step flow tables added
- ✅ Phase requirements populated
- ✅ Test data available

---

*Last updated: 2025-08-08 by 8-step flow integration*