import express from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { getOnlineUsers, getUserPresence } from '../utils/socketHandlers.js';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for file attachments
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadPath = path.join(__dirname, '../uploads/messages');
    try {
      await fs.mkdir(uploadPath, { recursive: true });
      cb(null, uploadPath);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // max 5 files
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt|zip|rar/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// GET /api/messages/conversations - List conversations
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    console.log('Conversations API - User:', { userId, email: req.user.email });
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // Get conversations with last message and unread count
    const conversationsQuery = `
      WITH conversation_participants AS (
        SELECT DISTINCT 
          CASE 
            WHEN sender_id = $1 THEN recipient_id
            ELSE sender_id
          END as other_user_id,
          GREATEST(MAX(created_at) FILTER (WHERE sender_id = $1), 
                   MAX(created_at) FILTER (WHERE recipient_id = $1)) as last_activity
        FROM messages
        WHERE sender_id = $1 OR recipient_id = $1
        GROUP BY other_user_id
      ),
      last_messages AS (
        SELECT DISTINCT ON (cp.other_user_id)
          cp.other_user_id,
          m.id,
          m.content,
          m.created_at,
          m.sender_id,
          m.subject,
          m.message_type,
          m.attachments
        FROM conversation_participants cp
        JOIN messages m ON (
          (m.sender_id = $1 AND m.recipient_id = cp.other_user_id) OR
          (m.sender_id = cp.other_user_id AND m.recipient_id = $1)
        )
        ORDER BY cp.other_user_id, m.created_at DESC
      ),
      unread_counts AS (
        SELECT 
          sender_id as other_user_id,
          COUNT(*) as unread_count
        FROM messages
        WHERE recipient_id = $1 AND is_read = false
        GROUP BY sender_id
      )
      SELECT 
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.company_name,
        u.avatar_url,
        lm.content as last_message,
        lm.created_at as last_message_at,
        lm.sender_id as last_sender_id,
        lm.subject as last_subject,
        lm.message_type,
        lm.attachments,
        COALESCE(uc.unread_count, 0) as unread_count
      FROM conversation_participants cp
      JOIN users u ON u.id = cp.other_user_id
      LEFT JOIN last_messages lm ON lm.other_user_id = cp.other_user_id
      LEFT JOIN unread_counts uc ON uc.other_user_id = cp.other_user_id
      ORDER BY cp.last_activity DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await query(conversationsQuery, [userId, limit, offset]);
    console.log('Conversations result count:', result.rows.length);

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT 
        CASE 
          WHEN sender_id = $1 THEN recipient_id
          ELSE sender_id
        END
      ) as total
      FROM messages
      WHERE sender_id = $1 OR recipient_id = $1
    `;
    const countResult = await query(countQuery, [userId]);

    res.json({
      conversations: result.rows,
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// GET /api/messages/conversation/:userId - Get conversation history
router.get('/conversation/:userId', authenticateToken, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const offset = (page - 1) * limit;

    // Verify other user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [otherUserId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get conversation messages
    const messagesQuery = `
      SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        recipient.email as recipient_email,
        recipient.avatar_url as recipient_avatar
      FROM messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN users recipient ON recipient.id = m.recipient_id
      WHERE 
        (m.sender_id = $1 AND m.recipient_id = $2) OR
        (m.sender_id = $2 AND m.recipient_id = $1)
      ORDER BY m.created_at DESC
      LIMIT $3 OFFSET $4
    `;

    const result = await query(messagesQuery, [currentUserId, otherUserId, limit, offset]);

    // Mark messages as read
    await query(
      'UPDATE messages SET is_read = true, read_at = CURRENT_TIMESTAMP WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false',
      [currentUserId, otherUserId]
    );

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages
      WHERE 
        (sender_id = $1 AND recipient_id = $2) OR
        (sender_id = $2 AND recipient_id = $1)
    `;
    const countResult = await query(countQuery, [currentUserId, otherUserId]);

    res.json({
      messages: result.rows.reverse(), // Reverse to show oldest first
      pagination: {
        page,
        limit,
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({ error: 'Failed to fetch conversation' });
  }
});

// POST /api/messages/send - Send message
router.post('/send', authenticateToken, upload.array('attachments', 5), async (req, res) => {
  const client = await beginTransaction();
  
  try {
    const senderId = req.user.id;
    const { recipient_id, subject, content, message_type = 'general', priority = 'normal', project_id } = req.body;

    // Validate required fields
    if (!recipient_id || !content) {
      return res.status(400).json({ error: 'Recipient and content are required' });
    }

    // Verify recipient exists
    const recipientCheck = await client.query('SELECT id FROM users WHERE id = $1', [recipient_id]);
    if (recipientCheck.rows.length === 0) {
      await rollbackTransaction(client);
      return res.status(404).json({ error: 'Recipient not found' });
    }

    // Process attachments
    let attachments = null;
    if (req.files && req.files.length > 0) {
      attachments = req.files.map(file => ({
        filename: file.originalname,
        stored_name: file.filename,
        path: file.path,
        size: file.size,
        mimetype: file.mimetype
      }));
    }

    // Insert message
    const insertQuery = `
      INSERT INTO messages (
        sender_id, recipient_id, subject, content, message_type, 
        priority, project_id, attachments
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await client.query(insertQuery, [
      senderId, recipient_id, subject, content, message_type,
      priority, project_id || null, attachments ? JSON.stringify(attachments) : null
    ]);

    const message = result.rows[0];

    // Get sender and recipient details for real-time notification
    const detailsQuery = `
      SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        recipient.email as recipient_email,
        recipient.avatar_url as recipient_avatar
      FROM messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN users recipient ON recipient.id = m.recipient_id
      WHERE m.id = $1
    `;

    const messageDetails = await client.query(detailsQuery, [message.id]);
    await commitTransaction(client);

    const fullMessage = messageDetails.rows[0];

    // Emit real-time message via Socket.io
    const io = req.app.get('io');
    if (io) {
      // Emit to recipient
      io.to(`user_${recipient_id}`).emit('new_message', fullMessage);
      
      // Emit to sender for confirmation
      io.to(`user_${senderId}`).emit('message_sent', fullMessage);

      // Update unread count for recipient
      const unreadCountQuery = await query(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false',
        [recipient_id]
      );
      io.to(`user_${recipient_id}`).emit('unread_count_updated', { 
        count: parseInt(unreadCountQuery.rows[0].count) 
      });
    }

    res.status(201).json({
      message: fullMessage,
      success: true
    });

  } catch (error) {
    await rollbackTransaction(client);
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// PUT /api/messages/:id/read - Mark message as read
router.put('/:id/read', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    // Update message read status
    const result = await query(
      `UPDATE messages 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE id = $1 AND recipient_id = $2 AND is_read = false
       RETURNING *`,
      [messageId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or already read' });
    }

    const message = result.rows[0];

    // Emit read receipt via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${message.sender_id}`).emit('message_read', {
        messageId: message.id,
        readAt: message.read_at,
        readBy: userId
      });

      // Update unread count for current user
      const unreadCountQuery = await query(
        'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false',
        [userId]
      );
      io.to(`user_${userId}`).emit('unread_count_updated', { 
        count: parseInt(unreadCountQuery.rows[0].count) 
      });
    }

    res.json({ message: 'Message marked as read', success: true });

  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

// DELETE /api/messages/:id - Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const messageId = req.params.id;
    const userId = req.user.id;

    // Check if user owns the message or is admin
    const messageCheck = await query(
      'SELECT * FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)',
      [messageId, userId]
    );

    if (messageCheck.rows.length === 0 && req.user.role !== 'admin') {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    const message = messageCheck.rows[0];

    // Delete attachments from filesystem if they exist
    if (message.attachments) {
      const attachments = JSON.parse(message.attachments);
      for (const attachment of attachments) {
        try {
          await fs.unlink(attachment.path);
        } catch (err) {
          console.warn('Failed to delete attachment file:', attachment.path);
        }
      }
    }

    // Delete message
    await query('DELETE FROM messages WHERE id = $1', [messageId]);

    // Emit deletion notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      const otherUserId = message.sender_id === userId ? message.recipient_id : message.sender_id;
      io.to(`user_${otherUserId}`).emit('message_deleted', { messageId });
    }

    res.json({ message: 'Message deleted successfully', success: true });

  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// GET /api/messages/unread-count - Get unread count
router.get('/unread-count', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false',
      [userId]
    );

    res.json({ 
      unread_count: parseInt(result.rows[0].count),
      success: true 
    });

  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
});

// GET /api/messages/search - Search messages
router.get('/search', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q: searchTerm, type, project_id, page = 1, limit = 20 } = req.query;
    
    if (!searchTerm) {
      return res.status(400).json({ error: 'Search term is required' });
    }

    const offset = (page - 1) * limit;
    let whereConditions = ['(sender_id = $1 OR recipient_id = $1)'];
    let params = [userId];
    let paramIndex = 2;

    // Add search term
    whereConditions.push(`(content ILIKE $${paramIndex} OR subject ILIKE $${paramIndex})`);
    params.push(`%${searchTerm}%`);
    paramIndex++;

    // Add optional filters
    if (type) {
      whereConditions.push(`message_type = $${paramIndex}`);
      params.push(type);
      paramIndex++;
    }

    if (project_id) {
      whereConditions.push(`project_id = $${paramIndex}`);
      params.push(project_id);
      paramIndex++;
    }

    const searchQuery = `
      SELECT 
        m.*,
        sender.first_name as sender_first_name,
        sender.last_name as sender_last_name,
        sender.email as sender_email,
        sender.avatar_url as sender_avatar,
        recipient.first_name as recipient_first_name,
        recipient.last_name as recipient_last_name,
        recipient.email as recipient_email,
        recipient.avatar_url as recipient_avatar,
        p.name as project_name
      FROM messages m
      JOIN users sender ON sender.id = m.sender_id
      JOIN users recipient ON recipient.id = m.recipient_id
      LEFT JOIN projects p ON p.id = m.project_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY m.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await query(searchQuery, params);

    // Get total count
    const countQuery = `
      SELECT COUNT(*) as total
      FROM messages m
      WHERE ${whereConditions.join(' AND ')}
    `;

    const countResult = await query(countQuery, params.slice(0, -2));

    res.json({
      messages: result.rows,
      search_term: searchTerm,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: parseInt(countResult.rows[0].total),
        totalPages: Math.ceil(countResult.rows[0].total / limit)
      }
    });

  } catch (error) {
    console.error('Error searching messages:', error);
    res.status(500).json({ error: 'Failed to search messages' });
  }
});

// GET /api/messages/attachment/:messageId/:filename - Download attachment
router.get('/attachment/:messageId/:filename', authenticateToken, async (req, res) => {
  try {
    const { messageId, filename } = req.params;
    const userId = req.user.id;

    // Check if user has access to the message
    const messageCheck = await query(
      'SELECT * FROM messages WHERE id = $1 AND (sender_id = $2 OR recipient_id = $2)',
      [messageId, userId]
    );

    if (messageCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Message not found or access denied' });
    }

    const message = messageCheck.rows[0];
    
    if (!message.attachments) {
      return res.status(404).json({ error: 'No attachments found' });
    }

    const attachments = JSON.parse(message.attachments);
    const attachment = attachments.find(att => att.filename === filename);

    if (!attachment) {
      return res.status(404).json({ error: 'Attachment not found' });
    }

    // Check if file exists
    const filePath = attachment.path;
    try {
      await fs.access(filePath);
    } catch (err) {
      return res.status(404).json({ error: 'File not found on server' });
    }

    // Set appropriate headers
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.filename}"`);
    res.setHeader('Content-Type', attachment.mimetype);

    // Send file
    res.sendFile(path.resolve(filePath));

  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: 'Failed to download attachment' });
  }
});

// GET /api/messages/presence/online - Get online users
router.get('/presence/online', authenticateToken, async (req, res) => {
  try {
    const onlineUsers = getOnlineUsers();
    
    // Get user details for online users
    if (onlineUsers.length > 0) {
      const userIds = onlineUsers.map(u => u.userId);
      const usersQuery = `
        SELECT id, first_name, last_name, email, avatar_url, company_name
        FROM users 
        WHERE id = ANY($1)
      `;
      
      const usersResult = await query(usersQuery, [userIds]);
      
      // Combine user details with presence info
      const enrichedUsers = usersResult.rows.map(user => {
        const presence = onlineUsers.find(p => p.userId === user.id);
        return {
          ...user,
          status: presence.status,
          lastActivity: presence.lastActivity
        };
      });
      
      res.json({ online_users: enrichedUsers });
    } else {
      res.json({ online_users: [] });
    }
  } catch (error) {
    console.error('Error fetching online users:', error);
    res.status(500).json({ error: 'Failed to fetch online users' });
  }
});

// GET /api/messages/presence/:userId - Get user presence status
router.get('/presence/:userId', authenticateToken, async (req, res) => {
  try {
    const userId = req.params.userId;
    
    // Verify user exists
    const userCheck = await query('SELECT id FROM users WHERE id = $1', [userId]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const presence = getUserPresence(userId);
    
    res.json({
      userId,
      status: presence.status,
      lastActivity: presence.lastActivity
    });
  } catch (error) {
    console.error('Error fetching user presence:', error);
    res.status(500).json({ error: 'Failed to fetch user presence' });
  }
});

// POST /api/messages/broadcast - Send broadcast message (admin only)
router.post('/broadcast', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const senderId = req.user.id;
    const { subject, content, message_type = 'general', priority = 'normal', project_id } = req.body;

    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // Get all active users (excluding sender)
    const usersResult = await query(
      'SELECT id FROM users WHERE is_active = true AND id != $1',
      [senderId]
    );

    if (usersResult.rows.length === 0) {
      return res.status(400).json({ error: 'No active users to broadcast to' });
    }

    const client = await beginTransaction();
    const messages = [];

    try {
      // Insert message for each user
      for (const user of usersResult.rows) {
        const insertQuery = `
          INSERT INTO messages (
            sender_id, recipient_id, subject, content, message_type, 
            priority, project_id
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          senderId, user.id, subject, content, message_type,
          priority, project_id || null
        ]);

        messages.push(result.rows[0]);
      }

      await commitTransaction(client);

      // Get full message details for real-time notification
      const messageDetailsQuery = `
        SELECT 
          m.*,
          sender.first_name as sender_first_name,
          sender.last_name as sender_last_name,
          sender.email as sender_email,
          sender.avatar_url as sender_avatar
        FROM messages m
        JOIN users sender ON sender.id = m.sender_id
        WHERE m.id = ANY($1)
      `;

      const messageIds = messages.map(m => m.id);
      const detailsResult = await query(messageDetailsQuery, [messageIds]);

      // Emit real-time notifications via Socket.io
      const io = req.app.get('io');
      if (io) {
        detailsResult.rows.forEach(message => {
          io.to(`user_${message.recipient_id}`).emit('new_message', message);
        });
      }

      res.status(201).json({
        message: 'Broadcast sent successfully',
        recipient_count: messages.length,
        success: true
      });

    } catch (error) {
      await rollbackTransaction(client);
      throw error;
    }

  } catch (error) {
    console.error('Error sending broadcast:', error);
    res.status(500).json({ error: 'Failed to send broadcast message' });
  }
});

export default router;