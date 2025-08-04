/**
 * ProofChecklist Component
 * Interactive checklist for client proof approval workflow
 * Supports real-time collaboration and accessibility
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BRAND } from '../config/brand.js';

const ProofChecklist = ({
  projectId,
  phaseId,
  initialItems = [],
  isReadOnly = false,
  onItemChange = () => {},
  onComplete = () => {},
  className = '',
  websocketConnection = null,
  currentUser = null
}) => {
  const [items, setItems] = useState(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [undoStack, setUndoStack] = useState([]);
  const [newItemText, setNewItemText] = useState('');
  const [focusedItemId, setFocusedItemId] = useState(null);
  
  const newItemInputRef = useRef(null);
  const checklistRef = useRef(null);

  // Calculate completion progress
  const completedCount = items.filter(item => item.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const isComplete = totalCount > 0 && completedCount === totalCount;

  // Load checklist data
  useEffect(() => {
    if (projectId && phaseId) {
      loadChecklist();
    }
  }, [projectId, phaseId]);

  // WebSocket real-time updates
  useEffect(() => {
    if (websocketConnection && projectId) {
      const handleChecklistUpdate = (data) => {
        if (data.project_id === projectId && data.phase_id === phaseId) {
          setItems(prevItems => {
            const updatedItems = [...prevItems];
            const itemIndex = updatedItems.findIndex(item => item.id === data.item_id);
            if (itemIndex !== -1) {
              updatedItems[itemIndex] = { ...updatedItems[itemIndex], ...data.updates };
            }
            return updatedItems;
          });
        }
      };

      websocketConnection.on('proof_checklist_updated', handleChecklistUpdate);
      return () => websocketConnection.off('proof_checklist_updated', handleChecklistUpdate);
    }
  }, [websocketConnection, projectId, phaseId]);

  const loadChecklist = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/proof-checklist`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to load checklist: ${response.status}`);
      }

      const data = await response.json();
      setItems(data.items || []);
    } catch (err) {
      setError('Unable to load proof checklist. Please try again.');
      console.error('Checklist load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const saveItemChange = async (itemId, updates) => {
    try {
      const response = await fetch(`/api/proof-checklist/items/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          ...updates,
          updated_by: currentUser?.id,
          updated_at: new Date().toISOString()
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to save item: ${response.status}`);
      }

      const updatedItem = await response.json();
      onItemChange(updatedItem);
      
      return updatedItem;
    } catch (err) {
      setError('Unable to save changes. Please try again.');
      throw err;
    }
  };

  const handleItemToggle = useCallback(async (itemId) => {
    if (isReadOnly || isSubmitting) return;

    const item = items.find(i => i.id === itemId);
    if (!item) return;

    // Store undo state
    setUndoStack(prev => [...prev.slice(-4), { items: [...items] }]);

    // Optimistic update
    const newCompleted = !item.completed;
    setItems(prev => prev.map(i => 
      i.id === itemId 
        ? { 
            ...i, 
            completed: newCompleted,
            completed_at: newCompleted ? new Date().toISOString() : null,
            completed_by: newCompleted ? currentUser?.name : null
          }
        : i
    ));

    try {
      await saveItemChange(itemId, { 
        completed: newCompleted,
        completed_at: newCompleted ? new Date().toISOString() : null,
        completed_by: newCompleted ? currentUser?.id : null
      });
    } catch (err) {
      // Revert on error
      setItems(prev => prev.map(i => 
        i.id === itemId ? { ...i, completed: item.completed } : i
      ));
    }
  }, [items, isReadOnly, isSubmitting, currentUser]);

  const handleItemNotesChange = useCallback(async (itemId, notes) => {
    if (isReadOnly) return;

    setItems(prev => prev.map(i => 
      i.id === itemId ? { ...i, notes, notes_updated_by: currentUser?.name } : i
    ));

    try {
      await saveItemChange(itemId, { 
        notes,
        notes_updated_by: currentUser?.id
      });
    } catch (err) {
      // Could implement more sophisticated error handling here
    }
  }, [isReadOnly, currentUser]);

  const addNewItem = async () => {
    if (!newItemText.trim() || isReadOnly || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      const response = await fetch(`/api/projects/${projectId}/phases/${phaseId}/proof-checklist/items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          description: newItemText.trim(),
          required: true,
          created_by: currentUser?.id
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to add item: ${response.status}`);
      }

      const newItem = await response.json();
      setItems(prev => [...prev, newItem]);
      setNewItemText('');
      
      // Focus the new item for immediate interaction
      setTimeout(() => setFocusedItemId(newItem.id), 100);
      
    } catch (err) {
      setError('Unable to add new item. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const removeItem = async (itemId) => {
    if (isReadOnly || isSubmitting) return;

    // Store undo state
    setUndoStack(prev => [...prev.slice(-4), { items: [...items] }]);

    const itemToRemove = items.find(i => i.id === itemId);
    setItems(prev => prev.filter(i => i.id !== itemId));

    try {
      const response = await fetch(`/api/proof-checklist/items/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to remove item: ${response.status}`);
      }
    } catch (err) {
      // Restore item on error
      setItems(prev => [...prev, itemToRemove].sort((a, b) => a.sort_order - b.sort_order));
      setError('Unable to remove item. Please try again.');
    }
  };

  const handleUndo = () => {
    if (undoStack.length === 0 || isReadOnly) return;
    
    const lastState = undoStack[undoStack.length - 1];
    setItems(lastState.items);
    setUndoStack(prev => prev.slice(0, -1));
  };

  const handleKeyDown = (event, itemId) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handleItemToggle(itemId);
    }
  };

  const handleCompleteChecklist = async () => {
    if (!isComplete || isSubmitting) return;

    setIsSubmitting(true);
    
    try {
      await onComplete({
        projectId,
        phaseId,
        completedItems: items.filter(i => i.completed),
        completionPercentage: progressPercentage,
        completedBy: currentUser?.id,
        completedAt: new Date().toISOString()
      });
    } catch (err) {
      setError('Unable to complete checklist. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="proof-checklist loading" role="status" aria-label="Loading checklist">
        <div className="skeleton-item"></div>
        <div className="skeleton-item"></div>
        <div className="skeleton-item"></div>
      </div>
    );
  }

  return (
    <div 
      className={`proof-checklist ${className}`}
      ref={checklistRef}
      role="region"
      aria-label="Proof approval checklist"
    >
      <div className="checklist-header">
        <div className="progress-section">
          <h3 className="checklist-title">Proof Approval Checklist</h3>
          <div className="progress-bar" role="progressbar" aria-valuenow={progressPercentage} aria-valuemin="0" aria-valuemax="100">
            <div 
              className="progress-fill" 
              style={{ width: `${progressPercentage}%` }}
              aria-label={`${progressPercentage}% complete`}
            ></div>
          </div>
          <div className="progress-text">
            {completedCount} of {totalCount} items completed ({progressPercentage}%)
          </div>
        </div>

        {undoStack.length > 0 && !isReadOnly && (
          <button 
            className="undo-button"
            onClick={handleUndo}
            aria-label="Undo last change"
            disabled={isSubmitting}
          >
            ↶ Undo
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

      <div className="checklist-items">
        {items.map((item, index) => (
          <div 
            key={item.id}
            className={`checklist-item ${item.completed ? 'completed' : ''} ${focusedItemId === item.id ? 'focused' : ''}`}
            role="listitem"
          >
            <div className="item-checkbox-section">
              <button
                className={`item-checkbox ${item.completed ? 'checked' : ''}`}
                onClick={() => handleItemToggle(item.id)}
                onKeyDown={(e) => handleKeyDown(e, item.id)}
                disabled={isReadOnly || isSubmitting}
                aria-checked={item.completed}
                aria-label={`${item.completed ? 'Completed' : 'Not completed'}: ${item.description}`}
                role="checkbox"
              >
                {item.completed && <span className="checkmark">✓</span>}
              </button>
            </div>

            <div className="item-content">
              <div className="item-description">
                {item.description}
                {item.required && <span className="required-indicator" aria-label="Required">*</span>}
              </div>
              
              {item.completed && item.completed_by && (
                <div className="completion-info">
                  Approved by {item.completed_by} on {new Date(item.completed_at).toLocaleDateString()}
                </div>
              )}

              <textarea
                className="item-notes"
                placeholder="Add approval notes or feedback..."
                value={item.notes || ''}
                onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                disabled={isReadOnly}
                aria-label={`Notes for ${item.description}`}
                rows="2"
              />
            </div>

            {!isReadOnly && (
              <button
                className="remove-item"
                onClick={() => removeItem(item.id)}
                disabled={isSubmitting}
                aria-label={`Remove ${item.description}`}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>

      {!isReadOnly && (
        <div className="add-item-section">
          <div className="add-item-input">
            <input
              ref={newItemInputRef}
              type="text"
              placeholder="Add new checklist item..."
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addNewItem()}
              disabled={isSubmitting}
              aria-label="New checklist item description"
            />
            <button
              className="add-item-button"
              onClick={addNewItem}
              disabled={!newItemText.trim() || isSubmitting}
              aria-label="Add new item to checklist"
            >
              + Add Item
            </button>
          </div>
        </div>
      )}

      {isComplete && !isReadOnly && (
        <div className="completion-section">
          <button
            className="complete-checklist-button"
            onClick={handleCompleteChecklist}
            disabled={isSubmitting}
            aria-label="Complete proof checklist and advance to next phase"
          >
            {isSubmitting ? 'Completing...' : 'Complete Proof Approval ✓'}
          </button>
        </div>
      )}

      <style jsx>{`
        .proof-checklist {
          background: ${BRAND.colors.bone};
          border: 1px solid ${BRAND.colors.border};
          border-radius: 8px;
          padding: 24px;
          font-family: ${BRAND.typography.fontFamily};
          max-width: 800px;
          margin: 0 auto;
        }

        .checklist-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .progress-section {
          flex: 1;
        }

        .checklist-title {
          font-size: 1.25rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0 0 12px 0;
        }

        .progress-bar {
          width: 100%;
          height: 8px;
          background: ${BRAND.colors.borderLight};
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${BRAND.colors.green}, ${BRAND.colors.blue});
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.875rem;
          color: ${BRAND.colors.textSecondary};
          font-weight: ${BRAND.typography.weights.medium};
        }

        .undo-button {
          background: ${BRAND.colors.boneLight};
          border: 1px solid ${BRAND.colors.border};
          padding: 8px 16px;
          border-radius: 6px;
          color: ${BRAND.colors.blue};
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .undo-button:hover {
          background: ${BRAND.colors.hover};
          border-color: ${BRAND.colors.blue};
        }

        .undo-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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

        .checklist-items {
          space-y: 12px;
        }

        .checklist-item {
          display: flex;
          align-items: flex-start;
          gap: 12px;
          padding: 16px;
          background: ${BRAND.colors.white};
          border: 1px solid ${BRAND.colors.borderLight};
          border-radius: 6px;
          margin-bottom: 12px;
          transition: all 0.2s ease;
        }

        .checklist-item:hover {
          border-color: ${BRAND.colors.blue};
          box-shadow: 0 2px 8px ${BRAND.colors.shadow};
        }

        .checklist-item.completed {
          background: ${BRAND.colors.accentGreen};
          border-color: ${BRAND.colors.green};
        }

        .checklist-item.focused {
          outline: 2px solid ${BRAND.colors.focus};
          outline-offset: 2px;
        }

        .item-checkbox {
          width: 24px;
          height: 24px;
          border: 2px solid ${BRAND.colors.border};
          border-radius: 4px;
          background: ${BRAND.colors.white};
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          flex-shrink: 0;
        }

        .item-checkbox:hover {
          border-color: ${BRAND.colors.blue};
        }

        .item-checkbox.checked {
          background: ${BRAND.colors.green};
          border-color: ${BRAND.colors.green};
        }

        .item-checkbox:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .checkmark {
          color: ${BRAND.colors.white};
          font-weight: ${BRAND.typography.weights.bold};
          font-size: 0.875rem;
        }

        .item-content {
          flex: 1;
          min-width: 0;
        }

        .item-description {
          font-weight: ${BRAND.typography.weights.medium};
          color: ${BRAND.colors.text};
          margin-bottom: 8px;
          line-height: 1.4;
        }

        .required-indicator {
          color: ${BRAND.colors.red};
          margin-left: 4px;
          font-weight: ${BRAND.typography.weights.bold};
        }

        .completion-info {
          font-size: 0.75rem;
          color: ${BRAND.colors.textSecondary};
          margin-bottom: 8px;
          font-style: italic;
        }

        .item-notes {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid ${BRAND.colors.borderLight};
          border-radius: 4px;
          font-size: 0.875rem;
          font-family: ${BRAND.typography.fontFamily};
          resize: vertical;
          min-height: 36px;
          background: ${BRAND.colors.boneLight};
        }

        .item-notes:focus {
          outline: 2px solid ${BRAND.colors.focus};
          outline-offset: 2px;
          border-color: ${BRAND.colors.blue};
        }

        .item-notes:disabled {
          background: ${BRAND.colors.borderSubtle};
          cursor: not-allowed;
        }

        .remove-item {
          background: none;
          border: none;
          color: ${BRAND.colors.textMuted};
          cursor: pointer;
          font-size: 1.5rem;
          padding: 4px 8px;
          border-radius: 4px;
          flex-shrink: 0;
          transition: all 0.2s ease;
        }

        .remove-item:hover {
          background: ${BRAND.colors.accentRed};
          color: ${BRAND.colors.red};
        }

        .add-item-section {
          margin-top: 16px;
          padding-top: 16px;
          border-top: 1px solid ${BRAND.colors.borderLight};
        }

        .add-item-input {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .add-item-input input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid ${BRAND.colors.border};
          border-radius: 6px;
          font-size: 0.875rem;
          font-family: ${BRAND.typography.fontFamily};
          background: ${BRAND.colors.white};
        }

        .add-item-input input:focus {
          outline: 2px solid ${BRAND.colors.focus};
          outline-offset: 2px;
          border-color: ${BRAND.colors.blue};
        }

        .add-item-button {
          background: ${BRAND.colors.blue};
          color: ${BRAND.colors.white};
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .add-item-button:hover {
          background: ${BRAND.colors.blue}dd;
          transform: translateY(-1px);
        }

        .add-item-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .completion-section {
          margin-top: 24px;
          padding-top: 24px;
          border-top: 1px solid ${BRAND.colors.borderLight};
          text-align: center;
        }

        .complete-checklist-button {
          background: ${BRAND.colors.green};
          color: ${BRAND.colors.white};
          border: none;
          padding: 16px 32px;
          border-radius: 8px;
          font-size: 1rem;
          font-weight: ${BRAND.typography.weights.semibold};
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(39, 174, 96, 0.2);
        }

        .complete-checklist-button:hover {
          background: ${BRAND.colors.green}dd;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(39, 174, 96, 0.3);
        }

        .complete-checklist-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
          box-shadow: none;
        }

        .loading {
          padding: 24px;
        }

        .skeleton-item {
          height: 60px;
          background: linear-gradient(90deg, ${BRAND.colors.borderLight} 25%, ${BRAND.colors.borderSubtle} 50%, ${BRAND.colors.borderLight} 75%);
          background-size: 200% 100%;
          animation: loading 1.5s infinite;
          border-radius: 6px;
          margin-bottom: 12px;
        }

        @keyframes loading {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @media (max-width: 768px) {
          .proof-checklist {
            padding: 16px;
            margin: 0 8px;
          }

          .checklist-header {
            flex-direction: column;
            gap: 16px;
          }

          .checklist-item {
            padding: 12px;
            gap: 8px;
          }

          .add-item-input {
            flex-direction: column;
            align-items: stretch;
          }

          .add-item-button {
            width: 100%;
          }

          .item-notes {
            font-size: 16px; /* Prevent zoom on iOS */
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

export default ProofChecklist;