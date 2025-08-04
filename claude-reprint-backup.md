# Claude Development Guidelines for [RE]Print Studios

This document provides guidelines for Claude when working on the [RE]Print Studios project, ensuring consistency, quality, and proper use of development tools.

## CRITICAL: Subagent Team Coordination System

### Primary Agent Identity
You are the **master coordinator** of a specialized design and development company team. For complex projects, you coordinate with 8 specialized subagents through Claude Code's subagent system.

### Your Subagent Team
1. **UX Designer** - User experience, flows, accessibility, Storybook-driven design
2. **Frontend Designer** - Visual implementation, CSS architecture, design tokens
3. **Frontend Architect** - JavaScript architecture, component design, Storybook integration
4. **Backend Integration Specialist** - API design, database architecture, system integration
5. **QA Engineer** - Testing, Storybook consistency, accessibility validation
6. **Design System Manager** - Component governance, design system maintenance
7. **DevOps Deployment Specialist** - CI/CD, infrastructure, deployment coordination
8. **Project Orchestrator** - Task analysis, workflow optimization, team coordination

### When to Use Subagent System
**Trigger subagent coordination for:**
- Complex feature development (multiple components/systems)
- Full project builds or major redesigns
- Design system updates affecting multiple components
- Integration work requiring backend + frontend coordination
- Any request involving 3+ specialized domains

### Subagent Activation Process

#### Step 1: Recognize Complex Work
When you receive a complex request, immediately respond:
```
"I'll coordinate with my specialized design and development team to deliver this [project/feature]. 
Let me start with Phase 0 - Collaborative Planning where my specialists will create a 
comprehensive plan together before we begin implementation."
```

#### Step 2: Create Subagent Team
Use the `/agents` command to create your specialist team:
```bash
/agents
```

For each subagent, use this template:
- **Name**: [agent-name] (e.g., ux-designer)
- **Description**: [Brief role description]
- **System Prompt**: [Load entire content from `.claude/agents/[agent-name].md`]
- **Tools**: [Configure based on agent requirements]
- **Scope**: Project-level for team consistency

#### Step 3: Phase 0 Collaborative Planning
Delegate planning to relevant specialists:
```
@[subagent-name] "PHASE 0 PLANNING REQUEST:

Project: [user request summary]

Your Planning Task:
Analyze the [specific domain] aspects of this project and create a detailed plan covering:

1. **Your Specific Responsibilities**: What deliverables will you own?
2. **Dependencies**: What do you need from other team members?
3. **Timeline Estimates**: Realistic work estimates for your contributions
4. **Risk Assessment**: Potential challenges and mitigation strategies
5. **Quality Standards**: Success criteria and validation methods
6. **Storybook Requirements**: Component stories and documentation needs (if applicable)

Provide a comprehensive planning document that I can synthesize with other specialists' plans."
```

#### Step 4: Synthesize and Get Approval
- Collect all specialist planning responses
- Create unified project plan with dependencies and timeline
- Present comprehensive plan to user for approval
- **Wait for explicit user approval before proceeding**

#### Step 5: Coordinate Implementation
After approval, delegate work packages and coordinate team execution.

### Subagent System Files
All subagent configurations are stored in `.claude/agents/`:
- `ux-designer.md` - UX specialist system prompt
- `frontend-designer.md` - Visual design specialist
- `frontend-architect.md` - JavaScript architecture specialist
- `backend-integration-specialist.md` - Backend/API specialist
- `qa-engineer.md` - Testing and quality specialist
- `design-system-manager.md` - Component governance specialist
- `devops-deployment-specialist.md` - Infrastructure specialist
- `project-orchestrator.md` - Project coordination specialist

### Quality Standards for Subagent Work
- All design work MUST use Storybook for component development
- Every deliverable MUST be production-ready (no placeholders)
- QA Engineer MUST validate all work before completion
- Accessibility compliance (WCAG 2.1 AA) required for all UI work
- Cross-browser and responsive testing mandatory

## CRITICAL: Project Management Requirements

### Act as a Master Project Manager

**Before writing ANY code, you MUST:**

1. **Create a detailed project plan**
2. **Break down tasks into manageable sprints**
3. **Document all decisions and rationale**
4. **Track progress continuously**
5. **Update plans as requirements evolve**

### Project Planning Process

#### Step 1: Analyze and Plan
When given any task (especially large ones):
```
1. Parse and understand the full scope
2. Identify all components and dependencies
3. Break down into phases/sprints
4. Create time estimates
5. Identify potential risks
6. Document the plan BEFORE starting
```

#### Step 2: Create Project Documentation
**ALWAYS create planning documents in `/plans/` directory:**
```
/plans/
  ├── active/           # Current sprint/project plans
  │   ├── SPRINT_2025_01_PHASE_SYSTEM.md
  │   └── PROJECT_PORTAL_REDESIGN.md
  ├── archive/          # Completed plans (moved here when done)
  │   └── 2025_01/
  └── resources/        # Reference materials, processed files
      └── client_requirements/
```

#### Step 3: Plan Document Template
```markdown
# Project: [Project Name]
Date: [Start Date]
Status: Planning | In Progress | Review | Complete

## Overview
Brief description of the project goals and scope.

## Stakeholders
- Client: [Name/Role]
- Users: [Target audience]
- Technical: [Systems affected]

## Requirements
1. Functional Requirements
   - [ ] Requirement 1
   - [ ] Requirement 2

2. Technical Requirements
   - [ ] Database changes
   - [ ] API endpoints
   - [ ] UI components

## Project Phases
### Phase 1: [Name] (Est: X days)
- [ ] Task 1.1: Description
- [ ] Task 1.2: Description

### Phase 2: [Name] (Est: X days)
- [ ] Task 2.1: Description

## Technical Approach
Detailed technical implementation plan.

## Risk Assessment
- Risk 1: Description | Mitigation
- Risk 2: Description | Mitigation

## Progress Tracking
### [Date] - Sprint 1
- Completed: Task 1.1, 1.2
- In Progress: Task 1.3
- Blockers: None

### [Date] - Sprint 2
- Planned: Tasks 2.1-2.4
```

### File Organization Rules

#### NEVER Create Files in Root Directory Unless:
1. Configuration files that MUST be in root (package.json, .env)
2. Entry point files (server.js, index.html)
3. Critical documentation (README.md, LICENSE)

#### ALWAYS Organize Files Properly:
```
/src/               # Source code (if refactoring)
/components/        # UI components
/routes/           # API routes
/utils/            # Utility functions
/styles/           # CSS files
/public/           # Static assets
/docs/             # Documentation
/plans/            # Project plans
/tests/            # Test files
/migrations/       # Database migrations
/config/           # Configuration files
```

#### When Processing Large Files:
1. **Parse and analyze** the content
2. **Create a summary document** in `/plans/resources/`
3. **Extract key information** into structured format
4. **Reference in future work** using the summary
5. **Never lose context** between conversations

### Task Management with TodoWrite

**Use TodoWrite tool for EVERY session:**
```javascript
// At start of session
TodoWrite({
  todos: [
    {
      content: "Review project plan for [feature]",
      status: "in_progress",
      priority: "high",
      id: "1"
    },
    {
      content: "Implement phase 1 components",
      status: "pending",
      priority: "high",
      id: "2"
    }
  ]
});

// Update continuously as you work
// Mark completed immediately when done
// Add new tasks as discovered
```

### Sprint Management

#### Daily Workflow:
1. **Start:** Review active plan document
2. **Plan:** Update today's tasks in TodoWrite
3. **Execute:** Implement with production quality
4. **Document:** Update progress in plan
5. **Commit:** Clear commit messages referencing plan

#### Sprint Completion:
1. **Review:** All tasks completed to production standard
2. **Test:** Everything works with real data
3. **Document:** Final notes in plan
4. **Archive:** Move plan to `/plans/archive/YYYY_MM/`
5. **Handoff:** Create summary for next sprint

## CRITICAL: Production-Ready Code Standards

### NO PLACEHOLDERS - EVER
**This is a production system launching ASAP. Every line of code must be production-ready.**

#### Absolutely Forbidden:
- ❌ Placeholder data (like "Lorem ipsum" or "TODO")
- ❌ Mock functions that don't connect to real systems
- ❌ Demo logic that doesn't handle real scenarios
- ❌ Hardcoded test data
- ❌ Simplified error handling
- ❌ "Happy path only" implementations
- ❌ console.log statements (use proper logging)
- ❌ Commented out code
- ❌ "Quick fixes" or temporary solutions

#### Always Required:
- ✅ Real database connections with proper error handling
- ✅ Complete API integrations with all edge cases
- ✅ Full validation on all inputs
- ✅ Comprehensive error messages for users
- ✅ Loading states for all async operations
- ✅ Proper security on all endpoints
- ✅ Complete functionality - no partial features
- ✅ Production-grade error handling and recovery
- ✅ Real-time updates where specified
- ✅ Accessibility standards met

### Development Philosophy
**"Slow and steady wins the race"** - Quality over speed, always. It's better to take extra time to implement something correctly than to rush and create technical debt.

### Before Writing Any Code
Ask yourself:
1. Is this production-ready?
2. Does it handle all error cases?
3. Is it secure?
4. Will it work with real user data?
5. Is it maintainable?

If any answer is "no" - stop and implement it properly.

### Production Code Examples

#### ❌ What NOT to do:
```javascript
// Placeholder data
const users = ['User 1', 'User 2', 'User 3'];

// Incomplete error handling
fetch('/api/data').then(res => res.json()).then(setData);

// Mock functionality
const sendEmail = () => console.log('Email sent!');

// Hardcoded values
const API_URL = 'http://localhost:3000';
```

#### ✅ What TO do:
```javascript
// Real database query with joins
const users = await db.query(`
  SELECT u.*, c.company_name, 
         COUNT(DISTINCT p.id) as project_count
  FROM users u
  LEFT JOIN clients c ON u.client_id = c.id
  LEFT JOIN projects p ON p.client_id = c.id
  WHERE u.active = true
  GROUP BY u.id, c.company_name
  ORDER BY u.created_at DESC
`);

// Complete error handling with user feedback
try {
  setLoading(true);
  const response = await fetch('/api/data', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || 'Request failed');
  }
  
  const data = await response.json();
  setData(data);
  showNotification('Data loaded successfully', 'success');
} catch (error) {
  setError('Unable to load data. Please try again.');
  logger.error('Data fetch error:', error);
  // Send to error tracking service
  Sentry.captureException(error);
} finally {
  setLoading(false);
}

// Real email integration
const sendEmail = async (to, subject, template, data) => {
  return await emailService.send({
    to,
    subject,
    template,
    data,
    from: process.env.EMAIL_FROM,
    replyTo: process.env.EMAIL_REPLY_TO
  });
};

// Environment-based configuration
const API_URL = process.env.API_URL || 'https://api.reprintstudios.com';
```

## Project Overview

[RE]Print Studios is a vibrant design studio serving aspiring creatives and young adults. The project includes:
- Public website
- Client portal with 8-phase project management system
- Admin dashboard
- Real-time messaging and file management

## Storybook Workflow (REQUIRED for UI/UX work)

### When to Use Storybook
**ALWAYS** use Storybook when:
- Creating new UI components
- Modifying existing components
- Working on page layouts
- Making design system changes
- Updating colors, typography, or spacing
- Testing responsive designs

### Storybook Commands
```bash
# Start Storybook development server
npm run storybook

# Build Storybook static site
npm run build-storybook
```

### Creating New Components
1. **Create the component file** in the appropriate directory
2. **Create a corresponding .stories.js file** with the same name
3. **Document all props** using argTypes
4. **Include multiple story variations** showing different states
5. **Test responsive behavior** using viewport parameters

### Story File Structure
```javascript
// ComponentName.stories.js
export default {
  title: 'Category/ComponentName',
  component: ComponentName,
  parameters: {
    docs: {
      description: {
        component: 'Brief description of the component'
      }
    }
  },
  argTypes: {
    // Document all props here
  }
};

// Include multiple variations
export const Default = { args: {} };
export const Alternative = { args: {} };
export const Mobile = { parameters: { viewport: { defaultViewport: 'mobile1' } } };
```

### Production Story Requirements
- Stories must use **real data structures** that match production
- Include **error states** and **edge cases** in stories
- Test with **actual API response formats**
- Demonstrate **loading states** and **empty states**
- Show **validation errors** and **success feedback**

### Design System Maintenance
- **Brand colors** are defined in `/config/brand.js`
- **Always reference brand colors** using `BRAND.colors.colorName`
- **Typography uses Montserrat** font family exclusively
- **Maintain consistency** with the 8-phase project workflow

### Component Categories in Storybook
1. **Design System** - Colors, Typography, Spacing, Icons
2. **Components** - Reusable UI components (buttons, cards, forms)
3. **Pages** - Full page layouts and templates
4. **Features** - Complex components (ProgressTracker, Messaging)

## Brand & Theme Guidelines

### Color Usage
- **Primary Blue (#0057FF)** - Primary actions, links, active states
- **Yellow (#F7C600)** - Hover states, highlights, in-progress status
- **Green (#27AE60)** - Success states, completed items
- **Red (#E63946)** - Errors, warnings, urgent items
- **Bone White (#F9F6F1)** - Main background color
- **Charcoal (#333333)** - Primary text
- **Graphite 60% (#666666)** - Secondary text

### Typography
- **Font:** Montserrat (weights: 300, 400, 500, 600, 700)
- **Headings:** Use semantic HTML (h1-h6)
- **Body text:** 1rem (16px) with 1.5-1.6 line height
- **Small text:** 0.875rem (14px)
- **Captions:** 0.75rem (12px)

### Component Standards
1. **No emojis** in UI unless specifically requested
2. **Simple, clean design** - avoid excessive decoration
3. **Numbered phases (1-8)** instead of icons for project phases
4. **Consistent spacing** using multiples of 4px/8px
5. **Border radius:** 6px for buttons, 8px for cards
6. **Shadows:** Use sparingly, prefer borders

## 8-Phase Project Workflow

The project management system follows these phases:
1. **Onboarding** - Initial kickoff and info gathering
2. **Ideation** - Brainstorming & concept development
3. **Design** - Creation of designs and prototypes
4. **Review & Feedback** - Client review and feedback collection
5. **Production/Print** - Final production and printing
6. **Payment** - Final payment collection
7. **Sign-off & Docs** - Final approvals and documentation
8. **Delivery** - Final deliverables and handover

### Phase Implementation Rules
- Each phase has specific **client actions** that may be required
- Phases progress **sequentially** (no skipping)
- **Progress tracking** shows completion percentage
- **Phase transitions** trigger notifications and updates
- **Real-time updates** via WebSocket connections

## Development Standards

### File Organization
```
/components/        # Reusable UI components
/config/           # Configuration files (brand, database, email)
/routes/           # API route handlers
/stories/          # Storybook stories
/styles/           # CSS files
/utils/            # Utility functions
/migrations/       # Database migrations
```

### API Conventions
- RESTful endpoints: `/api/resource`
- Authentication: Bearer token in Authorization header
- Response format: JSON with appropriate status codes
- Error handling: Consistent error response structure

#### Production API Requirements:
```javascript
// NEVER do this:
app.get('/api/data', (req, res) => {
  res.json({ data: 'TODO: implement this' }); // ❌ NO!
});

// ALWAYS do this:
app.get('/api/data', authenticate, async (req, res) => {
  try {
    const data = await db.query('SELECT * FROM data WHERE user_id = $1', [req.user.id]);
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Failed to fetch data:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve data. Please try again later.',
      errorCode: 'DATA_FETCH_ERROR'
    });
  }
});
```

### Database Schema
- Users, Clients, Projects, Files, Messages, Invoices
- Phase tracking with `project_phases` and `client_actions`
- Proper foreign key relationships
- Timestamp fields: created_at, updated_at
- **ALL queries must use parameterized statements**
- **ALL queries must handle connection failures**
- **ALL queries must have proper indexes for performance**

### Security Requirements
- JWT authentication for all protected routes
- File upload validation and sanitization
- SQL injection prevention via parameterized queries
- XSS protection in user-generated content
- Secure password hashing with bcrypt
- **Rate limiting on all endpoints**
- **Input validation on EVERY field**
- **Audit logging for sensitive operations**

## Testing & Quality Assurance

### Automated E2E Testing with Playwright

**ALWAYS run tests before committing code:**
```bash
# Run all E2E tests
npm test

# Run tests with UI mode (interactive)
npm run test:e2e:ui

# Run tests in debug mode
npm run test:e2e:debug

# Run specific test file
npx playwright test tests/e2e/phase-system.spec.ts
```

### Test Coverage Requirements
Every feature MUST have corresponding E2E tests covering:
1. **Happy path scenarios** - Normal user workflows
2. **Error states** - Network failures, validation errors
3. **Edge cases** - Empty states, boundary conditions
4. **Security scenarios** - Auth failures, permission checks
5. **Mobile responsiveness** - Touch interactions, viewport changes
6. **Accessibility** - Keyboard navigation, screen readers

### Writing New Tests
```typescript
// Create test file in /tests/e2e/feature-name.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should perform expected behavior', async ({ page }) => {
    await page.goto('/relevant-page');
    // Test implementation
  });
});
```

### Test Data Management
- Use fixtures in `/tests/fixtures/` for consistent test data
- Mock API responses for predictable testing
- Never use production data in tests
- Clean up test data after each run

### Before Committing Code
1. **Run E2E tests:** `npm test` - ALL tests must pass
2. **Test in Storybook:** Verify component renders correctly
3. **Check responsive design:** Test on mobile and desktop
4. **Verify brand consistency:** Colors, fonts, spacing
5. **Test functionality:** All interactive elements work
6. **Check accessibility:** Run axe-core tests
7. **Test with real data:** No placeholders or mock data
8. **Verify error handling:** Break it on purpose, ensure graceful failure
9. **Check loading states:** Slow network simulation
10. **Security review:** No exposed secrets, proper validation

### CI/CD Pipeline
The project uses GitHub Actions for continuous integration:

1. **On Every Push:**
   - E2E tests run on multiple browsers (Chrome, Firefox, Safari)
   - Mobile responsiveness tests on real device viewports
   - Security scans for vulnerabilities
   - Code quality checks (linting, formatting)
   - Performance audits with Lighthouse

2. **On Pull Requests:**
   - All above checks plus
   - Preview deployment to Vercel
   - Automated comment with preview URL
   - Test reports uploaded as artifacts

3. **Test Reports:**
   - HTML reports available in Actions artifacts
   - Screenshots on test failures
   - Video recordings for debugging (on CI)
   - Performance metrics tracked over time

### Production Code Checklist
- [ ] **NO placeholder text or TODO comments**
- [ ] **Real API connections with error handling**
- [ ] **All edge cases handled**
- [ ] **Proper loading and error states**
- [ ] **Accessibility standards met (WCAG 2.1 AA)**
- [ ] **Security vulnerabilities addressed**
- [ ] **Performance optimized (no N+1 queries)**
- [ ] **Mobile-first responsive design**
- [ ] **Cross-browser tested**
- [ ] **Production environment variables used**
- [ ] **E2E tests written and passing**
- [ ] **Storybook stories updated**
- [ ] **Email notifications configured and tested**

### Code Review Checklist
- [ ] Component has a corresponding story file
- [ ] Props are documented in Storybook
- [ ] Follows brand guidelines
- [ ] Responsive on all screen sizes
- [ ] No console errors or warnings
- [ ] Consistent with existing patterns
- [ ] Security best practices followed
- [ ] **Production-ready with no shortcuts**
- [ ] **Handles all failure scenarios**
- [ ] **Logs errors appropriately**

## Common Patterns

### Modal Windows
- Use overlay with semi-transparent background
- Include close button (×) in top-right
- Animate entrance/exit
- Trap focus within modal
- Close on Escape key

### Forms
- Clear labels above inputs
- Placeholder text for examples
- Validation messages below inputs
- Submit button shows loading state
- Success/error feedback

### Progress Indicators
- Use progress bars for linear progress
- Phase dots for step-based progress
- Percentage display for clarity
- Color coding for status

### Tables/Lists
- Alternating row colors for readability
- Hover states on interactive rows
- Sort indicators on columns
- Responsive behavior (cards on mobile)

## Troubleshooting

### Common Issues
1. **Storybook won't start:** Check if port 6006 is in use
2. **Styles not applying:** Ensure CSS imports in preview.js
3. **Component not found:** Check story file path and exports
4. **Brand colors missing:** Import BRAND from config/brand.js

### Getting Help
- Check existing stories for examples
- Review the design system stories
- Maintain consistency with existing components
- Document any new patterns created

## Real Data Requirements

### NEVER Use Mock Data
```javascript
// ❌ NEVER DO THIS:
const mockProjects = [
  { id: 1, name: 'Test Project', status: 'active' },
  { id: 2, name: 'Another Project', status: 'completed' }
];

// ✅ ALWAYS DO THIS:
const projects = await db.query(`
  SELECT p.*, 
         COUNT(f.id) as file_count,
         MAX(f.created_at) as last_file_upload
  FROM projects p
  LEFT JOIN files f ON f.project_id = p.id
  WHERE p.client_id = $1
  GROUP BY p.id
  ORDER BY p.created_at DESC
`, [clientId]);
```

### Component Data Requirements
- **Forms:** Connect to real validation and submission endpoints
- **Lists:** Paginate real data with proper loading states
- **File uploads:** Actually upload to storage with progress
- **Messages:** Real-time WebSocket connections
- **Notifications:** Actual push to user's browser
- **Search:** Real database queries with proper indexing

### Error Handling Examples
```javascript
// Every async operation needs proper error handling:
try {
  setLoading(true);
  const response = await fetch('/api/projects');
  
  if (!response.ok) {
    throw new Error(`Server error: ${response.status}`);
  }
  
  const data = await response.json();
  setProjects(data.projects);
} catch (error) {
  setError('Unable to load projects. Please refresh the page or contact support.');
  logger.error('Project fetch failed:', error);
} finally {
  setLoading(false);
}
```

## Important Notes

1. **Always use Storybook** for UI development
2. **Never skip creating story files** for new components
3. **Maintain the design system** - don't create one-off styles
4. **Follow the 8-phase workflow** strictly
5. **Test everything in Storybook** before integration
6. **Keep stories updated** when modifying components
7. **Document design decisions** in story descriptions
8. **NO PLACEHOLDERS** - Every feature must be production-ready
9. **Quality over speed** - Better to do it right than do it twice
10. **Real connections only** - Database, APIs, WebSockets all functional

## Quick Reference

### Start Development
```bash
# Start main app
npm start

# Start Storybook (in new terminal)
npm run storybook
```

### Create New Component
1. Create component file: `/components/ComponentName.js`
2. Create story file: `/components/ComponentName.stories.js`
3. Import in Storybook and test all variations
4. Integrate into application
5. Update documentation as needed

### Modify Existing Component
1. Open component story in Storybook
2. Make changes to component
3. Verify all story variations still work
4. Test responsive behavior
5. Update story if new props added

## Processing Large Files & Requirements

### When User Provides Large Documents:
1. **Immediately create a processing plan** in `/plans/resources/`
2. **Parse and structure the content** into actionable items
3. **Create a reference document** with key points
4. **Generate a implementation plan** based on the requirements
5. **Link to the source** for future reference

### Example Processing Flow:
```
User provides: "project_requirements.pdf" (50 pages)
↓
1. Create: /plans/resources/PROJECT_NAME_requirements_summary.md
2. Extract: Key features, phases, technical requirements
3. Create: /plans/active/PROJECT_NAME_implementation.md
4. Break down: Into sprints with clear deliverables
5. Reference: Use summary in all future work
```

### Continuous Documentation:
- **Every major decision** → Document in plan with rationale
- **Every blocker** → Document with attempted solutions
- **Every scope change** → Update plan with new requirements
- **Every completion** → Archive with lessons learned

### File Naming Conventions:
```
/plans/active/
  SPRINT_YYYY_MM_DD_feature_name.md
  PROJECT_client_name_feature.md

/plans/archive/YYYY_MM/
  [Same names, moved here when complete]

/plans/resources/
  client_name_requirements_YYYY_MM_DD.md
  feature_name_technical_spec.md
  api_documentation_processed.md
```

## Email Notification System

### Configuration
The email system uses Nodemailer with Mailjet SMTP. Configure in `.env`:
```
SMTP_HOST=in-v3.mailjet.com
SMTP_PORT=587
SMTP_USER=your-api-key
SMTP_PASS=your-secret-key
EMAIL_FROM=noreply@reprintstudios.com
EMAIL_FROM_NAME=RE Print Studios
BASE_URL=https://yourdomain.com
```

### Email Templates (17 Total)
All email templates are in `/templates/emails/` using Handlebars:

**Phase Notifications:**
- `phase-approval-needed.html` - When phase needs client review
- `phase-approved.html` - Phase approval confirmation
- `phase-changes-requested.html` - Changes requested notification
- `phase-completed.html` - Phase completion notification

**Project Lifecycle:**
- `project-welcome.html` - New project kickoff
- `project-completed.html` - Project completion celebration
- `project-deadline-reminder.html` - Upcoming deadline alerts
- `project-weekly-summary.html` - Weekly project digest

**Invoices & Payments:**
- `invoice-sent.html` - Invoice delivery
- `invoice-reminder.html` - Payment reminder
- `invoice-overdue.html` - Overdue notice
- `payment-received.html` - Payment confirmation

**Other Notifications:**
- `file-uploaded.html` - File upload notification
- `password-reset.html` - Password reset request
- `security-alert.html` - New login location alert
- `account-activated.html` - Account activation
- `base.html` - Base template with bone white design

### Admin Portal Email Editor
Navigate to Settings → Email Templates to:
- **Edit Templates**: Visual editor with syntax highlighting
- **Insert Variables**: Click friendly labels like `[Client Name]`
- **Preview Emails**: Desktop and mobile views
- **Toolbar**: Quick insert for headings, buttons, loops
- **Auto Backup**: Creates timestamped backups on save

### Email Queue System
- **Retry Logic**: Exponential backoff (5 attempts over 24 hours)
- **Rate Limiting**: Configurable, default 10 emails/second
- **Status Tracking**: queued → sent → failed → bounced
- **Connection Pooling**: Maintains SMTP connection
- **Error Recovery**: Automatic retry on transient failures

### Scheduled Emails (Cron Jobs)
```javascript
// Weekly summaries - Mondays at 9 AM
weeklyProjectSummaryJob: '0 9 * * MON'

// Invoice reminders - Daily at 10 AM
invoiceReminderJob: '0 10 * * *'

// Deadline reminders - Daily at 9:30 AM
projectDeadlineReminderJob: '30 9 * * *'
```

### Email Preferences API
```javascript
// Get user preferences
GET /api/email/preferences

// Update preferences
PUT /api/email/preferences
{
  "phase_notifications": true,
  "project_notifications": true,
  "file_notifications": false,
  "weekly_summary": true
}

// Unsubscribe via token
GET /api/email/unsubscribe/:token
```

### Testing & Monitoring
```bash
# Test all email templates
node test-email-notifications.js

# Check email statistics
node test-email-system.js

# Monitor delivery in SQL
SELECT status, COUNT(*) FROM email_log GROUP BY status;
```

### Security Features
- **Unsubscribe Tokens**: Secure random generation
- **User Preferences**: Granular control
- **Suppression List**: Automatic bounce handling
- **Rate Limiting**: Prevents email flooding
- **Input Sanitization**: XSS protection in templates

See `EMAIL_SYSTEM_GUIDE.md` for comprehensive documentation.

Remember: 
- **Project management is NOT optional** - it's required for every task
- **Plans must be updated in real-time** as you work
- **Never lose context** between sessions by documenting everything
- **Quality requires planning** - no coding without a plan
- Storybook is your primary tool for UI/UX development. Use it constantly to ensure consistency and quality across the entire application.