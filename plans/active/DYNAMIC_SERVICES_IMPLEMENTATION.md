# Dynamic Services & Forms Implementation Plan
Date: 2025-08-04
Status: In Progress

## Overview
Implement a dynamic, service-based project management system that adapts phases, forms, and documents based on the type of service (Screen Printing, SaaS Development, Woodworking, etc.).

## Stakeholders
- Client: Kendrick Forrest / [RE]Print Studios
- Users: Creative clients across 11 different service types
- Technical: PostgreSQL, Express, React components

## Requirements

### 1. Service Types (11 total)
- COL: Collaboration Only
- IDE: Ideation Workshop
- SP: Screen Printing
- LFP: Large-Format Print
- GD: Graphic Design
- WW: Woodworking
- SAAS: SaaS Development
- WEB: Website Design
- BOOK: Book Cover Design
- LOGO: Logo & Brand System
- PY: Python Automation

### 2. Dynamic Phase System
Replace fixed 8-phase system with service-specific phase flows:
- Each service has its own phase sequence
- Phases have associated forms and documents
- UI components change based on phase type

### 3. Form & Document Modules
- JSON Schema-based forms that combine based on service
- Handlebars templates for document generation
- Version tracking for all templates

## Project Phases

### Phase 1: Database Schema Updates (2 days)
- [x] Add service_types table
- [x] Update projects table with services array
- [x] Create phase_library table
- [x] Add forms_data and docs tables
- [x] Migrate existing projects to new schema

### Phase 2: Core Service System (3 days)
- [x] Create ServiceTypeManager class
- [x] Implement PhaseLibrary system
- [x] Build service-to-phase mapping logic
- [x] Create API endpoints for service management

### Phase 3: Form Module System (4 days)
- [x] Design JSON schema structure
- [x] Create FormRenderer component
- [x] Build form module loader
- [x] Implement form composition algorithm
- [x] Add form versioning

### Phase 4: Admin UI (2 days)
- [x] Create ServiceManagementModule component
- [x] Build service type management interface
- [x] Implement phase library editor
- [x] Create form builder with JSON schema editor
- [x] Add document template management UI
- [x] Style with bone white design system

### Phase 5: Document Generation (3 days)
- [ ] Set up Handlebars engine
- [ ] Create document templates
- [ ] Build PDF generation pipeline
- [ ] Implement document versioning

### Phase 6: UI Components (5 days)
- [ ] Build phase-specific React components
- [ ] Update ProgressTracker for dynamic phases
- [ ] Create service-aware navigation
- [ ] Implement phase transition logic
- [ ] Add service type selector to project creation

### Phase 7: Migration & Testing (2 days)
- [ ] Migrate existing projects
- [ ] Test all service type flows
- [ ] Update documentation
- [ ] Deploy to staging

## Technical Approach

### 1. Service Type Configuration
```javascript
const SERVICE_TYPES = {
  COL: {
    code: 'COL',
    name: 'Collaboration Only',
    defaultPhases: ['ONB', 'COLLAB', 'WRAP'],
    formModules: ['intake_base', 'collab_brief'],
    docModules: ['proposal_default']
  },
  // ... other services
};
```

### 2. Dynamic Phase Resolution
```javascript
function getProjectPhases(project) {
  const services = project.services;
  const phaseSet = new Set();
  
  services.forEach(serviceCode => {
    const service = SERVICE_TYPES[serviceCode];
    service.defaultPhases.forEach(phase => phaseSet.add(phase));
  });
  
  return Array.from(phaseSet);
}
```

### 3. Form Composition
```javascript
function buildCompositeSchema(phase, projectServices) {
  const modules = phase.formModules
    .filter(moduleId => isModuleApplicable(moduleId, projectServices));
  
  return mergeJsonSchemas(modules);
}
```

## Risk Assessment
- Risk 1: Breaking existing projects | Mitigation: Careful migration with fallbacks
- Risk 2: Complex form merging | Mitigation: Start simple, add complexity gradually
- Risk 3: Performance with dynamic phases | Mitigation: Cache computed phase definitions

## Progress Tracking

### 2025-08-04 - Sprint 1
- ✅ Completed database migration with all tables
- ✅ Created ServiceTypeManager utility class
- ✅ Built FormModuleSystem with JSON schema validation
- ✅ Implemented FormRenderer component with bone white styling
- ✅ Added forms API routes
- ✅ Integrated AJV for schema validation
- ✅ Created ServiceManagementModule for admin UI
- ✅ Built complete admin interface for service customization

### 2025-08-04 - Sprint 2
- ✅ Created DocumentGenerator utility with Handlebars integration
- ✅ Built document generation API routes
- ✅ Added default document templates (proposals, contracts, reports)
- ✅ Implemented document preview functionality
- ✅ Enhanced admin UI with document template management
- ✅ Added template editing with live preview
- ✅ Created reusable Handlebars partials (header, footer, client-info)

### 2025-08-04 - Sprint 3
- ✅ Implemented PDF generation using Puppeteer
- ✅ Created DocumentGenerationModule for client portal
- ✅ Added documents section to portal navigation
- ✅ Built UI for clients to generate and download documents
- ✅ Integrated document history tracking
- ✅ Added template filtering by service and phase
- ✅ Created loading states and error handling

Accomplishments:
- 11 service types created in database
- 18 phases defined in phase library
- Complete form system with composition and versioning
- Dynamic schema merging for multi-service projects
- Visual admin interface for managing services, phases, forms, and documents
- Form builder with JSON schema editor and field templates
- Document generation system with Handlebars templates
- 4 default document templates (screen printing proposal, web proposal, status report, service agreement)
- Live preview for document templates
- Service and phase filtering for targeted document generation
- PDF generation using Puppeteer for high-quality output
- Client portal document generation interface
- Document history tracking and re-download capability
- Responsive design for all UI components
- Bone white styling throughout admin UI and client portal

## Next Steps
1. Create phase-specific UI components (Moodboard, FigmaPreview, etc.)
2. Update ProgressTracker to support dynamic phases
3. Add service type selector to project creation flow
4. Update client portal to use dynamic phase navigation
5. Implement phase-specific client actions based on service type
6. Create document templates for remaining service types
7. Add batch document generation for multiple templates
8. Implement document versioning and revision tracking
9. Test all service type configurations and form compositions
10. Create migration script for existing projects