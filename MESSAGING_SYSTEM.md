# Kendrick Forrest Client Portal - Real-Time Messaging System

## Overview

A complete real-time messaging system built with Socket.io and Express.js, providing secure messaging capabilities between clients and administrators with real-time features like typing indicators, presence tracking, and read receipts.

## Features

### ✅ Core Messaging
- **Message Threading**: Conversation-based messaging between users
- **File Attachments**: Support for multiple file types (images, documents, etc.)
- **Message Search**: Full-text search across message content and subjects
- **Message History**: Paginated conversation history
- **Message Types**: Support for different message types (general, project updates, etc.)
- **Priority Levels**: Low, normal, high, urgent priority levels

### ⚡ Real-Time Features
- **Live Message Delivery**: Instant message delivery via Socket.io
- **Typing Indicators**: See when someone is typing
- **Presence Tracking**: Online/offline/away/busy status
- **Read Receipts**: Message read confirmation
- **Unread Counters**: Real-time unread message counts
- **Connection Status**: Real-time connection monitoring

### 🔐 Security & Authentication
- **JWT Authentication**: Secure token-based authentication for both HTTP and Socket.io
- **Role-Based Access**: Admin and client role permissions
- **Input Validation**: Comprehensive input validation and sanitization
- **File Upload Security**: File type and size restrictions
- **Rate Limiting**: API rate limiting to prevent abuse

### 📱 Additional Features
- **Broadcast Messages**: Admin can send messages to all users
- **Online User List**: See who's currently online
- **Message Deletion**: Users can delete their own messages
- **Attachment Downloads**: Secure file download with access control
- **Notification System**: Real-time notifications for new messages

## API Endpoints

### Message Management
- `GET /api/messages/conversations` - List user conversations
- `GET /api/messages/conversation/:userId` - Get conversation history
- `POST /api/messages/send` - Send a new message (with optional attachments)
- `PUT /api/messages/:id/read` - Mark message as read
- `DELETE /api/messages/:id` - Delete a message
- `GET /api/messages/unread-count` - Get unread message count
- `GET /api/messages/search` - Search messages

### Presence & Social Features
- `GET /api/messages/presence/online` - Get list of online users
- `GET /api/messages/presence/:userId` - Get specific user's presence
- `POST /api/messages/broadcast` - Send broadcast message (admin only)

### File Management
- `GET /api/messages/attachment/:messageId/:filename` - Download message attachment

## Socket.io Events

### Client → Server Events
- `join_conversation` - Join a conversation room
- `leave_conversation` - Leave a conversation room
- `typing_start` - Start typing indicator
- `typing_stop` - Stop typing indicator
- `presence_update` - Update presence status
- `mark_messages_read` - Mark conversation messages as read

### Server → Client Events
- `new_message` - New message received
- `message_sent` - Message sent confirmation
- `message_read` - Message read receipt
- `message_deleted` - Message deleted notification
- `user_typing` - User typing indicator
- `presence_update` - User presence change
- `unread_count_updated` - Unread count changed
- `notification` - General notification

## Database Schema

The messaging system uses the existing `messages` table with these key fields:

```sql
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    subject VARCHAR(255),
    content TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'general',
    priority VARCHAR(20) DEFAULT 'normal',
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    parent_message_id UUID REFERENCES messages(id),
    attachments JSONB,
    is_archived BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
```

## File Structure

```
/routes/messages.js          # Main API endpoints
/utils/socketHandlers.js     # Socket.io event handlers
/uploads/messages/           # Message attachment storage
/messaging-client-example.html  # Client-side example
/test-messaging-system.js    # Comprehensive test suite
```

## Installation & Setup

1. **Dependencies**: Socket.io is already installed via `npm install socket.io`

2. **Server Integration**: The messaging system is integrated into the main Express server in `server.js`

3. **Database**: Uses existing PostgreSQL database with the messages table

4. **File Storage**: Attachments are stored in `/uploads/messages/` directory

## Usage Examples

### Client-Side Connection

```javascript
// Connect to Socket.io with JWT authentication
const socket = io({
    auth: { token: 'your-jwt-token' }
});

// Listen for new messages
socket.on('new_message', (message) => {
    console.log('New message:', message);
});

// Join a conversation
socket.emit('join_conversation', { conversationUserId: 'user-id' });

// Send typing indicator
socket.emit('typing_start', { conversationUserId: 'user-id' });
```

### API Usage

```javascript
// Send a message
const response = await fetch('/api/messages/send', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
        recipient_id: 'user-id',
        content: 'Hello!',
        subject: 'Greeting'
    })
});

// Get conversations
const conversations = await fetch('/api/messages/conversations', {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

## Security Considerations

1. **Authentication**: All endpoints require valid JWT tokens
2. **Authorization**: Users can only access their own messages (except admins)
3. **File Upload**: Restricted file types and size limits (10MB)
4. **Input Validation**: All inputs are validated and sanitized
5. **Rate Limiting**: API rate limiting prevents abuse
6. **SQL Injection**: Parameterized queries prevent SQL injection
7. **XSS Prevention**: Content is properly escaped in client examples

## Testing

### Automated Testing
```bash
node test-messaging-system.js
```

### Manual Testing
1. Open `messaging-client-example.html` in browser
2. Login with test credentials
3. Test real-time messaging features
4. Verify file upload functionality
5. Check presence and typing indicators

## Performance Considerations

1. **Connection Management**: Proper socket connection cleanup on disconnect
2. **Memory Usage**: User sessions stored in memory (consider Redis for production)
3. **Database Queries**: Optimized queries with proper indexing
4. **File Storage**: Local file storage (consider cloud storage for production)
5. **Rate Limiting**: Prevents API abuse and socket spam

## Production Deployment

1. **Environment Variables**: Configure JWT_SECRET and database credentials
2. **SSL/HTTPS**: Enable HTTPS for secure WebSocket connections
3. **Redis Adapter**: Use Redis adapter for Socket.io in multi-server setup
4. **File Storage**: Consider AWS S3 or similar for file attachments
5. **Monitoring**: Add logging and monitoring for message delivery
6. **Backup**: Regular database backups for message history

## Error Handling

The system includes comprehensive error handling:
- Database connection errors
- File upload errors
- Authentication failures
- Socket connection issues
- Invalid input validation

## Browser Compatibility

- Modern browsers supporting WebSocket/Socket.io
- Progressive enhancement for older browsers
- Mobile-responsive design in example client

## Contributing

When extending the messaging system:
1. Follow existing authentication patterns
2. Add proper error handling
3. Include Socket.io events for real-time updates
4. Update tests and documentation
5. Consider security implications

## Support

For issues or questions about the messaging system, refer to:
1. Server logs for backend issues
2. Browser console for client-side issues
3. Database logs for query problems
4. Socket.io debug mode for connection issues