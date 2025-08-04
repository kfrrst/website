# Phase 0 Implementation Guide

## Quick Reference for Primary Orchestrator

### Phase 0 Trigger
ANY complex request requiring multiple specialists should trigger Phase 0 collaborative planning.

### Immediate Response Template
```
"I'll coordinate with my specialized design and development team to deliver this project. 
Let me start with Phase 0 - Collaborative Planning where my specialists will create 
a comprehensive plan together."
```

### Phase 0 Six-Step Process

#### Step 1: Analysis (Primary Orchestrator)
- Analyze project scope and complexity
- Identify required skills and agents
- Define success criteria

#### Step 2: Team Assembly (Primary Orchestrator)  
- Determine which specialists are needed
- Ensure required subagents exist (use `/agents` if needed)
- Configure team for this specific project

#### Step 3: Parallel Planning (All Relevant Agents)
Delegate to each relevant agent simultaneously:
```
Delegate to [agent-name]: "For this project: [brief project description]

Create a detailed plan covering:
- Your specific responsibilities and deliverables
- Dependencies on other team members
- Timeline estimates for your work
- Risk factors and mitigation strategies  
- Quality standards and success criteria

Project context: [relevant details]
Your role focus: [specific aspect they should plan]"
```

#### Step 4: Plan Synthesis (Primary Orchestrator)
- Collect all specialist planning responses
- Identify overlaps, gaps, and conflicts
- Create unified project timeline
- Establish coordination protocols
- Define integration checkpoints

#### Step 5: Plan Approval (Primary Orchestrator)
Present comprehensive plan to user:
```
"My team has collaborated on a comprehensive plan:

## Project Plan: [Project Name]

### Scope & Approach
[Unified understanding of what we're building]

### Team Coordination Strategy
[How specialists will work together]

### Timeline & Milestones
[Realistic timeline with key deliverables]

### Quality Assurance
[How we'll ensure quality throughout]

### Risk Management
[Identified risks and mitigation plans]

Do you approve this plan? Any modifications needed?"
```

#### Step 6: Task Division (Primary Orchestrator)
After approval, create specific work packages:
```
Delegate to [agent-name]: "Based on the approved project plan, implement [specific work package].

Context: [project background]
Your deliverables: [specific outputs expected]
Dependencies: [what must be completed first]
Coordination: [how to work with other agents]
Timeline: [your specific deadlines]
Quality standards: [success criteria]
```

## Agent Planning Templates

### For UX Designer Planning
```
"Plan the user experience for [project]. Cover:
- User journey mapping and flow requirements
- Accessibility requirements and WCAG compliance planning
- Responsive design breakpoints and mobile considerations
- Storybook component story requirements
- User testing and validation methodology
- Timeline for UX deliverables with dependencies"
```

### For Frontend Architect Planning
```
"Plan the frontend architecture for [project]. Cover:
- Component architecture and state management strategy
- JavaScript framework and library decisions
- Performance requirements and optimization strategy
- Storybook integration and component testing approach
- API integration and data flow planning
- Timeline for development with backend dependencies"
```

### For Backend Integration Specialist Planning
```
"Plan the backend architecture for [project]. Cover:
- Database schema design and optimization
- API specification and endpoint planning
- Integration requirements with external systems
- Security and authentication considerations
- Performance and scalability planning
- Timeline for backend deliverables with frontend dependencies"
```

### For QA Engineer Planning
```
"Plan the quality assurance strategy for [project]. Cover:
- Testing methodology and framework selection
- Automated testing strategy and coverage goals
- Storybook-based component testing approach
- Accessibility testing and validation procedures
- Performance testing and benchmarking plans
- Timeline for QA activities with development dependencies"
```

## Success Indicators

### Phase 0 Success
- ✅ All relevant specialists contributed planning input
- ✅ Dependencies and handoffs clearly identified
- ✅ Realistic timeline with proper resource allocation
- ✅ Quality standards and success criteria defined
- ✅ Risk factors identified with mitigation strategies
- ✅ User approval obtained before implementation begins

### Implementation Success
- ✅ Agents work efficiently based on their plans
- ✅ Handoffs happen smoothly as planned
- ✅ Quality gates are met throughout development
- ✅ Timeline stays on track with minimal adjustments
- ✅ Final deliverable meets or exceeds expectations

## Common Phase 0 Scenarios

### New Feature Development
```
User: "Add user messaging to the portal"
Agents Needed: ux-designer, frontend-architect, backend-integration, qa-engineer
Planning Focus: Real-time architecture, UX flows, database design, testing strategy
```

### Design System Updates  
```
User: "Update design system with new brand guidelines"
Agents Needed: design-system-manager, frontend-designer, ux-designer, qa-engineer
Planning Focus: Token updates, component changes, accessibility impact, testing
```

### Infrastructure Changes
```
User: "Implement CI/CD pipeline"
Agents Needed: devops-deployment-specialist, backend-integration, qa-engineer
Planning Focus: Pipeline architecture, testing integration, deployment strategy
```

## Quality Gates

### Phase 0 Quality Check
Before moving to implementation, verify:
- All specialist perspectives captured
- No major conflicts between agent plans
- Timeline realistic and achievable
- Quality standards clearly defined
- User understands and approves approach

### Implementation Quality Check
Throughout execution, ensure:
- Agents follow their planned approach
- Handoffs happen as scheduled
- Quality standards maintained
- User kept informed of progress
- Issues escalated and resolved quickly

## Remember
Phase 0 is about **collaborative intelligence** - leveraging multiple specialist perspectives to create better plans than any single agent could develop alone. The investment in planning upfront pays off with smoother execution and higher quality results.
