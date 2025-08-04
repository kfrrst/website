import { BaseModule } from './BaseModule.js';

/**
 * Messaging module for client portal
 * Handles real-time messaging, conversations, and notifications
 */
export class MessagingModule extends BaseModule {
  constructor(portal) {
    super(portal, 'MessagingModule');
    this.conversations = [];
    this.currentConversation = null;
    this.unreadCount = 0;
    this.typingIndicators = new Map();
  }

  async doInit() {
    this.element = document.getElementById('messages');
    if (this.element) {
      await this.loadConversations();
      this.setupMessagingInterface();
    }
  }

  async loadConversations() {
    try {
      const data = await this.getCachedData('conversations', async () => {
        const response = await this.apiRequest('/api/messages/conversations');
        return await response.json();
      }, 60000); // 1 minute cache

      this.conversations = data.conversations || [];
      this.updateUnreadCount();
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  }

  setupMessagingInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="messaging-container">
        <div class="conversations-sidebar">
          <div class="conversations-header">
            <h2>Messages</h2>
            <button class="new-message-btn" onclick="portal.modules.messaging.openComposer()">
              <span class="icon">✏️</span>
              New Message
            </button>
          </div>
          <div class="conversations-list">
            ${this.renderConversationsList()}
          </div>
        </div>
        <div class="conversation-main">
          ${this.renderConversationView()}
        </div>
      </div>
    `;
  }

  renderConversationsList() {
    if (this.conversations.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">💬</div>
          <h3>No conversations yet</h3>
          <p>Start a conversation to see it here</p>
        </div>
      `;
    }

    return this.conversations.map(conv => `
      <div class="conversation-item ${conv.unread ? 'unread' : ''}" 
           onclick="portal.modules.messaging.selectConversation('${conv.id}')">
        <div class="conversation-avatar">
          <img src="${conn.participant?.avatar || '/assets/default-avatar.png'}" 
               alt="${conv.participant?.name}">
        </div>
        <div class="conversation-content">
          <div class="conversation-header">
            <span class="participant-name">${conv.participant?.name || 'Unknown'}</span>
            <span class="conversation-time">${this.formatDate(conv.last_message_at)}</span>
          </div>
          <div class="last-message">
            ${conv.last_message?.content || 'No messages yet'}
          </div>
        </div>
        ${conv.unread_count > 0 ? `<div class="unread-badge">${conv.unread_count}</div>` : ''}
      </div>
    `).join('');
  }

  renderConversationView() {
    if (!this.currentConversation) {
      return `
        <div class="no-conversation">
          <div class="no-conversation-content">
            <div class="no-conversation-icon">💬</div>
            <h3>Select a conversation</h3>
            <p>Choose a conversation from the sidebar to start messaging</p>
          </div>
        </div>
      `;
    }

    // Implementation for conversation view would go here
    return `<div class="conversation-placeholder">Conversation view coming soon...</div>`;
  }

  updateUnreadCount() {
    this.unreadCount = this.conversations.reduce((total, conv) => total + (conv.unread_count || 0), 0);
    
    // Update navigation badge
    if (this.portal.modules.navigation) {
      this.portal.modules.navigation.updateUnreadCount(this.unreadCount);
    }
  }

  openComposer() {
    console.log('Opening message composer...');
    // Implementation for message composer modal
  }

  selectConversation(conversationId) {
    this.currentConversation = this.conversations.find(c => c.id === conversationId);
    this.setupMessagingInterface(); // Re-render
  }

  setupSocketEvents(socket) {
    socket.on('new_message', (message) => {
      this.handleNewMessage(message);
    });

    socket.on('typing_start', (data) => {
      this.handleTypingStart(data);
    });

    socket.on('typing_stop', (data) => {
      this.handleTypingStop(data);
    });
  }

  handleNewMessage(message) {
    // Update conversations list
    this.loadConversations();
    
    // Show notification if not in current conversation
    if (!this.currentConversation || this.currentConversation.id !== message.conversation_id) {
      this.showNewMessageNotification(message);
    }
  }

  handleTypingStart(data) {
    this.typingIndicators.set(data.userId, data);
    // Update UI to show typing indicator
  }

  handleTypingStop(data) {
    this.typingIndicators.delete(data.userId);
    // Update UI to hide typing indicator
  }

  showNewMessageNotification(message) {
    // Show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('New message', {
        body: message.content,
        icon: '/assets/logo.png'
      });
    }
  }
}