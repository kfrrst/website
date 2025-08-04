/**
 * BatchStatus Component
 * Real-time batch processing status display with progress tracking
 * Supports WebSocket updates and error handling
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BRAND } from '../config/brand.js';

const BatchStatus = ({
  batchId,
  projectId,
  initialStatus = 'queued',
  initialProgress = 0,
  batchType = 'file_processing',
  items = [],
  estimatedDuration = null,
  onStatusChange = () => {},
  onComplete = () => {},
  onError = () => {},
  websocketConnection = null,
  className = '',
  showDetails = true,
  autoRefresh = true,
  refreshInterval = 5000
}) => {
  const [status, setStatus] = useState(initialStatus);
  const [progress, setProgress] = useState(initialProgress);
  const [currentItem, setCurrentItem] = useState(null);
  const [processedItems, setProcessedItems] = useState([]);
  const [errorMessage, setErrorMessage] = useState(null);
  const [startTime, setStartTime] = useState(null);
  const [estimatedCompletion, setEstimatedCompletion] = useState(estimatedDuration);
  const [isRetrying, setIsRetrying] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  // Status configuration
  const statusConfig = {
    queued: {
      label: 'Queued',
      color: BRAND.colors.textSecondary,
      bgColor: BRAND.colors.borderLight,
      icon: '⏳',
      description: 'Waiting to start processing...'
    },
    processing: {
      label: 'Processing',
      color: BRAND.colors.blue,
      bgColor: BRAND.colors.accentBlue,
      icon: '⚡',
      description: 'Processing your files...'
    },
    completed: {
      label: 'Completed',
      color: BRAND.colors.green,
      bgColor: BRAND.colors.accentGreen,
      icon: '✅',
      description: 'All files processed successfully!'
    },
    failed: {
      label: 'Failed',
      color: BRAND.colors.red,
      bgColor: BRAND.colors.accentRed,
      icon: '❌',
      description: 'Processing failed. Please try again.'
    },
    cancelled: {
      label: 'Cancelled',
      color: BRAND.colors.textMuted,
      bgColor: BRAND.colors.borderSubtle,
      icon: '⏹️',
      description: 'Processing was cancelled.'
    },
    paused: {
      label: 'Paused',
      color: BRAND.colors.yellow,
      bgColor: BRAND.colors.accentYellow,
      icon: '⏸️',
      description: 'Processing is temporarily paused.'
    }
  };

  const currentConfig = statusConfig[status] || statusConfig.queued;
  const isActive = ['queued', 'processing', 'paused'].includes(status);
  const isFinished = ['completed', 'failed', 'cancelled'].includes(status);

  // Real-time WebSocket updates
  useEffect(() => {
    if (websocketConnection && batchId) {
      const handleBatchUpdate = (data) => {
        if (data.batch_id === batchId) {
          setStatus(data.status);
          setProgress(data.progress || 0);
          setCurrentItem(data.current_item || null);
          setEstimatedCompletion(data.estimated_completion || null);
          
          if (data.error_message) {
            setErrorMessage(data.error_message);
          }
          
          if (data.processed_items) {
            setProcessedItems(data.processed_items);
          }
          
          onStatusChange(data);
          
          if (data.status === 'completed') {
            onComplete(data);
          } else if (data.status === 'failed') {
            onError(data);
          }
        }
      };

      websocketConnection.on('batch_status_update', handleBatchUpdate);
      return () => websocketConnection.off('batch_status_update', handleBatchUpdate);
    }
  }, [websocketConnection, batchId, onStatusChange, onComplete, onError]);

  // Auto-refresh polling fallback
  useEffect(() => {
    if (autoRefresh && isActive && !websocketConnection) {
      intervalRef.current = setInterval(() => {
        fetchBatchStatus();
      }, refreshInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoRefresh, isActive, websocketConnection, refreshInterval]);

  // Track processing time
  useEffect(() => {
    if (status === 'processing' && !startTimeRef.current) {
      startTimeRef.current = Date.now();
      setStartTime(Date.now());
    }
  }, [status]);

  const fetchBatchStatus = async () => {
    try {
      const response = await fetch(`/api/batch-jobs/${batchId}/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch status: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data.status);
      setProgress(data.progress || 0);
      setCurrentItem(data.current_item || null);
      setProcessedItems(data.processed_items || []);
      setEstimatedCompletion(data.estimated_completion || null);
      
      if (data.error_message) {
        setErrorMessage(data.error_message);
      }
      
      onStatusChange(data);
    } catch (err) {
      console.error('Failed to fetch batch status:', err);
      setErrorMessage('Unable to fetch processing status. Please refresh the page.');
    }
  };

  const retryBatch = async () => {
    if (isRetrying) return;
    
    setIsRetrying(true);
    setErrorMessage(null);
    
    try {
      const response = await fetch(`/api/batch-jobs/${batchId}/retry`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Retry failed: ${response.status}`);
      }

      const data = await response.json();
      setStatus(data.status);
      setProgress(0);
      setCurrentItem(null);
      setRetryCount(prev => prev + 1);
      setErrorMessage(null);
      startTimeRef.current = null;
      
    } catch (err) {
      setErrorMessage('Failed to retry processing. Please try again later.');
    } finally {
      setIsRetrying(false);
    }
  };

  const cancelBatch = async () => {
    try {
      const response = await fetch(`/api/batch-jobs/${batchId}/cancel`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Cancel failed: ${response.status}`);
      }

      setStatus('cancelled');
      setProgress(0);
      setCurrentItem(null);
      
    } catch (err) {
      setErrorMessage('Failed to cancel processing.');
    }
  };

  const formatTimeRemaining = (estimatedMs) => {
    if (!estimatedMs) return null;
    
    const now = Date.now();
    const remaining = Math.max(0, estimatedMs - now);
    const seconds = Math.ceil(remaining / 1000);
    
    if (seconds < 60) return `${seconds}s remaining`;
    if (seconds < 3600) return `${Math.ceil(seconds / 60)}m remaining`;
    return `${Math.ceil(seconds / 3600)}h remaining`;
  };

  const formatElapsedTime = () => {
    if (!startTime) return null;
    
    const elapsed = Date.now() - startTime;
    const seconds = Math.floor(elapsed / 1000);
    
    if (seconds < 60) return `${seconds}s elapsed`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s elapsed`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m elapsed`;
  };

  const getProgressWidth = () => {
    return Math.min(100, Math.max(0, progress));
  };

  return (
    <div 
      className={`batch-status ${status} ${className}`}
      role="region"
      aria-label={`Batch processing status: ${currentConfig.label}`}
    >
      <div className="status-header">
        <div className="status-indicator">
          <span className="status-icon" aria-hidden="true">
            {currentConfig.icon}
          </span>
          <div className="status-info">
            <h3 className="status-title">
              {currentConfig.label}
              {retryCount > 0 && <span className="retry-count"> (Retry #{retryCount})</span>}
            </h3>
            <p className="status-description">{currentConfig.description}</p>
          </div>
        </div>
        
        <div className="status-actions">
          {status === 'failed' && (
            <button
              className="retry-button"
              onClick={retryBatch}
              disabled={isRetrying}
              aria-label="Retry batch processing"
            >
              {isRetrying ? 'Retrying...' : '🔄 Retry'}
            </button>
          )}
          
          {isActive && status !== 'paused' && (
            <button
              className="cancel-button"
              onClick={cancelBatch}
              aria-label="Cancel batch processing"
            >
              ⏹️ Cancel
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="progress-section">
        <div 
          className="progress-bar"
          role="progressbar"
          aria-valuenow={progress}
          aria-valuemin="0"
          aria-valuemax="100"
          aria-label={`Processing progress: ${progress}% complete`}
        >
          <div 
            className="progress-fill"
            style={{ width: `${getProgressWidth()}%` }}
          ></div>
        </div>
        
        <div className="progress-stats">
          <span className="progress-percentage">{Math.round(progress)}%</span>
          {items.length > 0 && (
            <span className="progress-items">
              {processedItems.length} of {items.length} items
            </span>
          )}
        </div>
      </div>

      {/* Current Item */}
      {currentItem && (
        <div className="current-item">
          <span className="current-label">Processing:</span>
          <span className="current-name">{currentItem}</span>
        </div>
      )}

      {/* Time Information */}
      {(startTime || estimatedCompletion) && (
        <div className="time-info">
          {startTime && (
            <span className="elapsed-time">{formatElapsedTime()}</span>
          )}
          {estimatedCompletion && status === 'processing' && (
            <span className="remaining-time">
              {formatTimeRemaining(new Date(estimatedCompletion).getTime())}
            </span>
          )}
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="error-section" role="alert">
          <span className="error-icon">⚠️</span>
          <span className="error-text">{errorMessage}</span>
          <button
            className="error-dismiss"
            onClick={() => setErrorMessage(null)}
            aria-label="Dismiss error message"
          >
            ×
          </button>
        </div>
      )}

      {/* Detailed Item List */}
      {showDetails && items.length > 0 && (
        <div className="items-detail">
          <h4 className="items-title">Processing Items ({items.length})</h4>
          <div className="items-list">
            {items.map((item, index) => {
              const isProcessed = processedItems.includes(item.name || item.id);
              const isCurrent = currentItem === (item.name || item.id);
              
              return (
                <div 
                  key={item.id || index}
                  className={`item-entry ${isProcessed ? 'processed' : ''} ${isCurrent ? 'current' : ''}`}
                >
                  <span className="item-status-icon">
                    {isProcessed ? '✅' : isCurrent ? '⚡' : '⏳'}
                  </span>
                  <span className="item-name">
                    {item.name || item.filename || `Item ${index + 1}`}
                  </span>
                  {item.size && (
                    <span className="item-size">
                      ({Math.round(item.size / 1024)}KB)
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        .batch-status {
          background: ${BRAND.colors.bone};
          border: 1px solid ${BRAND.colors.border};
          border-radius: 8px;
          padding: 20px;
          font-family: ${BRAND.typography.fontFamily};
          max-width: 600px;
          margin: 0 auto;
        }

        .status-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .status-indicator {
          display: flex;
          align-items: center;
          gap: 12px;
          flex: 1;
        }

        .status-icon {
          font-size: 1.5rem;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 20px;
          background: ${currentConfig.bgColor};
          color: ${currentConfig.color};
        }

        .status-info {
          flex: 1;
        }

        .status-title {
          font-size: 1.125rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0 0 4px 0;
        }

        .retry-count {
          font-size: 0.875rem;
          color: ${BRAND.colors.textSecondary};
          font-weight: ${BRAND.typography.weights.regular};
        }

        .status-description {
          font-size: 0.875rem;
          color: ${BRAND.colors.textSecondary};
          margin: 0;
        }

        .status-actions {
          display: flex;
          gap: 8px;
        }

        .retry-button, .cancel-button {
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 0.875rem;
          font-weight: ${BRAND.typography.weights.medium};
          cursor: pointer;
          transition: all 0.2s ease;
          border: 1px solid;
        }

        .retry-button {
          background: ${BRAND.colors.green};
          color: ${BRAND.colors.white};
          border-color: ${BRAND.colors.green};
        }

        .retry-button:hover {
          background: ${BRAND.colors.green}dd;
          transform: translateY(-1px);
        }

        .retry-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .cancel-button {
          background: ${BRAND.colors.boneLight};
          color: ${BRAND.colors.textSecondary};
          border-color: ${BRAND.colors.border};
        }

        .cancel-button:hover {
          background: ${BRAND.colors.accentRed};
          color: ${BRAND.colors.red};
          border-color: ${BRAND.colors.red};
        }

        .progress-section {
          margin-bottom: 16px;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: ${BRAND.colors.borderLight};
          border-radius: 6px;
          overflow: hidden;
          margin-bottom: 8px;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, ${currentConfig.color}, ${currentConfig.color}aa);
          border-radius: 6px;
          transition: width 0.3s ease;
          position: relative;
        }

        .processing .progress-fill {
          background: linear-gradient(90deg, ${BRAND.colors.blue}, ${BRAND.colors.blue}aa);
        }

        .processing .progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
          animation: shimmer 2s infinite;
        }

        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }

        .progress-stats {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .progress-percentage {
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
        }

        .progress-items {
          color: ${BRAND.colors.textSecondary};
        }

        .current-item {
          background: ${BRAND.colors.boneLight};
          border: 1px solid ${BRAND.colors.borderLight};
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 16px;
          font-size: 0.875rem;
        }

        .current-label {
          color: ${BRAND.colors.textSecondary};
          font-weight: ${BRAND.typography.weights.medium};
        }

        .current-name {
          color: ${BRAND.colors.text};
          font-weight: ${BRAND.typography.weights.semibold};
          margin-left: 8px;
        }

        .time-info {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.75rem;
          color: ${BRAND.colors.textSecondary};
          margin-bottom: 16px;
          padding-top: 8px;
          border-top: 1px solid ${BRAND.colors.borderSubtle};
        }

        .error-section {
          background: ${BRAND.colors.accentRed};
          border: 1px solid ${BRAND.colors.red};
          border-radius: 6px;
          padding: 12px 16px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 8px;
          color: ${BRAND.colors.red};
          font-size: 0.875rem;
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

        .items-detail {
          border-top: 1px solid ${BRAND.colors.borderLight};
          padding-top: 16px;
        }

        .items-title {
          font-size: 0.875rem;
          font-weight: ${BRAND.typography.weights.semibold};
          color: ${BRAND.colors.text};
          margin: 0 0 12px 0;
        }

        .items-list {
          max-height: 200px;
          overflow-y: auto;
        }

        .item-entry {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-radius: 4px;
          font-size: 0.875rem;
          margin-bottom: 4px;
          transition: all 0.2s ease;
        }

        .item-entry.current {
          background: ${BRAND.colors.accentBlue};
          border: 1px solid ${BRAND.colors.blue};
        }

        .item-entry.processed {
          background: ${BRAND.colors.accentGreen};
          color: ${BRAND.colors.textSecondary};
        }

        .item-status-icon {
          font-size: 0.875rem;
          width: 20px;
          text-align: center;
        }

        .item-name {
          flex: 1;
          color: ${BRAND.colors.text};
          font-weight: ${BRAND.typography.weights.medium};
        }

        .item-entry.processed .item-name {
          text-decoration: line-through;
          color: ${BRAND.colors.textSecondary};
        }

        .item-size {
          color: ${BRAND.colors.textMuted};
          font-size: 0.75rem;
        }

        @media (max-width: 768px) {
          .batch-status {
            padding: 16px;
            margin: 0 8px;
          }

          .status-header {
            flex-direction: column;
            gap: 12px;
          }

          .status-actions {
            width: 100%;
            justify-content: flex-end;
          }

          .retry-button, .cancel-button {
            font-size: 0.75rem;
            padding: 6px 12px;
          }

          .time-info {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
          }

          .progress-stats {
            flex-direction: column;
            align-items: flex-start;
            gap: 4px;
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

export default BatchStatus;