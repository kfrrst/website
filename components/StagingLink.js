/**
 * StagingLink Component
 * Secure staging environment preview and link generation
 * Supports access control, expiration, and permission management
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BRAND } from '../config/brand.js';

const StagingLink = ({
  projectId,
  phaseId,
  existingLinks = [],
  currentUser = null,
  permissions = { canCreate: true, canDelete: true, canShare: true },
  onLinkGenerated = () => {},
  onLinkDeleted = () => {},
  onLinkAccessed = () => {},
  className = '',
  maxLinks = 5,
  defaultExpiration = 7200000 // 2 hours in milliseconds
}) => {
  const [links, setLinks] = useState(existingLinks);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [previewModal, setPreviewModal] = useState(null);
  const [copyFeedback, setCopyFeedback] = useState(null);
  
  // Form state for new link creation
  const [newLinkForm, setNewLinkForm] = useState({
    expirationHours: 2,
    accessLevel: 'view',
    passwordProtected: false,
    password: '',
    description: ''
  });

  const copyTimeoutRef = useRef(null);

  // Access level configurations
  const accessLevels = {
    view: {
      label: 'View Only',
      description: 'Can view staging environment, no downloads',
      icon: '👁️',
      color: BRAND.colors.blue
    },
    download: {
      label: 'View & Download',
      description: 'Can view and download files',
      icon: '📥',
      color: BRAND.colors.green
    },
    comment: {
      label: 'View & Comment',
      description: 'Can view and leave feedback comments',
      icon: '💬',
      color: BRAND.colors.yellow
    },
    full: {
      label: 'Full Access',
      description: 'View, download, and comment access',
      icon: '🔓',
      color: BRAND.colors.textSecondary
    }
  };

  // Load existing links
  useEffect(() => {
    if (projectId && phaseId) {
      loadStagingLinks();
    }
  }, [projectId, phaseId]);

  const loadStagingLinks = async () => {
    try {
      const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/staging-links`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load staging links: ${response.status}`);
      }

      const data = await response.json();
      setLinks(data.links || []);
    } catch (err) {
      setError('Unable to load staging links. Please try again.');
      console.error('Staging links load error:', err);
    }
  };

  const generateStagingLink = async () => {
    if (isGenerating || !permissions.canCreate) return;
    
    if (links.length >= maxLinks) {
      setError(`Maximum of ${maxLinks} staging links allowed. Please delete an existing link first.`);
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const expirationTime = new Date(Date.now() + (newLinkForm.expirationHours * 60 * 60 * 1000));
      
      const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/staging-links`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          expires_at: expirationTime.toISOString(),
          access_level: newLinkForm.accessLevel,
          password_protected: newLinkForm.passwordProtected,
          password: newLinkForm.passwordProtected ? newLinkForm.password : null,
          description: newLinkForm.description || null,
          created_by: currentUser?.id
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to generate staging link: ${response.status}`);
      }

      const newLink = await response.json();
      setLinks(prev => [newLink, ...prev]);
      setShowCreateForm(false);
      setNewLinkForm({
        expirationHours: 2,
        accessLevel: 'view',
        passwordProtected: false,
        password: '',
        description: ''
      });
      
      onLinkGenerated(newLink);
      
    } catch (err) {
      setError(err.message || 'Unable to generate staging link. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const deleteStagingLink = async (linkId) => {
    if (!permissions.canDelete) return;

    try {
      const response = await fetch(`/api/staging-links/${linkId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete staging link: ${response.status}`);
      }

      setLinks(prev => prev.filter(link => link.id !== linkId));
      onLinkDeleted(linkId);
      
    } catch (err) {
      setError('Unable to delete staging link. Please try again.');
    }
  };

  const copyToClipboard = async (text, linkId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(linkId);
      
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
      
      copyTimeoutRef.current = setTimeout(() => {
        setCopyFeedback(null);
      }, 2000);
      
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopyFeedback(linkId);
      copyTimeoutRef.current = setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  const openPreview = (link) => {
    setPreviewModal(link);
    onLinkAccessed(link);
  };

  const formatTimeRemaining = (expirationDate) => {
    const now = Date.now();
    const expiration = new Date(expirationDate).getTime();
    const remaining = expiration - now;
    
    if (remaining <= 0) return 'Expired';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h remaining`;
    } else if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const isLinkExpired = (expirationDate) => {
    return new Date(expirationDate).getTime() <= Date.now();
  };

  const getAccessLevelConfig = (level) => {
    return accessLevels[level] || accessLevels.view;
  };

  return (
    <div className={`staging-link ${className}`} role="region" aria-label="Staging link management">
      <div className="staging-header">
        <div className="header-content">
          <h3 className="staging-title">Staging Links</h3>
          <p className="staging-description">
            Share secure preview links with clients and stakeholders
          </p>
        </div>
        
        {permissions.canCreate && (
          <button
            className="create-link-button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            disabled={links.length >= maxLinks}
            aria-label="Create new staging link"
          >
            + New Link
          </button>
        )}
      </div>

      {error && (
        <div className="error-message" role="alert">
          <span className="error-icon">⚠️</span>
          {error}
          <button 
            className="error-dismiss"
            onClick={() => setError(null)}
            aria-label="Dismiss error"
          >
            ×
          </button>
        </div>
      )}

      {/* Create Link Form */}
      {showCreateForm && (
        <div className="create-form">
          <h4 className="form-title">Create New Staging Link</h4>
          
          <div className="form-row">
            <label className="form-label">
              Access Level
              <select
                value={newLinkForm.accessLevel}
                onChange={(e) => setNewLinkForm(prev => ({ ...prev, accessLevel: e.target.value }))}
                className="form-select"
              >
                {Object.entries(accessLevels).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label} - {config.description}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="form-label">
              Expiration
              <select
                value={newLinkForm.expirationHours}
                onChange={(e) => setNewLinkForm(prev => ({ ...prev, expirationHours: parseInt(e.target.value) }))}
                className="form-select"
              >
                <option value={1}>1 hour</option>
                <option value={2}>2 hours</option>
                <option value={6}>6 hours</option>
                <option value={24}>24 hours</option>
                <option value={72}>3 days</option>
                <option value={168}>1 week</option>
              </select>
            </label>
          </div>

          <div className="form-row">
            <label className="form-checkbox">
              <input
                type="checkbox"
                checked={newLinkForm.passwordProtected}
                onChange={(e) => setNewLinkForm(prev => ({ ...prev, passwordProtected: e.target.checked }))}
              />
              Password protect this link
            </label>
          </div>

          {newLinkForm.passwordProtected && (
            <div className="form-row">
              <label className="form-label">
                Password
                <input
                  type="password"
                  value={newLinkForm.password}
                  onChange={(e) => setNewLinkForm(prev => ({ ...prev, password: e.target.value }))}
                  className="form-input"
                  placeholder="Enter password"
                  required
                />
              </label>
            </div>
          )}

          <div className="form-row">
            <label className="form-label">
              Description (optional)
              <input
                type="text"
                value={newLinkForm.description}
                onChange={(e) => setNewLinkForm(prev => ({ ...prev, description: e.target.value }))}
                className="form-input"
                placeholder="Internal note about this link"
              />
            </label>
          </div>

          <div className="form-actions">
            <button
              className="generate-button"
              onClick={generateStagingLink}
              disabled={isGenerating || (newLinkForm.passwordProtected && !newLinkForm.password.trim())}
            >
              {isGenerating ? 'Generating...' : 'Generate Link'}
            </button>
            <button
              className="cancel-button"
              onClick={() => setShowCreateForm(false)}
              disabled={isGenerating}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Links List */}
      <div className="links-list" role="list">
        {links.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔗</span>
            <h4 className="empty-title">No staging links yet</h4>
            <p className="empty-description">
              Create a staging link to share your project preview with clients and stakeholders.
            </p>
          </div>
        ) : (
          links.map((link) => {
            const accessConfig = getAccessLevelConfig(link.access_level);
            const expired = isLinkExpired(link.expires_at);
            const timeRemaining = formatTimeRemaining(link.expires_at);
            
            return (
              <div 
                key={link.id}
                className={`link-item ${expired ? 'expired' : ''}`}
                role="listitem"
              >
                <div className="link-info">
                  <div className="link-header">
                    <span className="access-badge" style={{ color: accessConfig.color }}>
                      {accessConfig.icon} {accessConfig.label}
                    </span>
                    <span className={`expiration-status ${expired ? 'expired' : ''}`}>
                      {timeRemaining}
                    </span>
                  </div>
                  
                  {link.description && (
                    <p className="link-description">{link.description}</p>
                  )}
                  
                  <div className="link-url">
                    <input
                      type="text"
                      value={link.staging_url}
                      readOnly
                      className="url-input"
                      aria-label="Staging link URL"
                    />
                  </div>
                  
                  <div className="link-meta">
                    Created {new Date(link.created_at).toLocaleDateString()}
                    {link.access_count > 0 && (
                      <span className="access-count"> • {link.access_count} access{link.access_count !== 1 ? 'es' : ''}</span>
                    )}
                    {link.password_protected && (
                      <span className="password-indicator"> • 🔒 Password protected</span>
                    )}
                  </div>
                </div>

                <div className="link-actions">
                  <button
                    className="copy-button"
                    onClick={() => copyToClipboard(link.staging_url, link.id)}
                    aria-label="Copy staging link to clipboard"
                  >
                    {copyFeedback === link.id ? '✓ Copied!' : '📋 Copy'}
                  </button>
                  
                  {!expired && (
                    <button
                      className="preview-button"
                      onClick={() => openPreview(link)}
                      aria-label="Preview staging environment"
                    >
                      👁️ Preview
                    </button>
                  )}
                  
                  {permissions.canDelete && (
                    <button
                      className="delete-button"
                      onClick={() => deleteStagingLink(link.id)}
                      aria-label="Delete staging link"
                    >
                      🗑️ Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Preview Modal */}
      {previewModal && (
        <div className="preview-overlay" onClick={() => setPreviewModal(null)}>
          <div className="preview-modal" onClick={(e) => e.stopPropagation()}>
            <div className="preview-header">
              <h4 className="preview-title">Staging Preview</h4>
              <button
                className="close-button"
                onClick={() => setPreviewModal(null)}
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            
            <div className="preview-content">
              <iframe
                src={previewModal.staging_url}
                className="preview-iframe"
                title="Staging environment preview"
                sandbox="allow-scripts allow-same-origin allow-forms"
              />
            </div>
            
            <div className="preview-footer">
              <a
                href={previewModal.staging_url}
                target="_blank"
                rel="noopener noreferrer"
                className="open-new-tab"
              >
                🔗 Open in New Tab
              </a>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        .staging-link {
          background: ${BRAND.colors.bone};
          border: 1px solid ${BRAND.colors.border};
          border-radius: 8px;
          padding: 24px;
          font-family: ${BRAND.typography.fontFamily};
          max-width: 800px;
          margin: 0 auto;
        }

        .staging-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
        }

        .header-content {
          flex: 1;
        }

        .staging-title {
          font-size: 1.25rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0 0 4px 0;
        }

        .staging-description {
          font-size: 0.875rem;
          color: ${BRAND.colors.textSecondary};
          margin: 0;
        }

        .create-link-button {
          background: ${BRAND.colors.blue};
          color: ${BRAND.colors.white};
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .create-link-button:hover {
          background: ${BRAND.colors.blue}dd;
          transform: translateY(-1px);
        }

        .create-link-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .error-message {
          background: ${BRAND.colors.accentRed};
          border: 1px solid ${BRAND.colors.red};
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${BRAND.colors.red};
          font-weight: ${BRAND.typography.weights.medium};
        }

        .error-dismiss {
          background: none;
          border: none;
          color: ${BRAND.colors.red};
          cursor: pointer;
          font-size: 1.2rem;
          margin-left: auto;
          padding: 0 4px;
          border-radius: 2px;
        }

        .error-dismiss:hover {
          background: rgba(230, 57, 70, 0.1);
        }

        .create-form {
          background: ${BRAND.colors.white};
          border: 1px solid ${BRAND.colors.borderLight};
          border-radius: 6px;
          padding: 20px;
          margin-bottom: 20px;
        }

        .form-title {
          font-size: 1rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0 0 16px 0;
        }

        .form-row {
          margin-bottom: 16px;
        }

        .form-label {
          display: block;
          font-size: 0.875rem;
          font-weight: ${BRAND.typography.weights.medium};
          color: ${BRAND.colors.text};
          margin-bottom: 6px;
        }

        .form-input, .form-select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid ${BRAND.colors.border};
          border-radius: 4px;
          font-size: 0.875rem;
          font-family: ${BRAND.typography.fontFamily};
          background: ${BRAND.colors.white};
        }

        .form-input:focus, .form-select:focus {
          outline: 2px solid ${BRAND.colors.focus};
          outline-offset: 2px;
          border-color: ${BRAND.colors.blue};
        }

        .form-checkbox {
          display: flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .form-checkbox input[type="checkbox"] {
          width: 16px;
          height: 16px;
        }

        .form-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
        }

        .generate-button {
          background: ${BRAND.colors.green};
          color: ${BRAND.colors.white};
          border: none;
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .generate-button:hover {
          background: ${BRAND.colors.green}dd;
        }

        .generate-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .cancel-button {
          background: ${BRAND.colors.boneLight};
          color: ${BRAND.colors.textSecondary};
          border: 1px solid ${BRAND.colors.border};
          padding: 10px 20px;
          border-radius: 6px;
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cancel-button:hover {
          background: ${BRAND.colors.hover};
        }

        .links-list {
          space-y: 16px;
        }

        .empty-state {
          text-align: center;
          padding: 40px 20px;
          color: ${BRAND.colors.textSecondary};
        }

        .empty-icon {
          font-size: 3rem;
          display: block;
          margin-bottom: 16px;
        }

        .empty-title {
          font-size: 1.125rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0 0 8px 0;
        }

        .empty-description {
          font-size: 0.875rem;
          margin: 0;
          max-width: 400px;
          margin-left: auto;
          margin-right: auto;
        }

        .link-item {
          background: ${BRAND.colors.white};
          border: 1px solid ${BRAND.colors.borderLight};
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
          display: flex;
          gap: 16px;
          align-items: flex-start;
          transition: all 0.2s ease;
        }

        .link-item:hover {
          border-color: ${BRAND.colors.blue};
          box-shadow: 0 2px 8px ${BRAND.colors.shadow};
        }

        .link-item.expired {
          opacity: 0.6;
          background: ${BRAND.colors.borderSubtle};
        }

        .link-info {
          flex: 1;
          min-width: 0;
        }

        .link-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }

        .access-badge {
          font-size: 0.75rem;
          font-weight: ${BRAND.typography.weights.semibold};
          padding: 4px 8px;
          background: ${BRAND.colors.boneLight};
          border-radius: 12px;
          border: 1px solid currentColor;
        }

        .expiration-status {
          font-size: 0.75rem;
          color: ${BRAND.colors.textSecondary};
        }

        .expiration-status.expired {
          color: ${BRAND.colors.red};
          font-weight: ${BRAND.typography.weights.semibold};
        }

        .link-description {
          font-size: 0.875rem;
          color: ${BRAND.colors.textSecondary};
          margin: 0 0 12px 0;
          font-style: italic;
        }

        .link-url {
          margin-bottom: 8px;
        }

        .url-input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid ${BRAND.colors.borderLight};
          border-radius: 4px;
          background: ${BRAND.colors.borderSubtle};
          font-size: 0.875rem;
          font-family: monospace;
          color: ${BRAND.colors.textSecondary};
        }

        .link-meta {
          font-size: 0.75rem;
          color: ${BRAND.colors.textMuted};
        }

        .access-count, .password-indicator {
          color: ${BRAND.colors.textSecondary};
        }

        .link-actions {
          display: flex;
          flex-direction: column;
          gap: 8px;
          flex-shrink: 0;
        }

        .copy-button, .preview-button, .delete-button {
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 0.75rem;
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid;
          white-space: nowrap;
        }

        .copy-button {
          background: ${BRAND.colors.blue};
          color: ${BRAND.colors.white};
          border-color: ${BRAND.colors.blue};
        }

        .copy-button:hover {
          background: ${BRAND.colors.blue}dd;
        }

        .preview-button {
          background: ${BRAND.colors.boneLight};
          color: ${BRAND.colors.textSecondary};
          border-color: ${BRAND.colors.border};
        }

        .preview-button:hover {
          background: ${BRAND.colors.hover};
          color: ${BRAND.colors.text};
        }

        .delete-button {
          background: ${BRAND.colors.boneLight};
          color: ${BRAND.colors.textSecondary};
          border-color: ${BRAND.colors.border};
        }

        .delete-button:hover {
          background: ${BRAND.colors.accentRed};
          color: ${BRAND.colors.red};
          border-color: ${BRAND.colors.red};
        }

        .preview-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: ${BRAND.colors.overlay};
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .preview-modal {
          background: ${BRAND.colors.white};
          border-radius: 8px;
          max-width: 90vw;
          max-height: 90vh;
          width: 1000px;
          height: 700px;
          display: flex;
          flex-direction: column;
          box-shadow: 0 20px 40px rgba(0, 0, 0, 0.2);
        }

        .preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid ${BRAND.colors.borderLight};
        }

        .preview-title {
          font-size: 1rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0;
        }

        .close-button {
          background: none;
          border: none;
          font-size: 1.5rem;
          color: ${BRAND.colors.textSecondary};
          cursor: pointer;
          padding: 4px 8px;
          border-radius: 4px;
          transition: all 0.2s ease;
        }

        .close-button:hover {
          background: ${BRAND.colors.hover};
          color: ${BRAND.colors.text};
        }

        .preview-content {
          flex: 1;
          position: relative;
        }

        .preview-iframe {
          width: 100%;
          height: 100%;
          border: none;
        }

        .preview-footer {
          padding: 12px 20px;
          border-top: 1px solid ${BRAND.colors.borderLight};
          text-align: center;
        }

        .open-new-tab {
          color: ${BRAND.colors.blue};
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: ${BRAND.typography.weights.medium};
        }

        .open-new-tab:hover {
          text-decoration: underline;
        }

        @media (max-width: 768px) {
          .staging-link {
            padding: 16px;
            margin: 0 8px;
          }

          .staging-header {
            flex-direction: column;
            gap: 16px;
          }

          .create-link-button {
            width: 100%;
          }

          .form-actions {
            flex-direction: column;
          }

          .generate-button, .cancel-button {
            width: 100%;
          }

          .link-item {
            flex-direction: column;
            gap: 12px;
          }

          .link-actions {
            flex-direction: row;
            justify-content: space-between;
          }

          .preview-modal {
            width: 95vw;
            height: 85vh;
          }

          .url-input {
            font-size: 12px;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
          }
        }
      `}</style>
    </div>
  );
};

export default StagingLink;