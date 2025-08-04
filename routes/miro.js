/**
 * Miro Integration API Routes
 * Handles Miro whiteboard operations for the MiroEmbed component
 * Production-ready with proper error handling and authentication
 */

const express = require('express');
const axios = require('axios');
const { authenticate } = require('../middleware/auth');
const { validateProject } = require('../middleware/validation'); 
const db = require('../config/database');
const logger = require('../utils/logger');

const router = express.Router();

// Miro API configuration
const MIRO_API_BASE = 'https://api.miro.com/v2';
const MIRO_CLIENT_ID = process.env.MIRO_CLIENT_ID;
const MIRO_CLIENT_SECRET = process.env.MIRO_CLIENT_SECRET;

/**
 * Get Miro boards for a project
 * GET /api/projects/:projectId/miro/boards
 */
router.get('/projects/:projectId/miro/boards', authenticate, validateProject, async (req, res) => {
  try {
    const { projectId } = req.params;
    const userId = req.user.id;

    // Get project and verify access
    const project = await db.query(
      'SELECT * FROM projects WHERE id = $1 AND (client_id = $2 OR $3 = ANY(team_members))',
      [projectId, req.user.client_id, userId]
    );

    if (project.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Project not found or access denied'
      });
    }

    // Get Miro access token for this project/user
    const tokenResult = await db.query(
      'SELECT miro_access_token FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured. Please connect your Miro account.',
        requiresAuth: true
      });
    }

    const accessToken = tokenResult.rows[0].miro_access_token;

    // Fetch boards from Miro API
    const response = await axios.get(`${MIRO_API_BASE}/boards`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      params: {
        project_id: projectId, // If Miro supports project filtering
        limit: 50
      }
    });

    // Filter boards related to this project (by name or tags)
    const projectBoards = response.data.data.filter(board => 
      board.name.toLowerCase().includes(project.rows[0].name.toLowerCase()) ||
      board.tags?.some(tag => tag.toLowerCase().includes('project') || tag.toLowerCase().includes(projectId))
    );

    // Store board references in our database
    for (const board of projectBoards) {
      await db.query(
        `INSERT INTO project_miro_boards (project_id, board_id, board_name, created_by, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (project_id, board_id) DO UPDATE SET
         board_name = EXCLUDED.board_name,
         updated_at = NOW()`,
        [projectId, board.id, board.name, userId]
      );
    }

    res.json({
      success: true,
      boards: projectBoards.map(board => ({
        id: board.id,
        name: board.name,
        description: board.description,
        createdAt: board.createdAt,
        modifiedAt: board.modifiedAt,
        policy: board.policy,
        teamId: board.team?.id,
        viewLink: board.viewLink
      }))
    });

  } catch (error) {
    logger.error('Error fetching Miro boards:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Miro authentication expired. Please reconnect your account.',
        requiresReauth: true
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to access Miro boards'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to fetch Miro boards. Please try again later.'
    });
  }
});

/**
 * Create a new Miro board
 * POST /api/projects/:projectId/miro/boards
 */
router.post('/projects/:projectId/miro/boards', authenticate, validateProject, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, description, policy } = req.body;
    const userId = req.user.id;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Board name is required'
      });
    }

    // Get Miro access token
    const tokenResult = await db.query(
      'SELECT miro_access_token, miro_team_id FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured'
      });
    }

    const { miro_access_token: accessToken, miro_team_id: teamId } = tokenResult.rows[0];

    // Create board via Miro API
    const boardData = {
      name: name.trim(),
      description: description || `Collaborative whiteboard for project ${projectId}`,
      policy: policy || {
        sharingPolicy: {
          access: 'private',
          inviteToAccountAndBoardLinkAccess: 'no_access'
        }
      }
    };

    if (teamId) {
      boardData.team = { id: teamId };
    }

    const response = await axios.post(`${MIRO_API_BASE}/boards`, boardData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const newBoard = response.data;

    // Store board reference in database
    await db.query(
      `INSERT INTO project_miro_boards (project_id, board_id, board_name, created_by, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [projectId, newBoard.id, newBoard.name, userId]
    );

    // Log activity
    await db.query(
      `INSERT INTO project_activities (project_id, user_id, activity_type, activity_data, created_at)
       VALUES ($1, $2, $3, $4, NOW())`,
      [projectId, userId, 'miro_board_created', JSON.stringify({
        boardId: newBoard.id,
        boardName: newBoard.name
      })]
    );

    res.status(201).json({
      success: true,
      board: {
        id: newBoard.id,
        name: newBoard.name,
        description: newBoard.description,
        createdAt: newBoard.createdAt,
        modifiedAt: newBoard.modifiedAt,
        policy: newBoard.policy,
        viewLink: newBoard.viewLink
      }
    });

  } catch (error) {
    logger.error('Error creating Miro board:', error);
    
    if (error.response?.status === 401) {
      return res.status(401).json({
        success: false,
        error: 'Miro authentication expired'
      });
    }

    if (error.response?.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'Insufficient permissions to create Miro boards'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Failed to create Miro board. Please try again later.'
    });
  }
});

/**
 * Get board members
 * GET /api/projects/:projectId/miro/boards/:boardId/members
 */
router.get('/projects/:projectId/miro/boards/:boardId/members', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

    // Get access token
    const tokenResult = await db.query(
      'SELECT miro_access_token FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured'
      });
    }

    const accessToken = tokenResult.rows[0].miro_access_token;

    // Get board members from Miro API
    const response = await axios.get(`${MIRO_API_BASE}/boards/${boardId}/members`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Enhance with online status (if available via WebSocket or recent activity)
    const members = response.data.data.map(member => ({
      id: member.id,
      name: member.name,
      email: member.email,
      picture: member.picture,
      role: member.role,
      isOnline: false // Would be determined by WebSocket presence or recent activity
    }));

    res.json({
      success: true,
      members
    });

  } catch (error) {
    logger.error('Error fetching board members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board members'
    });
  }
});

/**
 * Get board activity
 * GET /api/projects/:projectId/miro/boards/:boardId/activity
 */
router.get('/projects/:projectId/miro/boards/:boardId/activity', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

    // Get access token
    const tokenResult = await db.query(
      'SELECT miro_access_token FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured'
      });
    }

    const accessToken = tokenResult.rows[0].miro_access_token;

    // Note: Miro API doesn't have a direct activity endpoint
    // This would need to be implemented using webhooks or polling board items
    // For now, we'll return stored activities from our database
    
    const activities = await db.query(
      `SELECT ba.*, u.name as user_name, u.email as user_email, u.avatar_url as user_picture
       FROM board_activities ba
       LEFT JOIN users u ON ba.user_id = u.id
       WHERE ba.board_id = $1
       ORDER BY ba.created_at DESC
       LIMIT 50`,
      [boardId]
    );

    const formattedActivities = activities.rows.map(activity => ({
      id: activity.id,
      user: {
        name: activity.user_name,
        email: activity.user_email,
        picture: activity.user_picture
      },
      action: activity.action,
      itemName: activity.item_name,
      type: activity.activity_type,
      createdAt: activity.created_at
    }));

    res.json({
      success: true,
      activities: formattedActivities
    });

  } catch (error) {
    logger.error('Error fetching board activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch board activity'
    });
  }
});

/**
 * Get board permissions for current user
 * GET /api/projects/:projectId/miro/boards/:boardId/permissions
 */
router.get('/projects/:projectId/miro/boards/:boardId/permissions', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const userId = req.user.id;

    // Get access token
    const tokenResult = await db.query(
      'SELECT miro_access_token FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured'
      });
    }

    const accessToken = tokenResult.rows[0].miro_access_token;

    // Get current user's role on the board
    const response = await axios.get(`${MIRO_API_BASE}/boards/${boardId}/members/me`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    const userRole = response.data.role;
    const permissions = {
      canEdit: ['owner', 'editor'].includes(userRole),
      canShare: ['owner', 'editor'].includes(userRole),
      canDelete: userRole === 'owner',
      role: userRole
    };

    res.json({
      success: true,
      permissions
    });

  } catch (error) {
    logger.error('Error fetching board permissions:', error);
    
    // Default to read-only on error
    res.json({
      success: true,
      permissions: {
        canEdit: false,
        canShare: false,
        canDelete: false,
        role: 'viewer'
      }
    });
  }
});

/**
 * Export board as PDF/Image
 * POST /api/projects/:projectId/miro/boards/:boardId/export
 */
router.post('/projects/:projectId/miro/boards/:boardId/export', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { format = 'pdf' } = req.body;
    const userId = req.user.id;

    if (!['pdf', 'image', 'png', 'jpg'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid export format. Supported: pdf, image, png, jpg'
      });
    }

    // Get access token
    const tokenResult = await db.query(
      'SELECT miro_access_token FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured'
      });
    }

    const accessToken = tokenResult.rows[0].miro_access_token;

    // Request export from Miro API
    const exportResponse = await axios.post(`${MIRO_API_BASE}/boards/${boardId}/export/${format}`, {}, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Miro export is typically async, so we'd get an export ID
    const exportId = exportResponse.data.id;
    
    // Poll for completion (in production, use webhooks)
    let attempts = 0;
    let exportStatus;
    
    do {
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      
      const statusResponse = await axios.get(`${MIRO_API_BASE}/boards/${boardId}/export/${exportId}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        }
      });
      
      exportStatus = statusResponse.data;
      attempts++;
    } while (exportStatus.status === 'in_progress' && attempts < 30);

    if (exportStatus.status === 'completed' && exportStatus.url) {
      res.json({
        success: true,
        downloadUrl: exportStatus.url,
        format: format,
        expiresAt: exportStatus.expiresAt
      });
    } else {
      throw new Error('Export timed out or failed');
    }

  } catch (error) {
    logger.error('Error exporting board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export board. Please try again later.'
    });
  }
});

/**
 * Add item to board (sticky note, shape, connector)
 * POST /api/projects/:projectId/miro/boards/:boardId/items
 */
router.post('/projects/:projectId/miro/boards/:boardId/items', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { type, content, shape, position, startPosition, endPosition, width, height } = req.body;
    const userId = req.user.id;

    // Get access token
    const tokenResult = await db.query(
      'SELECT miro_access_token FROM user_integrations WHERE user_id = $1 AND integration_type = $2',
      [userId, 'miro']
    );

    if (tokenResult.rows.length === 0) {
      return res.status(401).json({
        success: false,
        error: 'Miro integration not configured'
      });
    }

    const accessToken = tokenResult.rows[0].miro_access_token;

    let itemData;
    
    switch (type) {
      case 'sticky_note':
        itemData = {
          type: 'sticky_note',
          data: {
            content: content,
            shape: 'square'
          },
          position: position || { x: 0, y: 0 }
        };
        break;
        
      case 'shape':
        itemData = {
          type: 'shape',
          data: {
            shape: shape || 'rectangle'
          },
          position: position || { x: 0, y: 0 },
          geometry: {
            width: width || 100,
            height: height || 100
          }
        };
        break;
        
      case 'connector':
        itemData = {
          type: 'connector',
          data: {
            startItem: null,
            endItem: null
          },
          position: startPosition || { x: 0, y: 0 },
          connectorStyle: {
            strokeStyle: 'normal'
          }
        };
        break;
        
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid item type'
        });
    }

    // Create item via Miro API
    const response = await axios.post(`${MIRO_API_BASE}/boards/${boardId}/items`, itemData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Log activity
    await db.query(
      `INSERT INTO board_activities (board_id, user_id, activity_type, action, item_name, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW())`,
      [boardId, userId, 'created', `created a ${type.replace('_', ' ')}`, content || shape || 'connector']
    );

    res.status(201).json({
      success: true,
      item: response.data
    });

  } catch (error) {
    logger.error('Error adding item to board:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add item to board'
    });
  }
});

module.exports = router;