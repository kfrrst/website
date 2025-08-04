import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { query as dbQuery } from '../config/database.js';
import { handleEmailBounce, handleEmailComplaint, getEmailStatistics } from '../utils/emailService.js';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * Email management routes
 */

// Unsubscribe endpoint
router.get('/unsubscribe/:token', [
  param('token').isUUID()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).send('Invalid unsubscribe link');
  }

  const { token } = req.params;

  try {
    // Find unsubscribe token
    const tokenResult = await dbQuery(
      `SELECT user_id FROM unsubscribe_tokens 
       WHERE token = $1 AND used_at IS NULL AND expires_at > CURRENT_TIMESTAMP`,
      [token]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(400).send('Invalid or expired unsubscribe link');
    }

    const userId = tokenResult.rows[0].user_id;

    // Update user preferences to opt out of all emails
    await dbQuery(
      `UPDATE user_email_preferences 
       SET phase_notifications = false,
           project_notifications = false,
           file_notifications = false,
           marketing_emails = false,
           weekly_summary = false,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $1`,
      [userId]
    );

    // Mark token as used
    await dbQuery(
      `UPDATE unsubscribe_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1`,
      [token]
    );

    // Return unsubscribe confirmation page
    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Unsubscribed - [RE]Print Studios</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
            background-color: #F9F6F1;
            display: flex;
            align-items: center;
            justify-content: center;
            height: 100vh;
            margin: 0;
          }
          .container {
            background-color: #FCFAF7;
            border: 1px solid #F2EDE6;
            border-radius: 8px;
            padding: 40px;
            text-align: center;
            max-width: 500px;
          }
          h1 { color: #2E2E2E; }
          p { color: #666666; line-height: 1.6; }
          a {
            color: #2E2E2E;
            display: inline-block;
            margin-top: 20px;
            padding: 12px 24px;
            background-color: #2E2E2E;
            color: #FCFAF7;
            text-decoration: none;
            border-radius: 4px;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <h1>Unsubscribed Successfully</h1>
          <p>You have been unsubscribed from all [RE]Print Studios emails.</p>
          <p>We're sorry to see you go. If you change your mind, you can update your email preferences in your account settings.</p>
          <a href="/">Return to Home</a>
        </div>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).send('An error occurred. Please try again later.');
  }
});

// Update email preferences (authenticated)
router.put('/preferences', authenticateToken, [
  body('phase_notifications').optional().isBoolean(),
  body('project_notifications').optional().isBoolean(),
  body('file_notifications').optional().isBoolean(),
  body('marketing_emails').optional().isBoolean(),
  body('weekly_summary').optional().isBoolean()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const userId = req.user.id;
    const updates = req.body;

    // Build update query
    const fields = Object.keys(updates);
    const values = fields.map((field, index) => `${field} = $${index + 2}`);
    const query = `
      UPDATE user_email_preferences 
      SET ${values.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE user_id = $1
      RETURNING *
    `;

    const result = await dbQuery(query, [userId, ...Object.values(updates)]);

    if (result.rows.length === 0) {
      // Create preferences if they don't exist
      await dbQuery(
        `INSERT INTO user_email_preferences (user_id) VALUES ($1)`,
        [userId]
      );
      
      // Try update again
      const retryResult = await dbQuery(query, [userId, ...Object.values(updates)]);
      return res.json(retryResult.rows[0]);
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Update preferences error:', error);
    res.status(500).json({ error: 'Failed to update email preferences' });
  }
});

// Get email preferences (authenticated)
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const result = await dbQuery(
      `SELECT * FROM user_email_preferences WHERE user_id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      // Return defaults
      return res.json({
        phase_notifications: true,
        project_notifications: true,
        file_notifications: true,
        marketing_emails: false,
        weekly_summary: true
      });
    }

    res.json(result.rows[0]);

  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({ error: 'Failed to get email preferences' });
  }
});

// Webhook endpoint for email bounces (from email service provider)
router.post('/webhook/bounce', [
  body('email_id').notEmpty(),
  body('email').isEmail(),
  body('bounce_type').notEmpty()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    // Verify webhook signature if configured
    // This would depend on your email service provider
    
    await handleEmailBounce(req.body.email_id, req.body);
    
    // Add to suppression list if hard bounce
    if (req.body.bounce_type === 'hard') {
      await dbQuery(
        `INSERT INTO email_suppression_list (email, reason, metadata)
         VALUES ($1, 'bounce', $2)
         ON CONFLICT (email) DO UPDATE SET metadata = email_suppression_list.metadata || $2`,
        [req.body.email, JSON.stringify(req.body)]
      );
    }

    res.json({ success: true });

  } catch (error) {
    console.error('Bounce webhook error:', error);
    res.status(500).json({ error: 'Failed to process bounce' });
  }
});

// Webhook endpoint for email complaints
router.post('/webhook/complaint', [
  body('email_id').notEmpty(),
  body('email').isEmail()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    await handleEmailComplaint(req.body.email_id, req.body);
    
    // Add to suppression list
    await dbQuery(
      `INSERT INTO email_suppression_list (email, reason, metadata)
       VALUES ($1, 'complaint', $2)
       ON CONFLICT (email) DO UPDATE SET metadata = email_suppression_list.metadata || $2`,
      [req.body.email, JSON.stringify(req.body)]
    );

    res.json({ success: true });

  } catch (error) {
    console.error('Complaint webhook error:', error);
    res.status(500).json({ error: 'Failed to process complaint' });
  }
});

// Get email statistics (admin only)
router.get('/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { start_date, end_date, template } = req.query;
    
    const stats = await getEmailStatistics({
      startDate: start_date,
      endDate: end_date,
      template
    });

    res.json(stats);

  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: 'Failed to get email statistics' });
  }
});

// Get email log (admin only)
router.get('/log', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 50, offset = 0, status, template } = req.query;

    let query = `
      SELECT * FROM email_log 
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    if (template) {
      params.push(template);
      query += ` AND template_name = $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limit, offset);

    const result = await dbQuery(query, params);

    res.json({
      emails: result.rows,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });

  } catch (error) {
    console.error('Get log error:', error);
    res.status(500).json({ error: 'Failed to get email log' });
  }
});

export default router;