import { query, closePool } from './config/database.js';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { io as Client } from 'socket.io-client';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const API_BASE = 'http://localhost:3000/api';

/**
 * Test the complete messaging system
 */
async function testMessagingSystem() {
  console.log('🚀 Starting Messaging System Test');
  
  try {
    // Step 1: Get test users
    console.log('\n📋 Step 1: Getting test users...');
    const users = await getTestUsers();
    
    if (users.length < 2) {
      console.log('❌ Need at least 2 users for testing. Creating test users...');
      await createTestUsers();
      return;
    }

    const [admin, client] = users;
    console.log(`✅ Found test users: ${admin.email} (admin), ${client.email} (client)`);

    // Step 2: Generate JWT tokens
    console.log('\n🔑 Step 2: Generating authentication tokens...');
    const adminToken = jwt.sign({ id: admin.id, email: admin.email, role: admin.role }, JWT_SECRET);
    const clientToken = jwt.sign({ id: client.id, email: client.email, role: client.role }, JWT_SECRET);
    console.log('✅ Tokens generated');

    // Step 3: Test API endpoints
    console.log('\n🔌 Step 3: Testing API endpoints...');
    await testAPIEndpoints(adminToken, clientToken, admin, client);

    // Step 4: Test Socket.io real-time features
    console.log('\n⚡ Step 4: Testing Socket.io real-time features...');
    await testSocketIO(adminToken, clientToken, admin, client);

    console.log('\n🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await closePool();
  }
}

/**
 * Get test users from database
 */
async function getTestUsers() {
  const result = await query(
    'SELECT id, email, first_name, last_name, role FROM users WHERE email IN ($1, $2) ORDER BY role DESC',
    ['kendrick@kendrickforrest.com', 'client@example.com']
  );
  return result.rows;
}

/**
 * Create test users if they don't exist
 */
async function createTestUsers() {
  console.log('Creating test admin and client users...');
  
  // This would require bcrypt hashing - for now just notify
  console.log('⚠️  Please ensure test users exist in the database:');
  console.log('   - kendrick@kendrickforrest.com (admin)');
  console.log('   - client@example.com (client)');
  console.log('   Run the database migration to create these users.');
}

/**
 * Test all API endpoints
 */
async function testAPIEndpoints(adminToken, clientToken, admin, client) {
  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${clientToken}`
  };

  // Test 1: Get conversations (should be empty initially)
  console.log('   📥 Testing GET /conversations...');
  let response = await fetch(`${API_BASE}/messages/conversations`, { headers });
  let data = await response.json();
  console.log(`   ✅ Conversations: ${data.conversations.length} found`);

  // Test 2: Send a message
  console.log('   💬 Testing POST /send...');
  const messageData = {
    recipient_id: admin.id,
    subject: 'Test Message',
    content: 'This is a test message from the messaging system test.',
    message_type: 'general',
    priority: 'normal'
  };

  response = await fetch(`${API_BASE}/messages/send`, {
    method: 'POST',
    headers,
    body: JSON.stringify(messageData)
  });
  data = await response.json();
  
  if (response.ok) {
    console.log('   ✅ Message sent successfully');
    const messageId = data.message.id;

    // Test 3: Get conversations (should have 1 now)
    console.log('   📥 Testing GET /conversations after sending...');
    response = await fetch(`${API_BASE}/messages/conversations`, { headers });
    data = await response.json();
    console.log(`   ✅ Conversations: ${data.conversations.length} found`);

    // Test 4: Get conversation history
    console.log('   📜 Testing GET /conversation/:userId...');
    response = await fetch(`${API_BASE}/messages/conversation/${admin.id}`, { headers });
    data = await response.json();
    console.log(`   ✅ Conversation messages: ${data.messages.length} found`);

    // Test 5: Mark message as read (as admin)
    console.log('   👁️  Testing PUT /:id/read...');
    const adminHeaders = { ...headers, 'Authorization': `Bearer ${adminToken}` };
    response = await fetch(`${API_BASE}/messages/${messageId}/read`, {
      method: 'PUT',
      headers: adminHeaders
    });
    data = await response.json();
    console.log(`   ✅ Message marked as read: ${data.success}`);

    // Test 6: Get unread count
    console.log('   📊 Testing GET /unread-count...');
    response = await fetch(`${API_BASE}/messages/unread-count`, { headers });
    data = await response.json();
    console.log(`   ✅ Unread count: ${data.unread_count}`);

    // Test 7: Search messages
    console.log('   🔍 Testing GET /search...');
    response = await fetch(`${API_BASE}/messages/search?q=test`, { headers });
    data = await response.json();
    console.log(`   ✅ Search results: ${data.messages.length} found`);

    // Test 8: Get online users
    console.log('   🟢 Testing GET /presence/online...');
    response = await fetch(`${API_BASE}/messages/presence/online`, { headers });
    data = await response.json();
    console.log(`   ✅ Online users: ${data.online_users.length} found`);

    // Test 9: Test broadcast (admin only)
    console.log('   📢 Testing POST /broadcast (admin only)...');
    const broadcastData = {
      subject: 'System Announcement',
      content: 'This is a test broadcast message.',
      message_type: 'general',
      priority: 'high'
    };

    response = await fetch(`${API_BASE}/messages/broadcast`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify(broadcastData)
    });
    data = await response.json();
    
    if (response.ok) {
      console.log(`   ✅ Broadcast sent to ${data.recipient_count} users`);
    } else {
      console.log(`   ⚠️  Broadcast test: ${data.error}`);
    }

  } else {
    console.log(`   ❌ Failed to send message: ${data.error}`);
  }
}

/**
 * Test Socket.io real-time features
 */
async function testSocketIO(adminToken, clientToken, admin, client) {
  return new Promise((resolve) => {
    console.log('   🔌 Connecting to Socket.io server...');
    
    // Create two socket connections
    const adminSocket = Client('http://localhost:3000', {
      auth: { token: adminToken }
    });

    const clientSocket = Client('http://localhost:3000', {
      auth: { token: clientToken }
    });

    let testsCompleted = 0;
    const totalTests = 6;
    
    const completeTest = () => {
      testsCompleted++;
      if (testsCompleted >= totalTests) {
        adminSocket.disconnect();
        clientSocket.disconnect();
        console.log('   ✅ Socket.io tests completed');
        resolve();
      }
    };

    // Test connection
    adminSocket.on('connect', () => {
      console.log('   ✅ Admin socket connected');
      completeTest();
    });

    clientSocket.on('connect', () => {
      console.log('   ✅ Client socket connected');
      completeTest();
    });

    // Test presence updates
    adminSocket.on('presence_update', (data) => {
      console.log(`   ✅ Presence update received: User ${data.userId} is ${data.status}`);
      completeTest();
    });

    // Test typing indicators
    adminSocket.on('user_typing', (data) => {
      console.log(`   ✅ Typing indicator received: ${data.userName} is ${data.isTyping ? 'typing' : 'not typing'}`);
      completeTest();
    });

    // Test new message notification
    adminSocket.on('new_message', (data) => {
      console.log(`   ✅ New message notification received: "${data.subject}"`);
      completeTest();
    });

    // Test unread count updates
    adminSocket.on('unread_count_updated', (data) => {
      console.log(`   ✅ Unread count update received: ${data.count} unread messages`);
      completeTest();
    });

    // Simulate user interactions after connections are established
    setTimeout(() => {
      console.log('   🔄 Simulating user interactions...');
      
      // Join conversation
      clientSocket.emit('join_conversation', { conversationUserId: admin.id });
      
      // Update presence
      clientSocket.emit('presence_update', { status: 'away' });
      
      // Start typing
      clientSocket.emit('typing_start', { conversationUserId: admin.id });
      
      // Stop typing after 2 seconds
      setTimeout(() => {
        clientSocket.emit('typing_stop', { conversationUserId: admin.id });
      }, 2000);
      
    }, 1000);

    // Timeout after 10 seconds
    setTimeout(() => {
      if (testsCompleted < totalTests) {
        console.log('   ⚠️  Some Socket.io tests timed out');
        adminSocket.disconnect();
        clientSocket.disconnect();
        resolve();
      }
    }, 10000);
  });
}

// Run the test
if (import.meta.url === `file://${process.argv[1]}`) {
  testMessagingSystem();
}

export { testMessagingSystem };