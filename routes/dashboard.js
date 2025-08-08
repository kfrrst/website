import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';
import { BRAND } from '../config/brand.js';

const router = express.Router();

// GET /api/dashboard/phase-summary - Get dashboard phase summary for authenticated user
router.get('/phase-summary', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    console.log('Phase summary API - User:', { userId, role: userRole });
    
    // Get projects with phase data
    let projectsQuery;
    let queryParams;
    
    if (userRole === 'admin') {
      // Admin sees all active projects
      projectsQuery = `
        SELECT 
          p.id,
          p.name,
          p.status,
          pt.current_phase_index,
          ph.phase_key as current_phase,
          ph.name as phase_name,
          p.progress_percentage,
          p.due_date,
          u.first_name || ' ' || u.last_name as client_name
        FROM projects p
        LEFT JOIN users u ON p.client_id = u.id AND u.role = 'client'
        LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
        LEFT JOIN project_phases ph ON pt.current_phase_id = ph.id
        WHERE p.is_active = true
        ORDER BY p.updated_at DESC
        LIMIT 10
      `;
      queryParams = [];
    } else {
      // Client sees only their projects
      projectsQuery = `
        SELECT 
          p.id,
          p.name,
          p.status,
          pt.current_phase_index,
          ph.phase_key as current_phase,
          ph.name as phase_name,
          p.progress_percentage,
          p.due_date
        FROM projects p
        LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
        LEFT JOIN project_phases ph ON pt.current_phase_id = ph.id
        WHERE p.client_id = $1 AND p.is_active = true
        ORDER BY p.updated_at DESC
        LIMIT 10
      `;
      queryParams = [userId];
    }
    
    const projectsResult = await dbQuery(projectsQuery, queryParams);
    
    // Calculate phase statistics
    const phaseStats = {
      totalProjects: projectsResult.rows.length,
      byPhase: {},
      activePhases: [],
      upcomingMilestones: []
    };
    
    // Initialize phase counts
    BRAND.phaseDefinitions.forEach(phase => {
      phaseStats.byPhase[phase.key] = 0;
    });
    
    // Count projects by phase
    projectsResult.rows.forEach(project => {
      const currentPhase = project.current_phase || 'onboarding';
      if (phaseStats.byPhase[currentPhase] !== undefined) {
        phaseStats.byPhase[currentPhase]++;
      }
      
      // Add to active phases if in progress
      if (project.status === 'in_progress' && project.current_phase) {
        const phaseInfo = BRAND.phaseDefinitions.find(p => p.key === project.current_phase);
        if (phaseInfo) {
          phaseStats.activePhases.push({
            projectId: project.id,
            projectName: project.name,
            phase: phaseInfo.name,
            phaseKey: project.current_phase,
            progress: project.progress_percentage || 0,
            clientName: project.client_name
          });
        }
      }
      
      // Check for upcoming milestones
      if (project.due_date) {
        const dueDate = new Date(project.due_date);
        const daysUntilDue = Math.ceil((dueDate - new Date()) / (1000 * 60 * 60 * 24));
        
        if (daysUntilDue > 0 && daysUntilDue <= 7) {
          phaseStats.upcomingMilestones.push({
            projectId: project.id,
            projectName: project.name,
            dueDate: project.due_date,
            daysUntilDue: daysUntilDue,
            clientName: project.client_name
          });
        }
      }
    });
    
    // Get recent phase transitions (last 7 days)
    const transitionsQuery = `
      SELECT 
        al.project_id,
        al.description,
        al.created_at,
        al.metadata,
        p.name as project_name,
        u.first_name || ' ' || u.last_name as client_name
      FROM activity_log al
      JOIN projects p ON al.project_id = p.id
      LEFT JOIN users u ON p.client_id = u.id AND u.role = 'client'
      WHERE 
        al.action = 'phase_change' 
        AND al.created_at >= CURRENT_TIMESTAMP - INTERVAL '7 days'
        ${userRole === 'client' ? 'AND p.client_id = $1' : ''}
      ORDER BY al.created_at DESC
      LIMIT 5
    `;
    
    const transitionsParams = userRole === 'client' ? [userId] : [];
    const transitionsResult = await dbQuery(transitionsQuery, transitionsParams);
    
    phaseStats.recentTransitions = transitionsResult.rows.map(row => ({
      projectId: row.project_id,
      projectName: row.project_name,
      description: row.description,
      timestamp: row.created_at,
      clientName: row.client_name,
      metadata: row.metadata
    }));
    
    res.json({
      summary: phaseStats,
      phases: BRAND.phaseDefinitions,
      currentTime: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Error fetching phase summary:', error);
    res.status(500).json({ error: 'Failed to fetch phase summary' });
  }
});

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    
    let stats = {};
    
    if (userRole === 'admin') {
      // Admin stats - sees everything
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM projects WHERE is_active = true) as total_projects,
          (SELECT COUNT(*) FROM projects WHERE status = 'in_progress' AND is_active = true) as active_projects,
          (SELECT COUNT(*) FROM users WHERE role = 'client' AND is_active = true) as total_clients,
          (SELECT COUNT(*) FROM users WHERE role = 'client' AND is_active = true) as total_users,
          (SELECT COUNT(*) FROM invoices WHERE status = 'pending') as pending_invoices,
          (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'pending') as pending_revenue,
          (SELECT COUNT(*) FROM messages) as unread_messages,
          (SELECT COUNT(*) FROM files WHERE is_active = true) as total_files,
          (SELECT COUNT(DISTINCT pt.project_id) FROM project_phase_tracking pt WHERE pt.status = 'in_progress') as projects_in_progress,
          (SELECT COUNT(*) FROM activity_log WHERE created_at > NOW() - INTERVAL '24 hours') as recent_activities
      `;
      
      const result = await dbQuery(statsQuery);
      stats = result.rows[0];
      
      // Get additional admin-specific metrics
      const metricsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM projects WHERE created_at > NOW() - INTERVAL '30 days') as new_projects_month,
          (SELECT COUNT(*) FROM invoices WHERE status = 'paid' AND paid_date > NOW() - INTERVAL '30 days') as paid_invoices_month,
          (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE status = 'paid' AND paid_date > NOW() - INTERVAL '30 days') as revenue_month
      `;
      
      const metricsResult = await dbQuery(metricsQuery);
      stats = { ...stats, ...metricsResult.rows[0] };
      
    } else {
      // Client stats - specific to their account
      // For clients, use their user ID as the client_id in projects
      const clientId = userId;
      
      const statsQuery = `
        SELECT 
          (SELECT COUNT(*) FROM projects WHERE client_id = $1 AND is_active = true) as total_projects,
          (SELECT COUNT(*) FROM projects WHERE client_id = $1 AND status = 'in_progress' AND is_active = true) as active_projects,
          (SELECT COUNT(*) FROM invoices WHERE client_id = $1 AND status = 'pending') as pending_invoices,
          (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE client_id = $1 AND status = 'pending') as total_due,
          (SELECT COUNT(*) FROM messages m 
           JOIN projects p ON m.project_id = p.id 
           WHERE p.client_id = $1) as unread_messages,
          (SELECT COUNT(*) FROM files f 
           JOIN projects p ON f.project_id = p.id 
           WHERE p.client_id = $1 AND f.is_active = true) as total_files,
          (SELECT COUNT(DISTINCT pt.project_id) 
           FROM project_phase_tracking pt 
           JOIN projects p ON pt.project_id = p.id
           WHERE p.client_id = $1 AND pt.status = 'in_progress') as projects_in_progress,
          (SELECT COUNT(*) 
           FROM activity_log al
           JOIN projects p ON al.entity_id = p.id AND al.entity_type = 'project'
           WHERE p.client_id = $1 AND al.created_at > NOW() - INTERVAL '7 days') as recent_activities
      `;
      
      const result = await dbQuery(statsQuery, [clientId]);
      stats = result.rows[0];
      
      // Get current phase information for client projects
      const phaseQuery = `
        SELECT 
          p.name as project_name,
          pt.phase_number,
          pt.phase_name,
          p.status as phase_status
        FROM projects p
        LEFT JOIN project_phase_tracking pt ON p.id = pt.project_id
        WHERE p.client_id = $1 
          AND p.is_active = true 
        ORDER BY p.created_at DESC
        LIMIT 3
      `;
      
      const phaseResult = await dbQuery(phaseQuery, [clientId]);
      stats.current_phases = phaseResult.rows;
    }
    
    res.json({ stats });
    
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard statistics' });
  }
});

// GET /api/dashboard/timeline - Get project timeline
router.get('/timeline', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const days = parseInt(req.query.days) || 30;
    
    let timelineQuery;
    let queryParams;
    
    if (userRole === 'admin') {
      timelineQuery = `
        SELECT 
          al.id,
          al.action,
          al.description,
          al.created_at,
          al.project_id,
          al.entity_type,
          al.entity_id,
          p.name as project_name,
          u.first_name || ' ' || u.last_name as user_name
        FROM activity_log al
        LEFT JOIN projects p ON al.project_id = p.id
        LEFT JOIN users u ON al.user_id = u.id
        WHERE al.created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
      queryParams = [];
    } else {
      timelineQuery = `
        SELECT 
          al.id,
          al.action,
          al.description,
          al.created_at,
          al.project_id,
          al.entity_type,
          al.entity_id,
          p.name as project_name
        FROM activity_log al
        LEFT JOIN projects p ON al.project_id = p.id
        WHERE p.client_id = $1 AND al.created_at >= CURRENT_TIMESTAMP - INTERVAL '${days} days'
        ORDER BY al.created_at DESC
        LIMIT 50
      `;
      queryParams = [userId];
    }
    
    const result = await dbQuery(timelineQuery, queryParams);
    
    res.json({
      timeline: result.rows,
      period: days
    });
    
  } catch (error) {
    console.error('Error fetching timeline:', error);
    res.status(500).json({ error: 'Failed to fetch timeline' });
  }
});

export default router;