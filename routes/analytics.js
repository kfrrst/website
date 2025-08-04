import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery } from '../config/database.js';

const router = express.Router();

// GET /api/analytics/phases - Phase analytics
router.get('/phases', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get phase completion stats
    const phaseStats = await dbQuery(`
      SELECT 
        pp.name as phase_name,
        pp.phase_key,
        COUNT(*) as total_instances,
        COUNT(CASE WHEN pp.status = 'completed' THEN 1 END) as completed,
        COUNT(CASE WHEN pp.status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN pp.status = 'in_progress' THEN 1 END) as in_progress,
        COUNT(CASE WHEN pp.status = 'not_started' THEN 1 END) as not_started,
        AVG(
          CASE 
            WHEN pp.completed_at IS NOT NULL AND pp.started_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (pp.completed_at - pp.started_at)) / 86400
            ELSE NULL
          END
        ) as avg_duration_days
      FROM project_phases pp
      GROUP BY pp.name, pp.phase_key
      ORDER BY MIN(pp.order_index)
    `);

    // Get approval request stats
    const approvalStats = await dbQuery(`
      SELECT 
        COUNT(*) as total_approvals,
        COUNT(CASE WHEN status = 'approved' THEN 1 END) as approved,
        COUNT(CASE WHEN status = 'rejected' THEN 1 END) as rejected,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending,
        AVG(
          CASE 
            WHEN status != 'pending' AND updated_at IS NOT NULL
            THEN EXTRACT(EPOCH FROM (updated_at - created_at)) / 3600
            ELSE NULL
          END
        ) as avg_response_time_hours
      FROM phase_approvals
      WHERE created_at > NOW() - INTERVAL '30 days'
    `);

    res.json({
      phaseStats: phaseStats.rows,
      approvalStats: approvalStats.rows[0] || {
        total_approvals: 0,
        approved: 0,
        rejected: 0,
        pending: 0,
        avg_response_time_hours: 0
      }
    });
  } catch (error) {
    console.error('Error fetching phase analytics:', error);
    res.status(500).json({ error: 'Failed to fetch phase analytics' });
  }
});

// GET /api/analytics/projects - Project analytics
router.get('/projects', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get project status breakdown
    const projectStats = await dbQuery(`
      SELECT 
        status,
        COUNT(*) as count,
        AVG(progress) as avg_progress
      FROM projects
      GROUP BY status
    `);

    // Get monthly project creation trend
    const monthlyTrend = await dbQuery(`
      SELECT 
        DATE_TRUNC('month', created_at) as month,
        COUNT(*) as projects_created
      FROM projects
      WHERE created_at > NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month DESC
    `);

    // Get project completion time stats
    const completionStats = await dbQuery(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as avg_completion_days,
        MIN(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as min_completion_days,
        MAX(EXTRACT(EPOCH FROM (updated_at - created_at)) / 86400) as max_completion_days
      FROM projects
      WHERE status = 'completed'
      AND updated_at IS NOT NULL
    `);

    res.json({
      statusBreakdown: projectStats.rows,
      monthlyTrend: monthlyTrend.rows,
      completionStats: completionStats.rows[0] || {
        avg_completion_days: 0,
        min_completion_days: 0,
        max_completion_days: 0
      }
    });
  } catch (error) {
    console.error('Error fetching project analytics:', error);
    res.status(500).json({ error: 'Failed to fetch project analytics' });
  }
});

// GET /api/analytics/revenue - Revenue analytics
router.get('/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get monthly revenue
    const monthlyRevenue = await dbQuery(`
      SELECT 
        DATE_TRUNC('month', paid_at) as month,
        SUM(total_amount) as revenue,
        COUNT(*) as invoice_count
      FROM invoices
      WHERE status = 'paid'
      AND paid_at > NOW() - INTERVAL '12 months'
      GROUP BY month
      ORDER BY month DESC
    `);

    // Get revenue by project
    const projectRevenue = await dbQuery(`
      SELECT 
        p.name as project_name,
        SUM(i.total_amount) as total_revenue,
        COUNT(i.id) as invoice_count,
        MAX(i.paid_at) as last_payment
      FROM projects p
      JOIN invoices i ON p.id = i.project_id
      WHERE i.status = 'paid'
      GROUP BY p.id, p.name
      ORDER BY total_revenue DESC
      LIMIT 10
    `);

    // Get payment stats
    const paymentStats = await dbQuery(`
      SELECT 
        AVG(EXTRACT(EPOCH FROM (paid_at - created_at)) / 86400) as avg_payment_days,
        COUNT(CASE WHEN paid_at <= due_date THEN 1 END) as on_time_payments,
        COUNT(CASE WHEN paid_at > due_date THEN 1 END) as late_payments,
        COUNT(*) as total_payments
      FROM invoices
      WHERE status = 'paid'
      AND paid_at IS NOT NULL
    `);

    res.json({
      monthlyRevenue: monthlyRevenue.rows,
      topProjects: projectRevenue.rows,
      paymentStats: paymentStats.rows[0] || {
        avg_payment_days: 0,
        on_time_payments: 0,
        late_payments: 0,
        total_payments: 0
      }
    });
  } catch (error) {
    console.error('Error fetching revenue analytics:', error);
    res.status(500).json({ error: 'Failed to fetch revenue analytics' });
  }
});

// GET /api/analytics/clients - Client analytics
router.get('/clients', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get client activity stats
    const clientStats = await dbQuery(`
      SELECT 
        c.id,
        c.name,
        c.email,
        COUNT(DISTINCT p.id) as project_count,
        SUM(i.total_amount) FILTER (WHERE i.status = 'paid') as total_revenue,
        MAX(p.created_at) as last_project_date,
        AVG(p.progress) as avg_project_progress
      FROM clients c
      LEFT JOIN projects p ON c.id = p.client_id
      LEFT JOIN invoices i ON p.id = i.project_id
      GROUP BY c.id, c.name, c.email
      ORDER BY total_revenue DESC NULLS LAST
      LIMIT 20
    `);

    // Get client retention metrics
    const retentionStats = await dbQuery(`
      SELECT 
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT CASE 
          WHEN EXISTS (
            SELECT 1 FROM projects p2 
            WHERE p2.client_id = c.id 
            AND p2.created_at > NOW() - INTERVAL '90 days'
          ) THEN c.id 
        END) as active_clients_90d,
        COUNT(DISTINCT CASE 
          WHEN project_count > 1 THEN c.id 
        END) as repeat_clients
      FROM (
        SELECT 
          c.id,
          COUNT(p.id) as project_count
        FROM clients c
        LEFT JOIN projects p ON c.id = p.client_id
        GROUP BY c.id
      ) c
    `);

    res.json({
      topClients: clientStats.rows,
      retentionMetrics: retentionStats.rows[0] || {
        total_clients: 0,
        active_clients_90d: 0,
        repeat_clients: 0
      }
    });
  } catch (error) {
    console.error('Error fetching client analytics:', error);
    res.status(500).json({ error: 'Failed to fetch client analytics' });
  }
});

// GET /api/analytics/dashboard - Dashboard summary
router.get('/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Get key metrics
    const metrics = await dbQuery(`
      SELECT 
        (SELECT COUNT(*) FROM projects WHERE status = 'active') as active_projects,
        (SELECT COUNT(*) FROM clients WHERE status = 'active') as active_clients,
        (SELECT SUM(total_amount) FROM invoices WHERE status = 'paid' AND paid_at > DATE_TRUNC('month', CURRENT_DATE)) as monthly_revenue,
        (SELECT COUNT(*) FROM inquiries WHERE status = 'new') as new_inquiries,
        (SELECT COUNT(*) FROM phase_approvals WHERE status = 'pending') as pending_approvals,
        (SELECT AVG(progress) FROM projects WHERE status = 'active') as avg_project_progress
    `);

    res.json({
      metrics: metrics.rows[0] || {
        active_projects: 0,
        active_clients: 0,
        monthly_revenue: 0,
        new_inquiries: 0,
        pending_approvals: 0,
        avg_project_progress: 0
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard analytics:', error);
    res.status(500).json({ error: 'Failed to fetch dashboard analytics' });
  }
});

export default router;