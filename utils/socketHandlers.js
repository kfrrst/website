import jwt from 'jsonwebtoken';
import { query } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Store user sessions and their presence status
const userSessions = new Map(); // userId -> { socketId, status, lastActivity }
const socketUsers = new Map(); // socketId -> userId
const typingUsers = new Map(); // conversationId -> Set of userIds

/**
 * Socket authentication middleware
 */
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.authorization?.split(' ')[1];
    
    console.log('Socket.IO authentication attempt:', {
      hasAuthToken: !!socket.handshake.auth.token,
      hasAuthHeader: !!socket.handshake.headers.authorization,
      tokenPreview: token ? token.substring(0, 20) + '...' : 'none'
    });
    
    if (!token) {
      console.warn('Socket.IO authentication failed: No token provided');
      return next(new Error('Authentication token required'));
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    console.log('Socket.IO token decoded successfully for user:', decoded.userId);
    
    // Verify user exists and is active
    const userResult = await query(
      'SELECT id, email, first_name, last_name, role FROM users WHERE id = $1 AND is_active = true',
      [decoded.userId]
    );

    if (userResult.rows.length === 0) {
      console.warn('Socket.IO authentication failed: User not found or inactive for ID:', decoded.userId);
      return next(new Error('User not found or inactive'));
    }

    socket.user = userResult.rows[0];
    console.log('Socket.IO authentication successful for user:', socket.user.email);
    next();
  } catch (error) {
    console.error('Socket authentication error:', error);
    next(new Error('Invalid authentication token'));
  }
};

// Store io instance for use in handlers
let ioInstance = null;

/**
 * Handle user connection
 */
const handleConnection = (socket) => {
  const userId = socket.user.id;
  console.log(`User ${userId} connected with socket ${socket.id}`);

  // Join user-specific room
  socket.join(`user_${userId}`);

  // Update user session
  userSessions.set(userId, {
    socketId: socket.id,
    status: 'online',
    lastActivity: new Date()
  });
  socketUsers.set(socket.id, userId);

  // Broadcast user online status to relevant users
  broadcastPresenceUpdate(ioInstance, userId, 'online');

  // Send initial unread count
  sendUnreadCount(socket, userId);

  // Handle typing indicators
  socket.on('typing_start', (data) => handleTypingStart(socket, data));
  socket.on('typing_stop', (data) => handleTypingStop(socket, data));

  // Handle presence updates
  socket.on('presence_update', (data) => handlePresenceUpdate(socket, data));

  // Handle joining conversation rooms
  socket.on('join_conversation', (data) => handleJoinConversation(socket, data));
  socket.on('leave_conversation', (data) => handleLeaveConversation(socket, data));

  // Handle message events
  socket.on('mark_messages_read', (data) => handleMarkMessagesRead(socket, data));

  // Handle disconnection
  socket.on('disconnect', () => handleDisconnection(socket));
};

/**
 * Handle typing start
 */
const handleTypingStart = (socket, data) => {
  const { conversationUserId } = data;
  const userId = socket.user.id;
  
  if (!conversationUserId) return;

  const conversationId = getConversationId(userId, conversationUserId);
  
  if (!typingUsers.has(conversationId)) {
    typingUsers.set(conversationId, new Set());
  }
  
  typingUsers.get(conversationId).add(userId);
  
  // Notify other user in conversation
  socket.to(`user_${conversationUserId}`).emit('user_typing', {
    userId,
    userName: `${socket.user.first_name} ${socket.user.last_name}`,
    conversationId,
    isTyping: true
  });
};

/**
 * Handle typing stop
 */
const handleTypingStop = (socket, data) => {
  const { conversationUserId } = data;
  const userId = socket.user.id;
  
  if (!conversationUserId) return;

  const conversationId = getConversationId(userId, conversationUserId);
  
  if (typingUsers.has(conversationId)) {
    typingUsers.get(conversationId).delete(userId);
    
    if (typingUsers.get(conversationId).size === 0) {
      typingUsers.delete(conversationId);
    }
  }
  
  // Notify other user in conversation
  socket.to(`user_${conversationUserId}`).emit('user_typing', {
    userId,
    userName: `${socket.user.first_name} ${socket.user.last_name}`,
    conversationId,
    isTyping: false
  });
};

/**
 * Handle presence update (online, away, busy)
 */
const handlePresenceUpdate = (socket, data) => {
  const { status } = data;
  const userId = socket.user.id;
  
  const validStatuses = ['online', 'away', 'busy', 'offline'];
  if (!validStatuses.includes(status)) return;

  // Update user session
  if (userSessions.has(userId)) {
    const session = userSessions.get(userId);
    session.status = status;
    session.lastActivity = new Date();
    userSessions.set(userId, session);
  }

  // Broadcast presence update
  broadcastPresenceUpdate(ioInstance, userId, status);
};

/**
 * Handle joining a conversation room
 */
const handleJoinConversation = (socket, data) => {
  const { conversationUserId } = data;
  const userId = socket.user.id;
  
  if (!conversationUserId) return;

  const conversationId = getConversationId(userId, conversationUserId);
  socket.join(conversationId);
  
  console.log(`User ${userId} joined conversation ${conversationId}`);
};

/**
 * Handle leaving a conversation room
 */
const handleLeaveConversation = (socket, data) => {
  const { conversationUserId } = data;
  const userId = socket.user.id;
  
  if (!conversationUserId) return;

  const conversationId = getConversationId(userId, conversationUserId);
  socket.leave(conversationId);
  
  // Stop typing if user was typing
  handleTypingStop(socket, data);
  
  console.log(`User ${userId} left conversation ${conversationId}`);
};

/**
 * Handle marking messages as read
 */
const handleMarkMessagesRead = async (socket, data) => {
  const { conversationUserId } = data;
  const userId = socket.user.id;
  
  if (!conversationUserId) return;

  try {
    // Mark all unread messages from this conversation as read
    const result = await query(
      `UPDATE messages 
       SET is_read = true, read_at = CURRENT_TIMESTAMP 
       WHERE recipient_id = $1 AND sender_id = $2 AND is_read = false
       RETURNING *`,
      [userId, conversationUserId]
    );

    if (result.rows.length > 0) {
      // Send read receipts to sender
      result.rows.forEach(message => {
        socket.to(`user_${conversationUserId}`).emit('message_read', {
          messageId: message.id,
          readAt: message.read_at,
          readBy: userId
        });
      });

      // Update unread count
      sendUnreadCount(socket, userId);
    }
  } catch (error) {
    console.error('Error marking messages as read:', error);
  }
};

/**
 * Handle user disconnection
 */
const handleDisconnection = (socket) => {
  const userId = socketUsers.get(socket.id);
  
  if (userId) {
    console.log(`User ${userId} disconnected`);
    
    // Clean up typing indicators
    for (const [conversationId, typingSet] of typingUsers.entries()) {
      if (typingSet.has(userId)) {
        typingSet.delete(userId);
        if (typingSet.size === 0) {
          typingUsers.delete(conversationId);
        }
        
        // Notify other users that this user stopped typing
        socket.broadcast.emit('user_typing', {
          userId,
          conversationId,
          isTyping: false
        });
      }
    }
    
    // Update presence to offline after a delay (in case of reconnection)
    setTimeout(() => {
      if (userSessions.has(userId) && userSessions.get(userId).socketId === socket.id) {
        userSessions.delete(userId);
        if (ioInstance) {
          broadcastPresenceUpdate(ioInstance, userId, 'offline');
        }
      }
    }, 30000); // 30 second delay
    
    socketUsers.delete(socket.id);
  }
};

/**
 * Broadcast presence update to relevant users
 */
const broadcastPresenceUpdate = async (io, userId, status) => {
  try {
    // Get users who have conversations with this user
    const conversationUsersResult = await query(`
      SELECT DISTINCT 
        CASE 
          WHEN sender_id = $1 THEN recipient_id
          ELSE sender_id
        END as user_id
      FROM messages
      WHERE sender_id = $1 OR recipient_id = $1
    `, [userId]);

    // Broadcast to each conversation partner
    conversationUsersResult.rows.forEach(row => {
      io.to(`user_${row.user_id}`).emit('presence_update', {
        userId,
        status,
        timestamp: new Date()
      });
    });
  } catch (error) {
    console.error('Error broadcasting presence update:', error);
  }
};

/**
 * Send unread count to user
 */
const sendUnreadCount = async (socket, userId) => {
  try {
    const result = await query(
      'SELECT COUNT(*) as count FROM messages WHERE recipient_id = $1 AND is_read = false',
      [userId]
    );
    
    socket.emit('unread_count_updated', {
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    console.error('Error sending unread count:', error);
  }
};

/**
 * Generate consistent conversation ID for two users
 */
const getConversationId = (userId1, userId2) => {
  const ids = [userId1, userId2].sort();
  return `conversation_${ids[0]}_${ids[1]}`;
};

/**
 * Get online users
 */
const getOnlineUsers = () => {
  const onlineUsers = [];
  for (const [userId, session] of userSessions.entries()) {
    if (session.status !== 'offline') {
      onlineUsers.push({
        userId,
        status: session.status,
        lastActivity: session.lastActivity
      });
    }
  }
  return onlineUsers;
};

/**
 * Get user presence status
 */
const getUserPresence = (userId) => {
  const session = userSessions.get(userId);
  if (!session) {
    return { status: 'offline', lastActivity: null };
  }
  
  return {
    status: session.status,
    lastActivity: session.lastActivity
  };
};

/**
 * Send notification to user
 */
const sendNotificationToUser = (io, userId, notification) => {
  io.to(`user_${userId}`).emit('notification', notification);
};

/**
 * Initialize Socket.io handlers
 */
const initializeSocketHandlers = (io) => {
  // Store io instance for use in handlers
  ioInstance = io;
  
  // Apply authentication middleware
  io.use(authenticateSocket);
  
  // Handle connections
  io.on('connection', handleConnection);
  
  console.log('Socket.io handlers initialized');
};

export {
  initializeSocketHandlers,
  getOnlineUsers,
  getUserPresence,
  sendNotificationToUser,
  userSessions,
  socketUsers
};