/**
 * Notification Service for [RE]Print Studios
 * Handles in-app notifications
 */

import { query as dbQuery } from '../config/database.js';

/**
 * Create a new notification
 */
export async function createNotification(data) {
  try {
    const result = await dbQuery(`
      INSERT INTO notifications 
      (user_id, type, title, message, link, metadata, is_read)
      VALUES ($1, $2, $3, $4, $5, $6, false)
      RETURNING *
    `, [
      data.user_id,
      data.type,
      data.title,
      data.message,
      data.link || null,
      JSON.stringify(data.metadata || {}),
    ]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Get notifications for a user
 */
export async function getUserNotifications(userId, options = {}) {
  const { limit = 20, offset = 0, unreadOnly = false } = options;
  
  try {
    let query = `
      SELECT * FROM notifications 
      WHERE user_id = $1
    `;
    
    if (unreadOnly) {
      query += ' AND is_read = false';
    }
    
    query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`;
    
    const result = await dbQuery(query, [userId, limit, offset]);
    
    return result.rows;
  } catch (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId, userId) {
  try {
    const result = await dbQuery(`
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `, [notificationId, userId]);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

/**
 * Mark all notifications as read for a user
 */
export async function markAllNotificationsRead(userId) {
  try {
    const result = await dbQuery(`
      UPDATE notifications 
      SET is_read = true, read_at = CURRENT_TIMESTAMP
      WHERE user_id = $1 AND is_read = false
      RETURNING COUNT(*)
    `, [userId]);
    
    return result.rows[0].count;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
}

/**
 * Get unread notification count
 */
export async function getUnreadNotificationCount(userId) {
  try {
    const result = await dbQuery(`
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `, [userId]);
    
    return parseInt(result.rows[0].count);
  } catch (error) {
    console.error('Error getting unread notification count:', error);
    return 0;
  }
}

/**
 * Delete old notifications
 */
export async function deleteOldNotifications(daysToKeep = 30) {
  try {
    const result = await dbQuery(`
      DELETE FROM notifications 
      WHERE created_at < NOW() - INTERVAL '${daysToKeep} days'
      RETURNING COUNT(*)
    `);
    
    return result.rows[0].count;
  } catch (error) {
    console.error('Error deleting old notifications:', error);
    throw error;
  }
}

/**
 * Create notifications table migration
 */
export async function createNotificationsTable() {
  try {
    await dbQuery(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        link VARCHAR(500),
        metadata JSONB DEFAULT '{}',
        is_read BOOLEAN DEFAULT false,
        read_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        
        INDEX idx_notifications_user (user_id),
        INDEX idx_notifications_unread (user_id, is_read),
        INDEX idx_notifications_created (created_at DESC)
      )
    `);
    
    console.log('Notifications table created successfully');
  } catch (error) {
    console.error('Error creating notifications table:', error);
  }
}