# 🗄️ RE Print Studios - Complete Database Schema Documentation

## 📊 Database Overview
**Database Name:** `kendrick_portal_dev`  
**Total Tables:** 37 (Production-Ready)  
**Database Type:** PostgreSQL with Extensions  
**Schema Version:** 4.0 (8-Step Flow Integration)  
**Last Updated:** 2025-08-08

---

## 🏗️ Complete Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │           CORE ENTITIES             │
                    └─────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌─────────────┐              ┌─────────────────┐              ┌─────────────┐
│    USERS    │◄─────────────┤    PROJECTS     │──────────────┤    FILES    │
│ (Auth/Client)│              │   (Main Work)   │              │  (Assets)   │
└─────────────┘              └─────────────────┘              └─────────────┘
        │                              │                              │
        └─────────┐           ┌────────┴────────┐           ┌────────┴─────────┐
                  │           │                 │           │                  │
                  ▼           ▼                 ▼           ▼                  ▼
        ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐
        │  INVOICES   │ │USER_SESSIONS│ │ACTIVITY_LOG │ │  DOCUMENTS  │ │  MESSAGES   │
        │  (Billing)  │ │   (Auth)    │ │  (Audit)    │ │   (PDFs)    │ │(Communication)│
        └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘

                    ┌─────────────────────────────────────┐
                    │     8-STEP PROJECT FLOW SYSTEM     │
                    └─────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│FORMS_SUBMISSIONS│         │  SIGN_EVENTS    │         │PHASE_REQUIREMENTS│
│ (Intake Forms)  │         │ (E-Signatures)  │         │(Client Actions) │
└─────────────────┘         └─────────────────┘         └─────────────────┘

                    ┌─────────────────────────────────────┐
                    │        WORKFLOW & AUTOMATION        │
                    └─────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│PROJECT_PHASE_   │         │PHASE_AUTOMATION_│         │PHASE_CLIENT_    │
│   TRACKING      │         │     RULES       │         │   ACTIONS       │
│ (8 Phases)      │         │ (Auto Rules)    │         │ (Requirements)  │
└─────────────────┘         └─────────────────┘         └─────────────────┘

                    ┌─────────────────────────────────────┐
                    │     COMMUNICATION & NOTIFICATIONS   │
                    └─────────────────────────────────────┘
                                       │
        ┌──────────────────────────────┼──────────────────────────────┐
        │                              │                              │
        ▼                              ▼                              ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│EMAIL_TEMPLATES  │         │  EMAIL_QUEUE    │         │ NOTIFICATIONS   │
│   (Templates)   │         │  (Sending)      │         │ (In-App)        │
└─────────────────┘         └─────────────────┘         └─────────────────┘
```

---

## 📋 Complete Table Catalog

### **CORE ENTITIES**

#### 1. 👥 **USERS** (Authentication & Client Management) 
```sql
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) CHECK (role IN ('admin', 'client')) DEFAULT 'client',
    company_name VARCHAR(200), -- For client users
    phone VARCHAR(20),
    avatar_url VARCHAR(500),
    is_active BOOLEAN DEFAULT true,
    email_verified BOOLEAN DEFAULT false,
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Combined authentication and client management
NOTES: Users with role='client' represent client companies
RELATIONSHIPS: → projects (1:many as client_id), → messages (1:many)
```

#### 2. 📁 **PROJECTS** (Core Business Entity)
```sql
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    client_id UUID REFERENCES users(id) ON DELETE CASCADE, -- Points to user with role='client'
    name VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'planning',
    priority VARCHAR(20) DEFAULT 'medium',
    progress_percentage INTEGER DEFAULT 0,
    budget_amount NUMERIC(10,2),
    budget_currency VARCHAR(3) DEFAULT 'USD',
    start_date DATE,
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    project_type VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    current_phase_key VARCHAR(50) DEFAULT 'ONB', -- 8-step flow tracking
    phase_metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Central project management with 8-step flow integration
PHASES: ONB→IDEA→DSGN→REV→PROD→PAY→SIGN→LAUNCH
RELATIONSHIPS: → users (many:1), → files (1:many), → invoices (1:many)
```

### **8-STEP FLOW TABLES**

#### 3. 📝 **FORMS_SUBMISSIONS** (Dynamic Intake Forms)
```sql
CREATE TABLE forms_submissions (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id) ON DELETE CASCADE,
    form_id VARCHAR(100) NOT NULL, -- intake_book_cover, intake_website, etc.
    data JSONB NOT NULL, -- Form response data
    status VARCHAR(50) DEFAULT 'submitted',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Store dynamic form submissions for project intake
FORMS: intake_base, intake_book_cover, intake_website, intake_sp, intake_lfp, etc.
```

#### 4. 📄 **DOCUMENTS** (Generated PDFs & Documents)
```sql
CREATE TABLE documents (
    id SERIAL PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    doc_type VARCHAR(100) NOT NULL, -- SOW, invoice, completion_agreement
    title VARCHAR(255) NOT NULL,
    storage_url TEXT,
    file_path TEXT,
    sha256 VARCHAR(64),
    metadata JSONB,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Track all generated documents (PDFs via Puppeteer)
TYPES: service_agreement_sow, invoice, project_completion_agreement, etc.
```

#### 5. ✍️ **SIGN_EVENTS** (Electronic Signatures)
```sql
CREATE TABLE sign_events (
    id SERIAL PRIMARY KEY,
    document_id INTEGER REFERENCES documents(id) ON DELETE CASCADE,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    signer_role VARCHAR(50) NOT NULL,
    signer_name VARCHAR(255),
    signer_email VARCHAR(255),
    method VARCHAR(50) NOT NULL, -- 'typed', 'drawn', 'external'
    signature_data TEXT, -- Base64 encoded signature or typed name
    ip_address INET,
    user_agent TEXT,
    signed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Capture electronic signatures for agreements
```

#### 6. 📋 **PHASE_REQUIREMENTS** (Client Action Requirements)
```sql
CREATE TABLE phase_requirements (
    id SERIAL PRIMARY KEY,
    phase_key VARCHAR(50) NOT NULL, -- ONB, IDEA, DSGN, etc.
    requirement_type VARCHAR(100) NOT NULL,
    requirement_text TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Define what clients must do in each phase
EXAMPLES: Sign agreement, approve designs, make payment
```

### **WORKFLOW MANAGEMENT**

#### 7. 🔄 **PROJECT_PHASE_TRACKING** (Phase Management)
```sql
CREATE TABLE project_phase_tracking (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    phase_number INTEGER NOT NULL CHECK (phase_number BETWEEN 1 AND 8),
    phase_name VARCHAR(100) NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    estimated_completion DATE,
    actual_duration_hours INTEGER,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(project_id, phase_number)
);

PHASES:
1. Onboarding
2. Ideation  
3. Design
4. Review & Feedback
5. Production/Build
6. Payment
7. Sign-off & Docs
8. Launch/Delivery
```

#### 8. 🤖 **PHASE_AUTOMATION_RULES** (Workflow Automation)
```sql
CREATE TABLE phase_automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    rule_name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_phase INTEGER,
    trigger_condition JSONB NOT NULL,
    action_type VARCHAR(100) NOT NULL,
    action_config JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

PURPOSE: Automate phase transitions and notifications
EXAMPLES: Auto-advance on payment, send reminders
```

### **COMMUNICATION & FILES**

#### 9. 📎 **FILES** (Asset Management)
```sql
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    uploaded_by UUID REFERENCES users(id),
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size BIGINT,
    storage_url TEXT NOT NULL,
    category VARCHAR(100),
    tags TEXT[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 10. 💬 **MESSAGES** (Communication)
```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users(id),
    recipient_id UUID REFERENCES users(id),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    thread_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **BILLING & PAYMENTS**

#### 11. 💰 **INVOICES** (Billing)
```sql
CREATE TABLE invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    client_id UUID REFERENCES users(id),
    status VARCHAR(50) DEFAULT 'draft',
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal NUMERIC(10,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 0,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_terms TEXT,
    notes TEXT,
    stripe_invoice_id VARCHAR(255),
    stripe_payment_intent_id VARCHAR(255),
    paid_date TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **TRACKING & AUDIT**

#### 12. 📊 **ACTIVITY_LOG** (Audit Trail)
```sql
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    metadata JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

### **NOTIFICATION SYSTEM**

#### 13. 🔔 **NOTIFICATIONS** (In-App Alerts)
```sql
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    action_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

#### 14. 📧 **EMAIL_QUEUE** (Email Management)
```sql
CREATE TABLE email_queue (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    to_email VARCHAR(255) NOT NULL,
    from_email VARCHAR(255),
    subject VARCHAR(500) NOT NULL,
    html_content TEXT,
    text_content TEXT,
    template_id VARCHAR(100),
    template_data JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    priority INTEGER DEFAULT 0,
    attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    sent_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    scheduled_for TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔑 Key Relationships

### Primary Foreign Keys
- **projects.client_id** → users.id (client user)
- **forms_submissions.project_id** → projects.id
- **forms_submissions.client_id** → users.id
- **documents.project_id** → projects.id
- **sign_events.document_id** → documents.id
- **sign_events.project_id** → projects.id
- **files.project_id** → projects.id
- **messages.project_id** → projects.id
- **invoices.project_id** → projects.id
- **invoices.client_id** → users.id

### User Roles
- **admin**: Internal staff, full system access
- **client**: Client companies, limited to their projects

### Phase Flow
Projects progress through 8 phases:
1. **ONB** - Onboarding (intake, agreement, deposit)
2. **IDEA** - Ideation (creative brief, concept)
3. **DSGN** - Design (drafts, iterations)
4. **REV** - Review & Feedback (approval)
5. **PROD** - Production/Build (execution)
6. **PAY** - Payment (final invoice)
7. **SIGN** - Sign-off & Docs (completion)
8. **LAUNCH** - Launch/Delivery (handoff)

---

## 🚀 Recent Changes (v4.0)

### Structural Changes
- ✅ Removed separate `clients` table - users with role='client' serve as clients
- ✅ Added `forms_submissions` table for dynamic intake forms
- ✅ Added `documents` table for PDF generation tracking
- ✅ Added `sign_events` table for electronic signatures
- ✅ Added `phase_requirements` table for client action tracking
- ✅ Added `current_phase_key` and `phase_metadata` to projects table

### Integration Points
- **Stripe Webhooks**: Auto-advance PAY→SIGN on payment
- **PDF Generation**: Puppeteer + Handlebars templates
- **Form System**: JSON Schema-based dynamic forms
- **E-Signatures**: In-portal signature capture

---

## 📈 Database Statistics

- **Total Tables**: 37
- **Core Business Tables**: 6
- **8-Step Flow Tables**: 6
- **Communication Tables**: 4
- **Workflow Tables**: 8
- **Audit/Tracking Tables**: 3
- **System Tables**: 10

## 🔐 Security Features

- UUID primary keys for security
- Row-level security via client_id checks
- Audit logging on all sensitive operations
- Encrypted password storage (bcryptjs)
- JWT token authentication
- Parameterized queries (SQL injection prevention)
- File upload validation and sanitization

---

*This documentation reflects the complete production database schema for [RE]Print Studios portal system with full 8-step project flow integration.*