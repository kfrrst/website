import { BaseAdminModule } from './BaseAdminModule.js';

/**
 * Admin Messages Module
 * Handles internal messaging system, client communications, and notifications
 */
export class AdminMessagesModule extends BaseAdminModule {
  constructor(admin) {
    super(admin, 'AdminMessagesModule');
    this.conversations = [];
    this.filteredConversations = [];
    this.currentConversation = null;
    this.messages = [];
    this.searchTerm = '';
    this.filter = 'all';
    this.sortBy = 'recent';
    this.unreadCount = 0;
  }

  async doInit() {
    this.element = document.getElementById('messages');
    if (this.element) {
      // Only load messages if we have a token
      if (this.admin && this.admin.token) {
        await this.loadConversations();
      }
      this.setupMessagesInterface();
      this.setupAutoRefresh(30000); // Refresh every 30 seconds
    }
  }

  /**
   * Load conversations data
   */
  async loadConversations() {
    try {
      const data = await this.getCachedData('conversations', async () => {
        const response = await this.apiRequest('/messages/conversations');
        return await response.json();
      }, 30000); // Cache for 30 seconds

      this.conversations = data.conversations || [];
      this.unreadCount = this.conversations.filter(c => c.unread_count > 0).length;
      this.applyFilters();
      
    } catch (error) {
      console.error('Failed to load conversations:', error);
      this.showError('Failed to load conversations');
    }
  }

  /**
   * Load messages for a conversation
   */
  async loadMessages(conversationId) {
    try {
      const response = await this.apiRequest(`/messages/conversations/${conversationId}`);
      const data = await response.json();
      
      this.messages = data.messages || [];
      this.currentConversation = this.conversations.find(c => c.id === conversationId);
      
      // Mark as read
      if (this.currentConversation && this.currentConversation.unread_count > 0) {
        await this.markAsRead(conversationId);
      }
      
      return data.messages;
      
    } catch (error) {
      console.error('Failed to load messages:', error);
      this.showError('Failed to load messages');
      return [];
    }
  }

  /**
   * Setup messages interface
   */
  setupMessagesInterface() {
    if (!this.element) return;

    this.element.innerHTML = `
      <div class="admin-messages">
        <div class="messages-container">
          <div class="conversations-sidebar">
            <div class="sidebar-header">
              <h2>Messages ${this.unreadCount > 0 ? `<span class="unread-badge">${this.unreadCount}</span>` : ''}</h2>
              <button class="btn-primary" onclick="admin.modules.messages.showNewMessageModal()">
                <span class="icon">✉️</span>
                New Message
              </button>
            </div>
            
            <div class="conversation-filters">
              <select class="filter-select" onchange="admin.modules.messages.filterConversations(this.value)">
                <option value="all">All Messages</option>
                <option value="unread">Unread</option>
                <option value="clients">Clients</option>
                <option value="team">Team</option>
                <option value="system">System</option>
              </select>
              
              <div class="search-box">
                <input type="text" 
                       placeholder="Search conversations..." 
                       oninput="admin.modules.messages.searchConversations(this.value)">
                <span class="search-icon">🔍</span>
              </div>
            </div>
            
            <div class="conversations-list">
              ${this.renderConversationsList()}
            </div>
          </div>
          
          <div class="messages-main">
            ${this.currentConversation ? this.renderMessageView() : this.renderEmptyMessageView()}
          </div>
        </div>
      </div>

      <!-- New Message Modal -->
      <div id="new-message-modal" class="modal">
        <div class="modal-overlay" onclick="admin.modules.messages.closeNewMessageModal()"></div>
        <div class="modal-content">
          <div class="modal-header">
            <h2>New Message</h2>
            <button class="modal-close" onclick="admin.modules.messages.closeNewMessageModal()">×</button>
          </div>
          <div class="modal-body">
            ${this.renderNewMessageForm()}
          </div>
        </div>
      </div>
    `;

    this.setupEventHandlers();
  }

  /**
   * Render conversations list
   */
  renderConversationsList() {
    if (this.filteredConversations.length === 0) {
      return `
        <div class="empty-conversations">
          <p>No conversations found</p>
        </div>
      `;
    }

    return this.filteredConversations.map(conversation => `
      <div class="conversation-item ${conversation.unread_count > 0 ? 'unread' : ''} ${this.currentConversation?.id === conversation.id ? 'active' : ''}" 
           onclick="admin.modules.messages.selectConversation('${conversation.id}')">
        <div class="conversation-avatar">
          ${this.getAvatar(conversation)}
        </div>
        
        <div class="conversation-content">
          <div class="conversation-header">
            <h4>${conversation.participant_name}</h4>
            <span class="conversation-time">${this.formatRelativeTime(conversation.last_message_at)}</span>
          </div>
          
          <div class="conversation-preview">
            ${conversation.last_message_preview || 'No messages yet'}
          </div>
          
          ${conversation.unread_count > 0 ? `
            <span class="unread-count">${conversation.unread_count}</span>
          ` : ''}
        </div>
      </div>
    `).join('');
  }

  /**
   * Render message view
   */
  renderMessageView() {
    if (!this.currentConversation) return '';

    return `
      <div class="message-header">
        <div class="participant-info">
          <h3>${this.currentConversation.participant_name}</h3>
          <span class="participant-type">${this.currentConversation.participant_type}</span>
        </div>
        
        <div class="message-actions">
          <button class="action-btn" onclick="admin.modules.messages.archiveConversation('${this.currentConversation.id}')" title="Archive">
            📥
          </button>
          <button class="action-btn" onclick="admin.modules.messages.deleteConversation('${this.currentConversation.id}')" title="Delete">
            🗑️
          </button>
        </div>
      </div>
      
      <div class="messages-scroll" id="messages-container">
        ${this.renderMessages()}
      </div>
      
      <div class="message-composer">
        <form onsubmit="event.preventDefault(); admin.modules.messages.sendMessage();">
          <div class="composer-input">
            <textarea id="message-input" 
                      placeholder="Type your message..." 
                      rows="3"
                      onkeydown="if(event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); admin.modules.messages.sendMessage(); }"></textarea>
            
            <div class="composer-actions">
              <button type="button" class="attach-btn" onclick="admin.modules.messages.attachFile()" title="Attach file">
                📎
              </button>
              <button type="submit" class="send-btn">
                Send
              </button>
            </div>
          </div>
        </form>
      </div>
    `;
  }

  /**
   * Render messages
   */
  renderMessages() {
    if (this.messages.length === 0) {
      return `
        <div class="no-messages">
          <p>No messages yet. Start the conversation!</p>
        </div>
      `;
    }

    let lastDate = null;
    
    return this.messages.map(message => {
      const messageDate = new Date(message.created_at).toDateString();
      const showDateDivider = messageDate !== lastDate;
      lastDate = messageDate;
      
      const messageHtml = `
        ${showDateDivider ? `
          <div class="date-divider">
            <span>${this.formatMessageDate(message.created_at)}</span>
          </div>
        ` : ''}
        
        <div class="message ${message.sender_type === 'admin' ? 'sent' : 'received'}">
          <div class="message-bubble">
            <div class="message-content">
              ${this.escapeHtml(message.content)}
            </div>
            
            ${message.attachments && message.attachments.length > 0 ? `
              <div class="message-attachments">
                ${message.attachments.map(att => this.renderAttachment(att)).join('')}
              </div>
            ` : ''}
            
            <div class="message-meta">
              <span class="message-time">${this.formatTime(message.created_at)}</span>
              ${message.sender_type === 'admin' ? `
                <span class="message-status ${message.read_at ? 'read' : 'sent'}">
                  ${message.read_at ? '✓✓' : '✓'}
                </span>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      
      return messageHtml;
    }).join('');
  }

  /**
   * Render empty message view
   */
  renderEmptyMessageView() {
    return `
      <div class="empty-message-view">
        <div class="empty-icon">💬</div>
        <h3>Select a conversation</h3>
        <p>Choose a conversation from the list to start messaging</p>
      </div>
    `;
  }

  /**
   * Render new message form
   */
  renderNewMessageForm() {
    return `
      <form id="new-message-form" onsubmit="event.preventDefault(); admin.modules.messages.createNewMessage();">
        <div class="form-group">
          <label for="recipient-type">Recipient Type</label>
          <select id="recipient-type" name="recipient_type" required onchange="admin.modules.messages.updateRecipientOptions(this.value)">
            <option value="">Select type...</option>
            <option value="client">Client</option>
            <option value="team">Team Member</option>
          </select>
        </div>
        
        <div class="form-group" id="recipient-select-group" style="display: none;">
          <label for="recipient-id">Recipient</label>
          <select id="recipient-id" name="recipient_id" required>
            <option value="">Select recipient...</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="message-subject">Subject</label>
          <input type="text" id="message-subject" name="subject" placeholder="Message subject..." required>
        </div>
        
        <div class="form-group">
          <label for="message-content">Message</label>
          <textarea id="message-content" name="content" rows="6" placeholder="Type your message..." required></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn-secondary" onclick="admin.modules.messages.closeNewMessageModal()">
            Cancel
          </button>
          <button type="submit" class="btn-primary">
            Send Message
          </button>
        </div>
      </form>
    `;
  }

  /**
   * Render attachment
   */
  renderAttachment(attachment) {
    const isImage = attachment.mime_type && attachment.mime_type.startsWith('image/');
    
    return `
      <div class="attachment-item">
        ${isImage ? `
          <img src="/api/files/${attachment.file_id}/thumbnail" alt="${attachment.filename}" 
               onclick="admin.modules.messages.previewAttachment('${attachment.file_id}')">
        ` : `
          <a href="/api/files/${attachment.file_id}/download" class="attachment-link" download="${attachment.filename}">
            <span class="attachment-icon">📄</span>
            <span class="attachment-name">${attachment.filename}</span>
          </a>
        `}
      </div>
    `;
  }

  /**
   * Setup event handlers
   */
  setupEventHandlers() {
    // Auto-scroll to bottom when new messages arrive
    const messagesContainer = document.getElementById('messages-container');
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  }

  /**
   * Select conversation
   */
  async selectConversation(conversationId) {
    await this.loadMessages(conversationId);
    this.setupMessagesInterface();
    
    // Scroll to bottom
    setTimeout(() => {
      const messagesContainer = document.getElementById('messages-container');
      if (messagesContainer) {
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
      }
    }, 100);
  }

  /**
   * Send message
   */
  async sendMessage() {
    if (!this.currentConversation) return;
    
    const input = document.getElementById('message-input');
    const content = input.value.trim();
    
    if (!content) return;
    
    try {
      const response = await this.apiRequest('/messages', {
        method: 'POST',
        body: JSON.stringify({
          conversation_id: this.currentConversation.id,
          content: content
        })
      });
      
      if (response.ok) {
        const newMessage = await response.json();
        this.messages.push(newMessage.message);
        
        // Update last message in conversation list
        this.currentConversation.last_message_preview = content;
        this.currentConversation.last_message_at = new Date().toISOString();
        
        // Clear input and refresh UI
        input.value = '';
        this.setupMessagesInterface();
        
        // Scroll to bottom
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
        
        this.clearCache();
      } else {
        this.showError('Failed to send message');
      }
      
    } catch (error) {
      console.error('Send message failed:', error);
      this.showError('Failed to send message');
    }
  }

  /**
   * Mark conversation as read
   */
  async markAsRead(conversationId) {
    try {
      const response = await this.apiRequest(`/messages/conversations/${conversationId}/read`, {
        method: 'POST'
      });
      
      if (response.ok) {
        const conversation = this.conversations.find(c => c.id === conversationId);
        if (conversation) {
          conversation.unread_count = 0;
          this.unreadCount = this.conversations.filter(c => c.unread_count > 0).length;
        }
      }
      
    } catch (error) {
      console.error('Mark as read failed:', error);
    }
  }

  /**
   * Show new message modal
   */
  showNewMessageModal() {
    document.getElementById('new-message-modal').classList.add('active');
    this.loadRecipients();
  }

  /**
   * Close new message modal
   */
  closeNewMessageModal() {
    document.getElementById('new-message-modal').classList.remove('active');
    document.getElementById('new-message-form').reset();
    document.getElementById('recipient-select-group').style.display = 'none';
  }

  /**
   * Update recipient options
   */
  async updateRecipientOptions(type) {
    const selectGroup = document.getElementById('recipient-select-group');
    const recipientSelect = document.getElementById('recipient-id');
    
    if (!type) {
      selectGroup.style.display = 'none';
      return;
    }
    
    selectGroup.style.display = 'block';
    recipientSelect.innerHTML = '<option value="">Loading...</option>';
    
    try {
      let options = '';
      
      if (type === 'client') {
        const response = await this.apiRequest('/clients');
        const data = await response.json();
        
        options = data.clients.map(client => 
          `<option value="${client.id}">${client.company || client.name}</option>`
        ).join('');
        
      } else if (type === 'team') {
        // Load team members
        options = `
          <option value="admin">Admin Team</option>
          <option value="support">Support Team</option>
        `;
      }
      
      recipientSelect.innerHTML = `
        <option value="">Select recipient...</option>
        ${options}
      `;
      
    } catch (error) {
      console.error('Failed to load recipients:', error);
      recipientSelect.innerHTML = '<option value="">Failed to load recipients</option>';
    }
  }

  /**
   * Create new message
   */
  async createNewMessage() {
    const form = document.getElementById('new-message-form');
    const formData = new FormData(form);
    
    try {
      const response = await this.apiRequest('/messages/conversations', {
        method: 'POST',
        body: JSON.stringify({
          recipient_type: formData.get('recipient_type'),
          recipient_id: formData.get('recipient_id'),
          subject: formData.get('subject'),
          content: formData.get('content')
        })
      });
      
      if (response.ok) {
        const result = await response.json();
        
        this.showSuccess('Message sent successfully');
        this.closeNewMessageModal();
        
        // Load the new conversation
        await this.loadConversations();
        await this.selectConversation(result.conversation_id);
        
        this.clearCache();
      } else {
        this.showError('Failed to send message');
      }
      
    } catch (error) {
      console.error('Create message failed:', error);
      this.showError('Failed to send message');
    }
  }

  /**
   * Attach file
   */
  attachFile() {
    // This would open a file picker
    this.showInfo('File attachment coming soon');
  }

  /**
   * Preview attachment
   */
  previewAttachment(fileId) {
    // This would open a preview modal
    window.open(`/api/files/${fileId}/preview`, '_blank');
  }

  /**
   * Archive conversation
   */
  async archiveConversation(conversationId) {
    const confirmed = confirm('Are you sure you want to archive this conversation?');
    if (!confirmed) return;
    
    try {
      const response = await this.apiRequest(`/messages/conversations/${conversationId}/archive`, {
        method: 'POST'
      });
      
      if (response.ok) {
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        this.currentConversation = null;
        this.messages = [];
        this.applyFilters();
        this.setupMessagesInterface();
        this.showSuccess('Conversation archived');
        this.clearCache();
      } else {
        this.showError('Failed to archive conversation');
      }
      
    } catch (error) {
      console.error('Archive failed:', error);
      this.showError('Failed to archive conversation');
    }
  }

  /**
   * Delete conversation
   */
  async deleteConversation(conversationId) {
    const confirmed = confirm('Are you sure you want to delete this conversation? This action cannot be undone.');
    if (!confirmed) return;
    
    try {
      const response = await this.apiRequest(`/messages/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        this.conversations = this.conversations.filter(c => c.id !== conversationId);
        this.currentConversation = null;
        this.messages = [];
        this.applyFilters();
        this.setupMessagesInterface();
        this.showSuccess('Conversation deleted');
        this.clearCache();
      } else {
        this.showError('Failed to delete conversation');
      }
      
    } catch (error) {
      console.error('Delete failed:', error);
      this.showError('Failed to delete conversation');
    }
  }

  /**
   * Filter conversations
   */
  filterConversations(filter) {
    this.filter = filter;
    this.applyFilters();
    this.setupMessagesInterface();
  }

  /**
   * Search conversations
   */
  searchConversations(term) {
    this.searchTerm = term.toLowerCase();
    this.applyFilters();
    this.setupMessagesInterface();
  }

  /**
   * Apply filters
   */
  applyFilters() {
    let filtered = [...this.conversations];
    
    // Apply filter
    switch (this.filter) {
      case 'unread':
        filtered = filtered.filter(c => c.unread_count > 0);
        break;
      case 'clients':
        filtered = filtered.filter(c => c.participant_type === 'client');
        break;
      case 'team':
        filtered = filtered.filter(c => c.participant_type === 'team');
        break;
      case 'system':
        filtered = filtered.filter(c => c.participant_type === 'system');
        break;
    }
    
    // Apply search
    if (this.searchTerm) {
      filtered = filtered.filter(c => 
        c.participant_name.toLowerCase().includes(this.searchTerm) ||
        (c.last_message_preview && c.last_message_preview.toLowerCase().includes(this.searchTerm))
      );
    }
    
    // Sort by recent
    filtered.sort((a, b) => new Date(b.last_message_at) - new Date(a.last_message_at));
    
    this.filteredConversations = filtered;
  }

  /**
   * Get avatar for conversation
   */
  getAvatar(conversation) {
    const initials = conversation.participant_name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    const colors = ['#0057FF', '#27AE60', '#F7C600', '#E63946', '#8B00FF'];
    const colorIndex = conversation.id.charCodeAt(0) % colors.length;
    
    return `
      <div class="avatar-circle" style="background: ${colors[colorIndex]}">
        ${initials}
      </div>
    `;
  }

  /**
   * Format relative time
   */
  formatRelativeTime(date) {
    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now - then) / 1000);
    
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
    
    return this.formatDate(date, { month: 'short', day: 'numeric' });
  }

  /**
   * Format message date
   */
  formatMessageDate(date) {
    const messageDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (messageDate.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (messageDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return this.formatDate(date, { weekday: 'long', month: 'long', day: 'numeric' });
    }
  }

  /**
   * Format time
   */
  formatTime(date) {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  }

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Refresh conversations data
   */
  async refresh() {
    this.clearCache();
    await this.loadConversations();
    if (this.currentConversation) {
      await this.loadMessages(this.currentConversation.id);
    }
    this.setupMessagesInterface();
  }

  /**
   * Setup socket events
   */
  setupSocketEvents(socket) {
    socket.on('new_message', (data) => {
      // If it's for the current conversation, add it
      if (this.currentConversation && data.conversation_id === this.currentConversation.id) {
        this.messages.push(data.message);
        this.setupMessagesInterface();
        
        // Scroll to bottom
        setTimeout(() => {
          const messagesContainer = document.getElementById('messages-container');
          if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
          }
        }, 100);
      } else {
        // Update unread count
        const conversation = this.conversations.find(c => c.id === data.conversation_id);
        if (conversation) {
          conversation.unread_count++;
          conversation.last_message_preview = data.message.content;
          conversation.last_message_at = data.message.created_at;
        } else {
          // New conversation, reload list
          this.loadConversations();
        }
        
        this.unreadCount = this.conversations.filter(c => c.unread_count > 0).length;
        this.applyFilters();
        this.setupMessagesInterface();
      }
      
      this.showNotification(`New message from ${data.sender_name}`);
    });

    socket.on('message_read', (data) => {
      if (this.currentConversation && data.conversation_id === this.currentConversation.id) {
        // Mark messages as read
        this.messages.forEach(msg => {
          if (msg.sender_type === 'admin' && !msg.read_at) {
            msg.read_at = new Date().toISOString();
          }
        });
        this.setupMessagesInterface();
      }
    });
  }
}