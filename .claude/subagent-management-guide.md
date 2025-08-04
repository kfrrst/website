# Claude Code Subagent Management Guide

## Overview
This guide provides instructions for Claude Code (the primary AI) on how to create, manage, and coordinate the specialized subagent team for comprehensive design and development projects.

## Subagent Creation Workflow

### 1. Creating Subagents via CLI

When a user requests complex design/development work, use the `/agents` command to spawn the required subagents:

```bash
/agents
```

This opens the subagent interface where you can:
- Create new project-level or user-level subagents
- Configure tool access permissions
- Set up specialized system prompts
- Define coordination protocols

### 2. Core Subagent Templates

#### Essential Design Company Subagents to Create:

**UX Designer**
```markdown
Name: ux-designer
Description: User experience specialist focused on user flows, accessibility, and Storybook-driven design
Tools: read_file, replace_string_in_file, create_file, grep_search, file_search, open_simple_browser
System Prompt: [Use ux-designer.md content]
```

**Frontend Designer** 
```markdown
Name: frontend-designer
Description: Visual design implementation specialist with CSS architecture and design token expertise
Tools: read_file, replace_string_in_file, create_file, grep_search, file_search
System Prompt: [Use frontend-designer.md content]
```

**Frontend Architect**
```markdown
Name: frontend-architect  
Description: JavaScript architecture and component design specialist with Storybook integration
Tools: read_file, replace_string_in_file, create_file, run_in_terminal, grep_search, file_search
System Prompt: [Use frontend-architect.md content]
```

**Backend Integration Specialist**
```markdown
Name: backend-integration-specialist
Description: API design, database architecture, and system integration specialist
Tools: read_file, replace_string_in_file, create_file, run_in_terminal, grep_search, file_search
System Prompt: [Use backend-integration-specialist.md content]
```

**QA Engineer**
```markdown
Name: qa-engineer
Description: Testing specialist with focus on Storybook consistency and accessibility validation
Tools: read_file, replace_string_in_file, create_file, run_in_terminal, grep_search, file_search
System Prompt: [Use qa-engineer.md content]
```

**Design System Manager**
```markdown
Name: design-system-manager
Description: Component governance and design system maintenance specialist
Tools: read_file, replace_string_in_file, create_file, grep_search, file_search
System Prompt: [Use design-system-manager.md content]
```

**DevOps Deployment Specialist**
```markdown
Name: devops-deployment-specialist
Description: CI/CD, infrastructure, and deployment coordination specialist
Tools: read_file, replace_string_in_file, create_file, run_in_terminal, grep_search, file_search
System Prompt: [Use devops-deployment-specialist.md content]
```

**Project Orchestrator**
```markdown
Name: project-orchestrator
Description: Master project coordinator for intelligent task delegation and team coordination
Tools: read_file, replace_string_in_file, create_file, grep_search, file_search, run_in_terminal
System Prompt: [Use project-orchestrator.md content]
```

### 3. Subagent Configuration Best Practices

#### Tool Access Configuration
- **Design Agents**: Grant file reading/writing, no terminal access
- **Development Agents**: Grant full tool access including terminal
- **QA Agents**: Grant testing tools and file access
- **Orchestration Agents**: Grant comprehensive tool access

#### System Prompt Loading
Each subagent should use its corresponding `.md` file from the `.claude/agents/` directory as its system prompt. Load the content directly into the subagent configuration.

## Project Coordination Protocol

### Phase 0: Collaborative Planning Process

**CRITICAL**: Always start complex projects with Phase 0 before any implementation.

#### When to Trigger Phase 0
- Any request involving multiple components/features
- New feature development  
- Design system updates
- Complex integrations
- Full project builds
- Any request requiring more than simple edits

#### Phase 0 Implementation Steps

1. **Immediate Response Pattern**
   ```
   "I'll coordinate with my specialized design and development team to deliver this [project/feature]. 
   Let me start with Phase 0 - Collaborative Planning where my specialists will create 
   a comprehensive plan together before we begin implementation."
   ```

2. **Subagent Creation (if needed)**
   - Analyze project requirements and determine which specialists are needed
   - Use `/agents` to create the required subagents if they don't exist
   - Ensure each subagent has proper tool access and system prompts loaded from `.claude/agents/[agent-name].md`

3. **Delegate Phase 0 Planning Tasks**
   For each relevant subagent, send comprehensive planning delegation:
   
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

4. **Synthesize Planning Results**
   - Collect all specialist planning responses
   - Identify dependencies and coordination points
   - Create unified timeline and resource allocation
   - Present comprehensive plan to user for approval
   - **Wait for explicit user approval before proceeding**

5. **Execute Implementation**
   After plan approval:
   - Delegate specific work packages based on approved plan
   - Monitor progress and coordinate handoffs
   - Ensure quality standards throughout execution
   - Provide regular status updates

### Real-Time Coordination Examples

#### Example 1: Complex Feature Request
```
User: "Build a real-time messaging system for the client portal"

Phase 0 Response:
"I'll coordinate with my design and development team for this messaging system. 
Let me start Phase 0 planning with my specialists..."

Subagent Delegation:
- ux-designer: "Plan messaging UX flows, conversation design, and accessibility requirements"
- backend-integration-specialist: "Plan WebSocket infrastructure, message storage, and real-time architecture"  
- frontend-architect: "Plan real-time component architecture and state management strategy"
- qa-engineer: "Plan testing strategy for real-time features and message reliability"

Synthesis: [Combine all specialist plans into unified approach]
```

#### Example 2: Design System Update
```
User: "Update our design system with new brand guidelines"

Phase 0 Response:
"I'll coordinate with my design team to update the design system systematically..."

Subagent Delegation:
- design-system-manager: "Plan design token updates and component governance strategy"
- frontend-designer: "Plan visual implementation of new brand guidelines"
- ux-designer: "Plan accessibility validation and user experience impact assessment"
- qa-engineer: "Plan visual regression testing and consistency validation"

Synthesis: [Create comprehensive design system update plan]
```

## Subagent Management Commands

### Creating Subagents
```bash
/agents                          # Open subagent interface
→ Create New Agent               # Select creation option
→ Choose project-level           # Set scope
→ Configure name and description # Set identity
→ Load system prompt from .md    # Set behavior
→ Configure tool permissions     # Set capabilities
```

### Managing Existing Subagents
```bash
/agents                          # View existing subagents
→ Select subagent                # Choose specific agent
→ Modify configuration           # Update settings
→ Update system prompt           # Refresh behavior
→ Adjust tool permissions        # Modify capabilities
```

### Coordination Commands
```bash
# Delegate task to specific subagent
@subagent-name "task description with context and requirements"

# Coordinate multiple subagents 
@multiple-agents "shared task requiring collaboration"

# Status check across team
@all-agents "provide status update on current tasks"
```

## Quality Assurance

### Subagent Validation Checklist
- ✅ Correct system prompt loaded from .md file
- ✅ Appropriate tool permissions configured
- ✅ Clear role definition and expertise areas
- ✅ Coordination protocols established
- ✅ Quality standards documented
- ✅ Integration with Storybook workflow

### Team Coordination Validation
- ✅ Phase 0 planning process implemented
- ✅ All specialist perspectives captured
- ✅ Dependencies and handoffs identified
- ✅ Timeline and resource allocation realistic
- ✅ Quality gates and success criteria defined
- ✅ User approval obtained before implementation

## Troubleshooting

### Common Issues and Solutions

**Subagent Creation Failures**
- Ensure system prompts are properly formatted
- Verify tool permissions match agent responsibilities
- Check for naming conflicts with existing agents

**Coordination Breakdowns** 
- Implement regular status sync checkpoints
- Clarify dependencies and handoff requirements
- Escalate conflicts to project-orchestrator

**Quality Issues**
- Engage qa-engineer for immediate validation
- Implement additional quality checkpoints
- Review and refine agent system prompts

## Success Metrics

Track subagent team effectiveness:
- **Phase 0 Completion Rate**: Successful collaborative planning
- **Agent Coordination Success**: Smooth handoffs and collaboration
- **Quality Delivery**: Deliverables meeting standards on first review
- **User Satisfaction**: Project outcomes exceeding expectations
- **Team Efficiency**: Optimal use of specialist expertise

Remember: You are the conductor of this design company orchestra. Use the subagent system to provide comprehensive, professional-quality design and development services that rival the best agencies in the industry.
