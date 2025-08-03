import { query as dbQuery } from '../config/database.js';

/**
 * File Permissions Middleware for Kendrick Forrest Client Portal
 * Handles file access control and permissions checking
 */

/**
 * Check if user can view a file
 * Admin can view all files, clients can view their own uploaded files or files in their projects
 */
const canViewFile = async (req, res, next) => {
  try {
    const fileId = req.params.id || req.params.fileId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    // Admin can view all files
    if (userRole === 'admin') {
      return next();
    }
    
    // Get file information with project and uploader details
    const fileQuery = `
      SELECT 
        f.id,
        f.project_id,
        f.uploader_id,
        f.is_public,
        f.is_active,
        p.client_id as project_client_id
      FROM files f
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND f.is_active = true
    `;
    
    const fileResult = await dbQuery(fileQuery, [fileId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    
    // Check if file is public
    if (file.is_public) {
      return next();
    }
    
    // Check if user is the uploader
    if (file.uploader_id === userId) {
      return next();
    }
    
    // Check if user is the project client
    if (file.project_id && file.project_client_id === userId) {
      return next();
    }
    
    // Check explicit file permissions
    const permissionQuery = `
      SELECT permission_type
      FROM file_permissions
      WHERE file_id = $1 AND user_id = $2 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND permission_type IN ('view', 'download', 'edit', 'delete')
    `;
    
    const permissionResult = await dbQuery(permissionQuery, [fileId, userId]);
    
    if (permissionResult.rows.length > 0) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied. You do not have permission to view this file' });
    
  } catch (error) {
    console.error('Error checking file view permission:', error);
    return res.status(500).json({ error: 'Internal server error while checking permissions' });
  }
};

/**
 * Check if user can download a file
 */
const canDownloadFile = async (req, res, next) => {
  try {
    const fileId = req.params.id || req.params.fileId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    // Admin can download all files
    if (userRole === 'admin') {
      return next();
    }
    
    // Get file information with project and uploader details
    const fileQuery = `
      SELECT 
        f.id,
        f.project_id,
        f.uploader_id,
        f.is_public,
        f.is_active,
        p.client_id as project_client_id
      FROM files f
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND f.is_active = true
    `;
    
    const fileResult = await dbQuery(fileQuery, [fileId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    
    // Check if file is public
    if (file.is_public) {
      return next();
    }
    
    // Check if user is the uploader
    if (file.uploader_id === userId) {
      return next();
    }
    
    // Check if user is the project client
    if (file.project_id && file.project_client_id === userId) {
      return next();
    }
    
    // Check explicit download permissions
    const permissionQuery = `
      SELECT permission_type
      FROM file_permissions
      WHERE file_id = $1 AND user_id = $2 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND permission_type IN ('download', 'edit', 'delete')
    `;
    
    const permissionResult = await dbQuery(permissionQuery, [fileId, userId]);
    
    if (permissionResult.rows.length > 0) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied. You do not have permission to download this file' });
    
  } catch (error) {
    console.error('Error checking file download permission:', error);
    return res.status(500).json({ error: 'Internal server error while checking permissions' });
  }
};

/**
 * Check if user can edit/update a file
 */
const canEditFile = async (req, res, next) => {
  try {
    const fileId = req.params.id || req.params.fileId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    // Admin can edit all files
    if (userRole === 'admin') {
      return next();
    }
    
    // Get file information
    const fileQuery = `
      SELECT 
        f.id,
        f.project_id,
        f.uploader_id,
        f.is_active,
        p.client_id as project_client_id
      FROM files f
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND f.is_active = true
    `;
    
    const fileResult = await dbQuery(fileQuery, [fileId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    
    // Check if user is the uploader
    if (file.uploader_id === userId) {
      return next();
    }
    
    // Check explicit edit permissions
    const permissionQuery = `
      SELECT permission_type
      FROM file_permissions
      WHERE file_id = $1 AND user_id = $2 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND permission_type IN ('edit', 'delete')
    `;
    
    const permissionResult = await dbQuery(permissionQuery, [fileId, userId]);
    
    if (permissionResult.rows.length > 0) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied. You do not have permission to edit this file' });
    
  } catch (error) {
    console.error('Error checking file edit permission:', error);
    return res.status(500).json({ error: 'Internal server error while checking permissions' });
  }
};

/**
 * Check if user can delete a file
 */
const canDeleteFile = async (req, res, next) => {
  try {
    const fileId = req.params.id || req.params.fileId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    if (!fileId) {
      return res.status(400).json({ error: 'File ID is required' });
    }
    
    // Admin can delete all files
    if (userRole === 'admin') {
      return next();
    }
    
    // Get file information
    const fileQuery = `
      SELECT 
        f.id,
        f.project_id,
        f.uploader_id,
        f.is_active,
        p.client_id as project_client_id
      FROM files f
      LEFT JOIN projects p ON f.project_id = p.id
      WHERE f.id = $1 AND f.is_active = true
    `;
    
    const fileResult = await dbQuery(fileQuery, [fileId]);
    
    if (fileResult.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = fileResult.rows[0];
    
    // Check if user is the uploader
    if (file.uploader_id === userId) {
      return next();
    }
    
    // Check explicit delete permissions
    const permissionQuery = `
      SELECT permission_type
      FROM file_permissions
      WHERE file_id = $1 AND user_id = $2 
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
        AND permission_type = 'delete'
    `;
    
    const permissionResult = await dbQuery(permissionQuery, [fileId, userId]);
    
    if (permissionResult.rows.length > 0) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied. You do not have permission to delete this file' });
    
  } catch (error) {
    console.error('Error checking file delete permission:', error);
    return res.status(500).json({ error: 'Internal server error while checking permissions' });
  }
};

/**
 * Check if user can upload files to a project
 */
const canUploadToProject = async (req, res, next) => {
  try {
    const projectId = req.body.project_id || req.params.projectId;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // If no project specified, allow upload (file will be personal/unassigned)
    if (!projectId) {
      return next();
    }
    
    // Admin can upload to any project
    if (userRole === 'admin') {
      return next();
    }
    
    // Check if project exists and user has access
    const projectQuery = `
      SELECT id, client_id, is_active
      FROM projects
      WHERE id = $1 AND is_active = true
    `;
    
    const projectResult = await dbQuery(projectQuery, [projectId]);
    
    if (projectResult.rows.length === 0) {
      return res.status(404).json({ error: 'Project not found or inactive' });
    }
    
    const project = projectResult.rows[0];
    
    // Check if user is the project client
    if (project.client_id === userId) {
      return next();
    }
    
    return res.status(403).json({ error: 'Access denied. You do not have permission to upload files to this project' });
    
  } catch (error) {
    console.error('Error checking project upload permission:', error);
    return res.status(500).json({ error: 'Internal server error while checking permissions' });
  }
};

/**
 * Helper function to check if user has specific permission on a file
 */
const hasFilePermission = async (userId, fileId, permissionType) => {
  try {
    const permissionQuery = `
      SELECT id
      FROM file_permissions
      WHERE file_id = $1 AND user_id = $2 AND permission_type = $3
        AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
    `;
    
    const result = await dbQuery(permissionQuery, [fileId, userId, permissionType]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking file permission:', error);
    return false;
  }
};

/**
 * Helper function to grant file permission
 */
const grantFilePermission = async (fileId, userId, permissionType, grantedBy, expiresAt = null) => {
  try {
    const insertQuery = `
      INSERT INTO file_permissions (file_id, user_id, permission_type, granted_by, expires_at)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (file_id, user_id, permission_type) 
      DO UPDATE SET expires_at = $5, granted_at = CURRENT_TIMESTAMP
      RETURNING id
    `;
    
    const result = await dbQuery(insertQuery, [fileId, userId, permissionType, grantedBy, expiresAt]);
    return result.rows[0];
  } catch (error) {
    console.error('Error granting file permission:', error);
    throw error;
  }
};

/**
 * Helper function to revoke file permission
 */
const revokeFilePermission = async (fileId, userId, permissionType) => {
  try {
    const deleteQuery = `
      DELETE FROM file_permissions
      WHERE file_id = $1 AND user_id = $2 AND permission_type = $3
      RETURNING id
    `;
    
    const result = await dbQuery(deleteQuery, [fileId, userId, permissionType]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error revoking file permission:', error);
    throw error;
  }
};

export {
  canViewFile,
  canDownloadFile,
  canEditFile,
  canDeleteFile,
  canUploadToProject,
  hasFilePermission,
  grantFilePermission,
  revokeFilePermission
};