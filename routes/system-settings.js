import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { authenticateToken, requireAdmin } from '../middleware/auth.js';
import { query as dbQuery, withTransaction } from '../config/database.js';

const router = express.Router();

// Validation middleware
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      error: 'Validation failed',
      details: errors.array()
    });
  }
  next();
};

// Helper function to log activity
const logActivity = async (client, userId, entityType, entityId, action, description, metadata = {}) => {
  try {
    await client.query(`
      INSERT INTO activity_log (user_id, entity_type, entity_id, action, description, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, entityType, entityId, action, description, JSON.stringify(metadata)]);
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// Default system settings
const DEFAULT_SETTINGS = {
  // Company Information
  company_name: 'RE Print Studios',
  company_email: 'hello@reprintstudios.com',
  company_phone: '(555) 123-4567',
  company_address: '123 Creative Way, Design City, DC 12345',
  company_website: 'https://reprintstudios.com',
  
  // Branding
  primary_color: '#0057FF',
  secondary_color: '#F7C600',
  accent_color: '#27AE60',
  logo_url: '/assets/logo.svg',
  favicon_url: '/assets/favicon.ico',
  
  // Business Settings
  business_hours: {
    monday: { open: '09:00', close: '18:00' },
    tuesday: { open: '09:00', close: '18:00' },
    wednesday: { open: '09:00', close: '18:00' },
    thursday: { open: '09:00', close: '18:00' },
    friday: { open: '09:00', close: '18:00' },
    saturday: { open: '10:00', close: '14:00' },
    sunday: { closed: true }
  },
  timezone: 'America/New_York',
  currency: 'USD',
  tax_rate: 0.0875,
  
  // Feature Toggles
  features: {
    enable_client_portal: true,
    enable_online_payments: true,
    enable_file_sharing: true,
    enable_messaging: true,
    enable_invoicing: true,
    enable_time_tracking: true,
    enable_team_collaboration: true,
    enable_email_notifications: true,
    enable_sms_notifications: false,
    enable_two_factor_auth: false,
    enable_api_access: false
  },
  
  // Email Settings
  email_settings: {
    from_name: 'RE Print Studios',
    from_email: 'noreply@reprintstudios.com',
    reply_to_email: 'support@reprintstudios.com',
    signature: 'Best regards,\nThe RE Print Studios Team'
  },
  
  // File Upload Settings
  file_settings: {
    max_file_size_mb: 100,
    allowed_extensions: ['.pdf', '.jpg', '.jpeg', '.png', '.gif', '.ai', '.psd', '.eps', '.svg'],
    storage_location: 'local', // local, s3, cloudinary
    auto_compress_images: true
  },
  
  // Security Settings
  security_settings: {
    password_min_length: 8,
    password_require_uppercase: true,
    password_require_lowercase: true,
    password_require_numbers: true,
    password_require_special: true,
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    lockout_duration_minutes: 30
  },
  
  // Notification Settings
  notification_settings: {
    new_project_notification: true,
    phase_change_notification: true,
    file_upload_notification: true,
    invoice_notification: true,
    payment_notification: true,
    message_notification: true
  }
};

// =============================================================================
// GET /api/system-settings - Get all system settings
// =============================================================================
router.get('/',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      // Get all settings from database
      const settingsQuery = `
        SELECT setting_key, setting_value, value_type, category, is_public
        FROM system_settings
        WHERE is_active = true
        ORDER BY category, setting_key
      `;
      
      const result = await dbQuery(settingsQuery);
      
      // Group settings by category
      const settings = {};
      
      result.rows.forEach(row => {
        const category = row.category || 'general';
        if (!settings[category]) {
          settings[category] = {};
        }
        
        // Parse JSON values
        let value = row.setting_value;
        if (row.value_type === 'json' && typeof value === 'string') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Keep as string if JSON parse fails
          }
        } else if (row.value_type === 'number') {
          value = parseFloat(value);
        } else if (row.value_type === 'boolean') {
          value = value === 'true' || value === true;
        }
        
        settings[category][row.setting_key] = value;
      });
      
      // Merge with defaults to ensure all settings are present
      const mergedSettings = { ...DEFAULT_SETTINGS };
      Object.keys(settings).forEach(category => {
        if (typeof mergedSettings[category] === 'object' && !Array.isArray(mergedSettings[category])) {
          mergedSettings[category] = { ...mergedSettings[category], ...settings[category] };
        } else {
          mergedSettings[category] = settings[category];
        }
      });
      
      res.json({ settings: mergedSettings });
      
    } catch (error) {
      console.error('Error fetching system settings:', error);
      res.status(500).json({ error: 'Failed to fetch system settings' });
    }
  }
);

// =============================================================================
// GET /api/system-settings/public - Get public system settings (no auth)
// =============================================================================
router.get('/public', async (req, res) => {
  try {
    // Get only public settings
    const settingsQuery = `
      SELECT setting_key, setting_value, value_type, category
      FROM system_settings
      WHERE is_public = true AND is_active = true
      ORDER BY category, setting_key
    `;
    
    const result = await dbQuery(settingsQuery);
    
    // Group settings by category
    const settings = {};
    
    result.rows.forEach(row => {
      const category = row.category || 'general';
      if (!settings[category]) {
        settings[category] = {};
      }
      
      // Parse JSON values
      let value = row.setting_value;
      if (row.value_type === 'json' && typeof value === 'string') {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if JSON parse fails
        }
      }
      
      settings[category][row.setting_key] = value;
    });
    
    // Return limited public settings
    const publicSettings = {
      company_name: settings.company?.company_name || DEFAULT_SETTINGS.company_name,
      company_email: settings.company?.company_email || DEFAULT_SETTINGS.company_email,
      company_phone: settings.company?.company_phone || DEFAULT_SETTINGS.company_phone,
      company_website: settings.company?.company_website || DEFAULT_SETTINGS.company_website,
      primary_color: settings.branding?.primary_color || DEFAULT_SETTINGS.primary_color,
      secondary_color: settings.branding?.secondary_color || DEFAULT_SETTINGS.secondary_color,
      logo_url: settings.branding?.logo_url || DEFAULT_SETTINGS.logo_url,
      business_hours: settings.business?.business_hours || DEFAULT_SETTINGS.business_hours,
      timezone: settings.business?.timezone || DEFAULT_SETTINGS.timezone
    };
    
    res.json({ settings: publicSettings });
    
  } catch (error) {
    console.error('Error fetching public settings:', error);
    res.status(500).json({ error: 'Failed to fetch public settings' });
  }
});

// =============================================================================
// PUT /api/system-settings - Update system settings
// =============================================================================
router.put('/',
  authenticateToken,
  requireAdmin,
  [
    body('settings').isObject().withMessage('Settings must be an object'),
    body('category').optional().isString().withMessage('Category must be a string')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { settings, category } = req.body;
      const userId = req.user.id;
      
      const updatedSettings = await withTransaction(async (client) => {
        const updates = [];
        
        // Flatten nested settings object
        const flattenSettings = (obj, prefix = '', cat = category || 'general') => {
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            const fullKey = prefix ? `${prefix}_${key}` : key;
            
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // Recursively flatten nested objects
              flattenSettings(value, fullKey, cat);
            } else {
              // Determine value type
              let valueType = 'string';
              let stringValue = value;
              
              if (typeof value === 'boolean') {
                valueType = 'boolean';
                stringValue = value.toString();
              } else if (typeof value === 'number') {
                valueType = 'number';
                stringValue = value.toString();
              } else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) {
                valueType = 'json';
                stringValue = JSON.stringify(value);
              } else {
                stringValue = value?.toString() || '';
              }
              
              updates.push({
                key: fullKey,
                value: stringValue,
                type: valueType,
                category: cat
              });
            }
          });
        };
        
        flattenSettings(settings);
        
        // Update or insert each setting
        for (const update of updates) {
          await client.query(`
            INSERT INTO system_settings (setting_key, setting_value, value_type, category)
            VALUES ($1, $2, $3, $4)
            ON CONFLICT (setting_key) DO UPDATE
            SET setting_value = EXCLUDED.setting_value,
                value_type = EXCLUDED.value_type,
                category = EXCLUDED.category,
                updated_at = CURRENT_TIMESTAMP
          `, [update.key, update.value, update.type, update.category]);
        }
        
        // Log activity
        await logActivity(
          client,
          userId,
          'system_settings',
          null,
          'updated',
          `System settings updated: ${updates.length} settings`,
          {
            updated_keys: updates.map(u => u.key),
            category
          }
        );
        
        return updates;
      });
      
      res.json({
        message: 'System settings updated successfully',
        updated_count: updatedSettings.length
      });
      
    } catch (error) {
      console.error('Error updating system settings:', error);
      res.status(500).json({ error: 'Failed to update system settings' });
    }
  }
);

// =============================================================================
// POST /api/system-settings/reset - Reset settings to defaults
// =============================================================================
router.post('/reset',
  authenticateToken,
  requireAdmin,
  [
    body('category').optional().isString().withMessage('Category must be a string'),
    body('confirm').equals('RESET').withMessage('Confirmation required (must be "RESET")')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { category } = req.body;
      const userId = req.user.id;
      
      await withTransaction(async (client) => {
        if (category) {
          // Reset specific category
          await client.query(
            'DELETE FROM system_settings WHERE category = $1',
            [category]
          );
        } else {
          // Reset all settings
          await client.query('DELETE FROM system_settings');
        }
        
        // Log activity
        await logActivity(
          client,
          userId,
          'system_settings',
          null,
          'reset',
          category ? `System settings reset for category: ${category}` : 'All system settings reset to defaults',
          { category }
        );
      });
      
      res.json({
        message: category 
          ? `Settings for category "${category}" reset to defaults`
          : 'All system settings reset to defaults'
      });
      
    } catch (error) {
      console.error('Error resetting system settings:', error);
      res.status(500).json({ error: 'Failed to reset system settings' });
    }
  }
);

// =============================================================================
// GET /api/system-settings/export - Export all settings
// =============================================================================
router.get('/export',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
      // Get all settings
      const settingsResult = await dbQuery(
        'SELECT * FROM system_settings ORDER BY category, setting_key'
      );
      
      // Get activity log for settings
      const activityResult = await dbQuery(`
        SELECT * FROM activity_log 
        WHERE entity_type = 'system_settings'
        ORDER BY created_at DESC
        LIMIT 100
      `);
      
      const exportData = {
        exported_at: new Date().toISOString(),
        exported_by: req.user.id,
        settings: settingsResult.rows,
        recent_activity: activityResult.rows,
        defaults: DEFAULT_SETTINGS
      };
      
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="system-settings-${Date.now()}.json"`);
      res.json(exportData);
      
    } catch (error) {
      console.error('Error exporting system settings:', error);
      res.status(500).json({ error: 'Failed to export system settings' });
    }
  }
);

// =============================================================================
// POST /api/system-settings/import - Import settings from JSON
// =============================================================================
router.post('/import',
  authenticateToken,
  requireAdmin,
  [
    body('settings').isArray().withMessage('Settings must be an array'),
    body('overwrite').optional().isBoolean().withMessage('Overwrite must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { settings, overwrite = false } = req.body;
      const userId = req.user.id;
      
      const importResult = await withTransaction(async (client) => {
        let imported = 0;
        let skipped = 0;
        
        for (const setting of settings) {
          if (!setting.setting_key || !setting.setting_value) {
            skipped++;
            continue;
          }
          
          if (overwrite) {
            // Overwrite existing settings
            await client.query(`
              INSERT INTO system_settings (setting_key, setting_value, value_type, category, is_public)
              VALUES ($1, $2, $3, $4, $5)
              ON CONFLICT (setting_key) DO UPDATE
              SET setting_value = EXCLUDED.setting_value,
                  value_type = EXCLUDED.value_type,
                  category = EXCLUDED.category,
                  is_public = EXCLUDED.is_public,
                  updated_at = CURRENT_TIMESTAMP
            `, [
              setting.setting_key,
              setting.setting_value,
              setting.value_type || 'string',
              setting.category || 'general',
              setting.is_public || false
            ]);
            imported++;
          } else {
            // Skip existing settings
            const existing = await client.query(
              'SELECT id FROM system_settings WHERE setting_key = $1',
              [setting.setting_key]
            );
            
            if (existing.rows.length === 0) {
              await client.query(`
                INSERT INTO system_settings (setting_key, setting_value, value_type, category, is_public)
                VALUES ($1, $2, $3, $4, $5)
              `, [
                setting.setting_key,
                setting.setting_value,
                setting.value_type || 'string',
                setting.category || 'general',
                setting.is_public || false
              ]);
              imported++;
            } else {
              skipped++;
            }
          }
        }
        
        // Log activity
        await logActivity(
          client,
          userId,
          'system_settings',
          null,
          'imported',
          `System settings imported: ${imported} settings`,
          {
            imported,
            skipped,
            overwrite
          }
        );
        
        return { imported, skipped };
      });
      
      res.json({
        message: 'System settings imported successfully',
        imported: importResult.imported,
        skipped: importResult.skipped
      });
      
    } catch (error) {
      console.error('Error importing system settings:', error);
      res.status(500).json({ error: 'Failed to import system settings' });
    }
  }
);

export default router;