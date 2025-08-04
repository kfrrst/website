# Claude Code Subagent Activation Guide

## Quick Start: Activating Your Design Company Team

### Step 1: Test the Primary Agent Setup
First, make a complex request to Claude Code to trigger the subagent system. Try something like:

```
"I need to add a new messaging feature to the client portal with real-time notifications, user presence indicators, and file sharing capabilities."
```

Claude Code should respond with something like:
```
"I'll coordinate with my specialized design and development team to deliver this messaging feature. 
Let me start with Phase 0 - Collaborative Planning where my specialists will create a 
comprehensive plan together before we begin implementation."
```

### Step 2: Create Subagents via CLI
When Claude Code starts Phase 0, it should use the `/agents` command. If it doesn't automatically, you can prompt it:

```
"Please create your subagent team now using the /agents command"
```

Claude Code will then:
1. Type `/agents` to open the subagent interface
2. Create each of the 8 specialists one by one
3. Load their system prompts from the `.claude/agents/` folder
4. Configure their tool permissions

### Step 3: Verify Subagent Creation
After creation, you should see something like:
```
"I've created my design company team:
- ux-designer: Ready for UX planning and Storybook design
- frontend-designer: Ready for visual implementation
- frontend-architect: Ready for component architecture
- backend-integration-specialist: Ready for API and database work
- qa-engineer: Ready for testing and validation
- design-system-manager: Ready for component governance
- devops-deployment-specialist: Ready for deployment
- project-orchestrator: Ready for coordination"
```

### Step 4: Watch Phase 0 in Action
Claude Code should then delegate planning to each relevant specialist:
```
@ux-designer "PHASE 0 PLANNING REQUEST: [project details]..."
@backend-integration-specialist "PHASE 0 PLANNING REQUEST: [project details]..."
@frontend-architect "PHASE 0 PLANNING REQUEST: [project details]..."
```

### Step 5: Approve the Plan
After all specialists contribute their plans, Claude Code will synthesize them and present a comprehensive plan for your approval.

## Troubleshooting

### If Claude Code Doesn't Use Subagents
1. **Make sure your request is complex enough** - Simple edits won't trigger the team
2. **Try explicitly asking**: "Please use your subagent design team for this"
3. **Reference the system**: "Use Phase 0 planning with your specialists"

### If `/agents` Command Doesn't Work
- Make sure you're in Claude Code (not regular Claude)
- The command should open the subagent management interface
- You may need to manually guide Claude through creating each agent

### If Subagents Aren't Created Properly
Each subagent needs:
- **Name**: Exact match to `.claude/agents/[name].md` file
- **System Prompt**: Full content from the corresponding `.md` file
- **Tools**: Appropriate permissions (see subagent-management-guide.md)
- **Scope**: Project-level for team consistency

## Example Requests That Trigger Subagent Team

### Complex Feature Requests
```
"Add a real-time chat system to the portal"
"Build a project management dashboard with Kanban boards"
"Create a file sharing system with version control"
"Implement advanced search with filters and faceting"
```

### Design System Work
```
"Update our design system with new brand guidelines"
"Create a comprehensive component library in Storybook"
"Redesign the entire user interface for better accessibility"
```

### Full Project Builds
```
"Build a complete invoicing system for clients"
"Create a client onboarding workflow with multi-step forms"
"Develop a reporting system with data visualization"
```

## Success Indicators

✅ Claude Code mentions "Phase 0 - Collaborative Planning"
✅ Claude Code uses `/agents` command to create subagents
✅ Multiple specialists are delegated planning tasks
✅ A comprehensive plan is synthesized and presented
✅ Implementation begins only after your approval

## What to Expect

### Phase 0 Planning (5-10 minutes)
- Specialist analysis and planning
- Dependency identification
- Timeline estimation
- Risk assessment
- Comprehensive plan synthesis

### Implementation Phase (Variable)
- Coordinated specialist work
- Regular progress updates
- Quality checkpoints
- Storybook integration
- Final validation and delivery

## Commands to Remember

- **Trigger subagents**: Ask for complex, multi-faceted work
- **Force Phase 0**: "Please start with Phase 0 planning"
- **Create agents**: "/agents" (Claude Code should do this automatically)
- **Check status**: "What's the status of my design team?"

Your design company team is ready to deliver professional-quality results!
