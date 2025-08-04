# Subagent System Activation Troubleshooting Guide

## Problem: `/agents` Command Not Creating Visible Subagents

### Current Status
✅ Root `claude.md` file updated with subagent orchestrator instructions
✅ All 8 specialist agents configured in `.claude/agents/` directory  
✅ Backup of original guidelines saved as `claude-reprint-backup.md`

### Step-by-Step Activation Process

#### 1. **Restart Claude Code Session**
Close and reopen Claude Code to ensure it reads the updated `claude.md` file.

#### 2. **Test Complex Request**
Make a request that clearly requires multiple specialists:

```
"I need to build a comprehensive real-time proof approval system with file validation, client collaboration, automated notifications, and admin oversight. This needs UX design, backend APIs, frontend components, real-time features, and comprehensive testing."
```

#### 3. **Expected Response Pattern**
Claude Code should respond with:
```
"I'll coordinate with my specialized design and development team to deliver this proof approval system. 
Let me start with Phase 0 - Collaborative Planning where my specialists will create a 
comprehensive plan together before we begin implementation."
```

#### 4. **Watch for `/agents` Command**
Claude Code should automatically type:
```bash
/agents
```

This should open the subagent management interface.

#### 5. **Manual Trigger (If Needed)**
If Claude Code doesn't automatically use `/agents`, prompt it:
```
"Please create your subagent team now using the /agents command as specified in your instructions."
```

### What Should Happen During Agent Creation

#### Agent Creation Interface
When `/agents` is used, you should see an interface like:
```
┌─ Agent Management ─┐
│ Create New Agent   │
│ Manage Existing    │
│ View All Agents    │
└───────────────────┘
```

#### For Each Agent Creation:
1. **Agent Name**: ux-designer
2. **Description**: Expert UX/UI designer specializing in user experience and Storybook design
3. **System Prompt**: [Paste entire content from `.claude/agents/ux-designer.md`]
4. **Tools**: read_file, replace_string_in_file, create_file, grep_search, file_search, list_dir
5. **Scope**: Project-level

#### Expected Agent List After Creation:
- `@ux-designer` - UX specialist
- `@frontend-designer` - Visual implementation  
- `@frontend-architect` - Component architecture
- `@backend-integration-specialist` - API development
- `@qa-engineer` - Testing validation
- `@design-system-manager` - Component governance
- `@devops-deployment-specialist` - Infrastructure
- `@project-orchestrator` - Team coordination

### Phase 0 Planning Process

#### After Agent Creation:
Claude Code should delegate planning tasks:
```
@ux-designer "PHASE 0 PLANNING REQUEST: [project details]..."
@backend-integration-specialist "PHASE 0 PLANNING REQUEST: [project details]..."
@frontend-architect "PHASE 0 PLANNING REQUEST: [project details]..."
```

#### Expected Agent Responses:
Each agent should provide detailed planning documents covering:
- Their specific responsibilities
- Dependencies on other team members
- Timeline estimates
- Risk assessments
- Quality standards
- Storybook requirements (if applicable)

#### Plan Synthesis:
Claude Code should collect all responses and create a unified project plan for your approval.

### Troubleshooting Common Issues

#### Issue 1: Claude Code Ignores Subagent Instructions
**Cause**: Old `claude.md` file cached or not properly read
**Solution**: 
- Restart Claude Code completely
- Verify `claude.md` contains subagent orchestrator content (not RE Print guidelines)
- Try explicit prompting: "Follow your claude.md instructions for subagent coordination"

#### Issue 2: `/agents` Command Does Nothing
**Cause**: Command not available in current Claude Code version
**Solutions**:
- Try alternative: "Open the agent management interface"  
- Try: "Create a new subagent named ux-designer"
- Check if Claude Code supports subagents in current version

#### Issue 3: Agents Created But Not Visible
**Cause**: Agents created but interface doesn't show them working
**Solutions**:
- Ask: "Show me the status of all created subagents"
- Try: "List all available subagents in this project"
- Request: "Delegate this task to @ux-designer"

#### Issue 4: No Phase 0 Planning
**Cause**: Claude Code not following orchestrator protocol
**Solutions**:
- Explicitly request: "Start Phase 0 collaborative planning with your specialist team"
- Reference instructions: "Use the Phase 0 process from your claude.md instructions"
- Break down: "Delegate planning to each relevant specialist"

### Manual Fallback Process

If automatic subagent creation fails, you can manually guide Claude Code:

#### Step 1: Manual Agent References
```
"Create a UX designer specialist to handle user experience planning for this project."
```

#### Step 2: Explicit Role Assignment
```
"Assign the following roles:
- UX Designer: User flows and interface design  
- Backend Specialist: API and database architecture
- Frontend Architect: Component structure and implementation
- QA Engineer: Testing strategy and validation"
```

#### Step 3: Planning Delegation
```
"Have each specialist create a detailed plan for their area of responsibility."
```

### Verification Checklist

✅ Root `claude.md` contains subagent orchestrator instructions  
✅ All 8 agent files exist in `.claude/agents/` directory  
✅ Claude Code session restarted to read new instructions  
✅ Complex project request made  
✅ Claude Code responds with Phase 0 planning intent  
✅ `/agents` command attempted  
✅ Agent creation interface appears  
✅ Agents created with proper system prompts  
✅ Planning delegation occurs  
✅ Specialist responses collected  
✅ Unified plan presented for approval  

### Success Indicators

🎯 **Full Success**: Multiple agents working visibly in parallel  
🟡 **Partial Success**: Claude Code organizing work by specialist areas  
🔴 **Not Working**: Single agent doing sequential task organization  

### Files for Reference

- **Root Instructions**: `/Users/kendrickforrest/website/claude.md`
- **Agent Definitions**: `/Users/kendrickforrest/website/.claude/agents/`
- **Management Guide**: `/Users/kendrickforrest/website/.claude/subagent-management-guide.md`
- **Activation Guide**: `/Users/kendrickforrest/website/.claude/activation-guide.md`
- **Backup Guidelines**: `/Users/kendrickforrest/website/claude-reprint-backup.md`

The system is now properly configured. Try the activation process and let me know what happens!
