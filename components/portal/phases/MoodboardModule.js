/**
 * MoodboardModule Component
 * Used in IDEA (Ideation) phase for creating and managing mood boards
 */
export class MoodboardModule {
  constructor(portal, projectId, phaseData) {
    this.portal = portal;
    this.projectId = projectId;
    this.phaseData = phaseData;
    this.moodboards = [];
    this.currentBoard = null;
    this.selectedImages = [];
  }

  async render(container) {
    await this.loadMoodboards();
    
    container.innerHTML = `
      <div class="moodboard-module">
        <div class="moodboard-header">
          <h2>Project Mood Board</h2>
          <p>Collect visual inspiration and establish the creative direction</p>
          <button class="btn-primary" onclick="window.portal.modules.phases.moodboard.createNewBoard()">
            Create New Board
          </button>
        </div>

        <div class="moodboard-container">
          ${this.currentBoard ? this.renderBoard() : this.renderBoardList()}
        </div>
      </div>
    `;
  }

  renderBoardList() {
    if (this.moodboards.length === 0) {
      return `
        <div class="empty-state">
          <div class="empty-icon">🎨</div>
          <h3>No mood boards yet</h3>
          <p>Create your first mood board to start collecting visual inspiration</p>
          <button class="btn-primary" onclick="window.portal.modules.phases.moodboard.createNewBoard()">
            Create Mood Board
          </button>
        </div>
      `;
    }

    return `
      <div class="moodboard-grid">
        ${this.moodboards.map(board => `
          <div class="moodboard-card" onclick="window.portal.modules.phases.moodboard.openBoard('${board.id}')">
            <div class="board-preview">
              ${board.images.slice(0, 4).map(img => `
                <div class="preview-image" style="background-image: url('${img.thumbnail}')"></div>
              `).join('')}
            </div>
            <div class="board-info">
              <h3>${board.name}</h3>
              <p>${board.images.length} images • ${board.notes.length} notes</p>
              <span class="board-date">Updated ${this.formatDate(board.updated_at)}</span>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }

  renderBoard() {
    return `
      <div class="moodboard-workspace">
        <div class="board-toolbar">
          <button class="btn-secondary" onclick="window.portal.modules.phases.moodboard.backToList()">
            ← Back to Boards
          </button>
          <h3>${this.currentBoard.name}</h3>
          <div class="board-actions">
            <button class="btn-icon" onclick="window.portal.modules.phases.moodboard.addImages()">
              <span>📷</span> Add Images
            </button>
            <button class="btn-icon" onclick="window.portal.modules.phases.moodboard.addNote()">
              <span>📝</span> Add Note
            </button>
            <button class="btn-icon" onclick="window.portal.modules.phases.moodboard.shareBoard()">
              <span>🔗</span> Share
            </button>
          </div>
        </div>

        <div class="board-content">
          <div class="board-grid" id="moodboard-grid">
            ${this.renderBoardItems()}
          </div>
        </div>

        <div class="board-sidebar">
          <h4>Board Details</h4>
          <div class="board-stats">
            <div class="stat">
              <span class="stat-value">${this.currentBoard.images.length}</span>
              <span class="stat-label">Images</span>
            </div>
            <div class="stat">
              <span class="stat-value">${this.currentBoard.notes.length}</span>
              <span class="stat-label">Notes</span>
            </div>
          </div>

          <div class="color-palette">
            <h4>Extracted Colors</h4>
            <div class="color-swatches">
              ${this.currentBoard.colors.map(color => `
                <div class="color-swatch" style="background-color: ${color.hex}" 
                     title="${color.hex}" onclick="window.portal.modules.phases.moodboard.copyColor('${color.hex}')"></div>
              `).join('')}
            </div>
          </div>

          <div class="board-description">
            <h4>Description</h4>
            <textarea id="board-description" placeholder="Add a description..."
                      onblur="window.portal.modules.phases.moodboard.updateDescription()">${this.currentBoard.description || ''}</textarea>
          </div>
        </div>
      </div>
    `;
  }

  renderBoardItems() {
    const items = [
      ...this.currentBoard.images.map(img => ({ type: 'image', data: img })),
      ...this.currentBoard.notes.map(note => ({ type: 'note', data: note }))
    ];

    return items.map(item => {
      if (item.type === 'image') {
        return `
          <div class="board-item image-item" data-id="${item.data.id}">
            <img src="${item.data.url}" alt="${item.data.caption || ''}" 
                 onclick="window.portal.modules.phases.moodboard.viewImage('${item.data.id}')">
            <div class="item-actions">
              <button class="btn-icon-small" onclick="window.portal.modules.phases.moodboard.editCaption('${item.data.id}')">
                ✏️
              </button>
              <button class="btn-icon-small" onclick="window.portal.modules.phases.moodboard.removeItem('image', '${item.data.id}')">
                🗑️
              </button>
            </div>
            ${item.data.caption ? `<p class="item-caption">${item.data.caption}</p>` : ''}
          </div>
        `;
      } else {
        return `
          <div class="board-item note-item" data-id="${item.data.id}" 
               style="background-color: ${item.data.color}">
            <div class="note-content">
              <p>${item.data.text}</p>
            </div>
            <div class="item-actions">
              <button class="btn-icon-small" onclick="window.portal.modules.phases.moodboard.editNote('${item.data.id}')">
                ✏️
              </button>
              <button class="btn-icon-small" onclick="window.portal.modules.phases.moodboard.removeItem('note', '${item.data.id}')">
                🗑️
              </button>
            </div>
          </div>
        `;
      }
    }).join('');
  }

  async loadMoodboards() {
    try {
      const response = await fetch(`/api/projects/${this.projectId}/moodboards`, {
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        this.moodboards = data.moodboards;
      }
    } catch (error) {
      console.error('Error loading moodboards:', error);
    }
  }

  async createNewBoard() {
    const name = prompt('Enter a name for your mood board:');
    if (!name) return;

    try {
      const response = await fetch(`/api/projects/${this.projectId}/moodboards`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name })
      });

      const data = await response.json();
      
      if (data.success) {
        this.moodboards.push(data.moodboard);
        this.openBoard(data.moodboard.id);
      }
    } catch (error) {
      console.error('Error creating moodboard:', error);
      this.portal.showNotification('Failed to create mood board', 'error');
    }
  }

  openBoard(boardId) {
    this.currentBoard = this.moodboards.find(b => b.id === boardId) || {
      id: boardId,
      name: 'Untitled Board',
      images: [],
      notes: [],
      colors: [],
      description: ''
    };
    
    const container = document.querySelector('.moodboard-module');
    if (container) {
      this.render(container.parentElement);
    }
  }

  backToList() {
    this.currentBoard = null;
    const container = document.querySelector('.moodboard-module');
    if (container) {
      this.render(container.parentElement);
    }
  }

  async addImages() {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = 'image/*';
    
    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      
      for (const file of files) {
        try {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('moodboard_id', this.currentBoard.id);
          
          const response = await fetch(`/api/projects/${this.projectId}/moodboards/upload`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${this.portal.authToken}`
            },
            body: formData
          });
          
          const data = await response.json();
          
          if (data.success) {
            this.currentBoard.images.push(data.image);
            
            // Extract colors from image
            if (data.colors) {
              this.currentBoard.colors.push(...data.colors);
            }
          }
        } catch (error) {
          console.error('Error uploading image:', error);
        }
      }
      
      // Re-render board
      const container = document.querySelector('.moodboard-module');
      if (container) {
        this.render(container.parentElement);
      }
    };
    
    input.click();
  }

  addNote() {
    const text = prompt('Enter your note:');
    if (!text) return;

    const note = {
      id: Date.now().toString(),
      text,
      color: this.getRandomNoteColor(),
      created_at: new Date().toISOString()
    };

    this.currentBoard.notes.push(note);
    
    // Re-render board
    const gridContainer = document.getElementById('moodboard-grid');
    if (gridContainer) {
      gridContainer.innerHTML = this.renderBoardItems();
    }
  }

  getRandomNoteColor() {
    const colors = ['#FFE4B5', '#E0BBE4', '#B5E0D5', '#FFD1DC', '#E4E0B5'];
    return colors[Math.floor(Math.random() * colors.length)];
  }

  viewImage(imageId) {
    const image = this.currentBoard.images.find(img => img.id === imageId);
    if (!image) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-content image-viewer">
        <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
        <img src="${image.url}" alt="${image.caption || ''}">
        ${image.caption ? `<p class="image-caption">${image.caption}</p>` : ''}
      </div>
    `;
    
    document.body.appendChild(modal);
  }

  async editCaption(imageId) {
    const image = this.currentBoard.images.find(img => img.id === imageId);
    if (!image) return;

    const newCaption = prompt('Edit caption:', image.caption || '');
    if (newCaption === null) return;

    image.caption = newCaption;
    
    // Update in backend
    await this.saveBoardChanges();
    
    // Re-render
    const gridContainer = document.getElementById('moodboard-grid');
    if (gridContainer) {
      gridContainer.innerHTML = this.renderBoardItems();
    }
  }

  async removeItem(type, itemId) {
    if (!confirm('Are you sure you want to remove this item?')) return;

    if (type === 'image') {
      this.currentBoard.images = this.currentBoard.images.filter(img => img.id !== itemId);
    } else {
      this.currentBoard.notes = this.currentBoard.notes.filter(note => note.id !== itemId);
    }

    await this.saveBoardChanges();
    
    // Re-render
    const gridContainer = document.getElementById('moodboard-grid');
    if (gridContainer) {
      gridContainer.innerHTML = this.renderBoardItems();
    }
  }

  async updateDescription() {
    const textarea = document.getElementById('board-description');
    if (textarea) {
      this.currentBoard.description = textarea.value;
      await this.saveBoardChanges();
    }
  }

  async saveBoardChanges() {
    try {
      await fetch(`/api/projects/${this.projectId}/moodboards/${this.currentBoard.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.portal.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(this.currentBoard)
      });
    } catch (error) {
      console.error('Error saving moodboard:', error);
    }
  }

  copyColor(hex) {
    navigator.clipboard.writeText(hex).then(() => {
      this.portal.showNotification(`Color ${hex} copied to clipboard`, 'success');
    });
  }

  shareBoard() {
    const shareUrl = `${window.location.origin}/share/moodboard/${this.currentBoard.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      this.portal.showNotification('Share link copied to clipboard', 'success');
    });
  }

  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 3600000) {
      return `${Math.floor(diff / 60000)} minutes ago`;
    } else if (diff < 86400000) {
      return `${Math.floor(diff / 3600000)} hours ago`;
    } else {
      return date.toLocaleDateString();
    }
  }
}

export default MoodboardModule;