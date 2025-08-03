import express from 'express';
import { query } from '../config/database.js';
import { authenticateToken } from '../middleware/auth.js';
import { sendNotificationToUser } from '../utils/socketHandlers.js';

const router = express.Router();

/**
 * Get all notifications for the authenticated user
 * Supports filtering and pagination
 */
router.get('/', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      page = 1, 
      limit = 20, 
      type, 
      is_read, 
      priority,
      sort = 'created_at',
      order = 'DESC'
    } = req.query;

    // Build WHERE clause
    let whereConditions = ['user_id = $1'];
    let queryParams = [userId];
    let paramCount = 1;

    if (type) {
      paramCount++;
      whereConditions.push(`type = $${paramCount}`);
      queryParams.push(type);
    }

    if (is_read !== undefined) {
      paramCount++;
      whereConditions.push(`is_read = $${paramCount}`);
      queryParams.push(is_read === 'true');
    }

    if (priority) {
      paramCount++;
      whereConditions.push(`priority = $${paramCount}`);
      queryParams.push(priority);
    }

    // Add pagination
    const offset = (page - 1) * limit;
    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const whereClause = whereConditions.join(' AND ');
    const orderClause = `ORDER BY ${sort} ${order}`;

    // Get notifications
    const notificationsQuery = `
      SELECT 
        id, type, title, content, action_url, is_read, read_at, 
        priority, expires_at, metadata, created_at
      FROM notifications 
      WHERE ${whereClause} 
      ${orderClause}
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `;

    const notifications = await query(notificationsQuery, queryParams);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM notifications 
      WHERE ${whereClause}
    `;
    const countParams = queryParams.slice(0, -2); // Remove limit and offset
    const countResult = await query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].total);

    // Get unread count
    const unreadCountQuery = `
      SELECT COUNT(*) as unread_count 
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `;
    const unreadResult = await query(unreadCountQuery, [userId]);
    const unreadCount = parseInt(unreadResult.rows[0].unread_count);

    res.json({
      notifications: notifications.rows,
      pagination: {
        current_page: parseInt(page),
        per_page: parseInt(limit),
        total_items: total,
        total_pages: Math.ceil(total / limit),
        has_next: offset + parseInt(limit) < total,
        has_prev: page > 1
      },
      unread_count: unreadCount
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

/**
 * Get unread notification count
 */
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const result = await query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = false',
      [userId]
    );
    
    res.json({ 
      unread_count: parseInt(result.rows[0].count) 
    });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

/**
 * Mark notification as read
 */
router.patch('/:id/read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as read',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
});

/**
 * Mark notification as unread
 */
router.patch('/:id/unread', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(
      `UPDATE notifications 
       SET is_read = false, read_at = NULL 
       WHERE id = $1 AND user_id = $2 
       RETURNING *`,
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({
      message: 'Notification marked as unread',
      notification: result.rows[0]
    });
  } catch (error) {
    console.error('Error marking notification as unread:', error);
    res.status(500).json({ error: 'Failed to mark notification as unread' });
  }
});

/**
 * Mark all notifications as read
 */
router.patch('/mark-all-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `UPDATE notifications 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE user_id = $1 AND is_read = false 
       RETURNING id`,
      [userId]
    );

    res.json({
      message: `Marked ${result.rows.length} notifications as read`,
      updated_count: result.rows.length
    });
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
});

/**
 * Delete notification
 */
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const notificationId = req.params.id;

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [notificationId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }

    res.json({ message: 'Notification deleted successfully' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Failed to delete notification' });
  }
});

/**
 * Clear all read notifications (older than 30 days)
 */
router.delete('/clear-read', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `DELETE FROM notifications 
       WHERE user_id = $1 
       AND is_read = true 
       AND read_at < CURRENT_TIMESTAMP - INTERVAL '30 days'
       RETURNING id`,
      [userId]
    );

    res.json({
      message: `Cleared ${result.rows.length} old read notifications`,
      cleared_count: result.rows.length
    });
  } catch (error) {
    console.error('Error clearing read notifications:', error);
    res.status(500).json({ error: 'Failed to clear read notifications' });
  }
});

/**
 * Get user notification preferences
 */
router.get('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      `SELECT * FROM notification_preferences WHERE user_id = $1`,
      [userId]
    );

    // If no preferences exist, return defaults
    if (result.rows.length === 0) {
      const defaultPreferences = {
        user_id: userId,
        email_new_messages: true,
        email_invoice_reminders: true,
        email_project_updates: true,
        email_file_uploads: true,
        email_payment_confirmations: true,
        in_app_new_messages: true,
        in_app_invoice_reminders: true,
        in_app_project_updates: true,
        in_app_file_uploads: true,
        in_app_payment_confirmations: true,
        sms_urgent_only: false,
        sms_phone_number: null
      };

      res.json({ preferences: defaultPreferences });
    } else {
      res.json({ preferences: result.rows[0] });
    }
  } catch (error) {
    console.error('Error fetching notification preferences:', error);
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

/**
 * Update user notification preferences
 */
router.put('/preferences', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      email_new_messages,
      email_invoice_reminders,
      email_project_updates,
      email_file_uploads,
      email_payment_confirmations,
      in_app_new_messages,
      in_app_invoice_reminders,
      in_app_project_updates,
      in_app_file_uploads,
      in_app_payment_confirmations,
      sms_urgent_only,
      sms_phone_number
    } = req.body;

    // Upsert preferences
    const result = await query(
      `INSERT INTO notification_preferences (
        user_id, email_new_messages, email_invoice_reminders, 
        email_project_updates, email_file_uploads, email_payment_confirmations,
        in_app_new_messages, in_app_invoice_reminders, in_app_project_updates,
        in_app_file_uploads, in_app_payment_confirmations, sms_urgent_only, sms_phone_number
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (user_id) DO UPDATE SET
        email_new_messages = EXCLUDED.email_new_messages,
        email_invoice_reminders = EXCLUDED.email_invoice_reminders,
        email_project_updates = EXCLUDED.email_project_updates,
        email_file_uploads = EXCLUDED.email_file_uploads,
        email_payment_confirmations = EXCLUDED.email_payment_confirmations,
        in_app_new_messages = EXCLUDED.in_app_new_messages,
        in_app_invoice_reminders = EXCLUDED.in_app_invoice_reminders,
        in_app_project_updates = EXCLUDED.in_app_project_updates,
        in_app_file_uploads = EXCLUDED.in_app_file_uploads,
        in_app_payment_confirmations = EXCLUDED.in_app_payment_confirmations,
        sms_urgent_only = EXCLUDED.sms_urgent_only,
        sms_phone_number = EXCLUDED.sms_phone_number,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`,
      [
        userId, email_new_messages, email_invoice_reminders,
        email_project_updates, email_file_uploads, email_payment_confirmations,
        in_app_new_messages, in_app_invoice_reminders, in_app_project_updates,
        in_app_file_uploads, in_app_payment_confirmations, sms_urgent_only, sms_phone_number
      ]
    );

    res.json({
      message: 'Notification preferences updated successfully',
      preferences: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating notification preferences:', error);
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

/**
 * Create a new notification (for admin use)
 */
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { user_id, type, title, content, action_url, priority = 'normal', metadata = {} } = req.body;

    // Only admins can create notifications for other users
    if (req.user.role !== 'admin' && user_id !== req.user.id) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const result = await query(
      `INSERT INTO notifications (user_id, type, title, content, action_url, priority, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, type, title, content, action_url, priority, JSON.stringify(metadata)]
    );

    const notification = result.rows[0];

    // Send real-time notification if user is online
    const io = req.app.get('io');
    if (io) {
      sendNotificationToUser(io, user_id, {
        id: notification.id,
        type: notification.type,
        title: notification.title,
        content: notification.content,
        action_url: notification.action_url,
        priority: notification.priority,
        created_at: notification.created_at
      });
    }

    res.status(201).json({
      message: 'Notification created successfully',
      notification
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    res.status(500).json({ error: 'Failed to create notification' });
  }
});

export default router;