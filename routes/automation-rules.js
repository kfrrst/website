import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
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

// =============================================================================
// GET /api/automation-rules - List automation rules
// =============================================================================
router.get('/',
  authenticateToken,
  requireAdmin,
  [
    query('trigger_event').optional().isString().trim().withMessage('Trigger event must be a string'),
    query('is_active').optional().isBoolean().withMessage('is_active must be boolean'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { trigger_event, is_active, page = 1, limit = 20 } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = [];
      let queryParams = [];
      let paramIndex = 0;

      // Filter by trigger event
      if (trigger_event) {
        paramIndex++;
        whereConditions.push(`trigger_event = $${paramIndex}`);
        queryParams.push(trigger_event);
      }

      // Filter by status
      if (is_active !== undefined) {
        paramIndex++;
        whereConditions.push(`is_active = $${paramIndex}`);
        queryParams.push(is_active === 'true');
      }

      const whereClause = whereConditions.length > 0 
        ? `WHERE ${whereConditions.join(' AND ')}`
        : '';

      // Get automation rules with execution stats
      const rulesQuery = `
        SELECT 
          ar.*,
          u.first_name || ' ' || u.last_name as created_by_name,
          COUNT(are.id) as total_executions,
          COUNT(CASE WHEN are.status = 'success' THEN 1 END) as successful_executions,
          COUNT(CASE WHEN are.status = 'failed' THEN 1 END) as failed_executions,
          MAX(are.executed_at) as last_execution
        FROM automation_rules ar
        LEFT JOIN users u ON ar.created_by = u.id
        LEFT JOIN automation_rule_executions are ON ar.id = are.rule_id
        ${whereClause}
        GROUP BY ar.id, u.first_name, u.last_name
        ORDER BY ar.created_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      queryParams.push(limit, offset);
      const result = await dbQuery(rulesQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM automation_rules ar
        ${whereClause}
      `;
      
      const countResult = await dbQuery(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      // Format rules
      const rules = result.rows.map(rule => ({
        ...rule,
        conditions: rule.conditions || [],
        actions: rule.actions || [],
        total_executions: parseInt(rule.total_executions) || 0,
        successful_executions: parseInt(rule.successful_executions) || 0,
        failed_executions: parseInt(rule.failed_executions) || 0,
        success_rate: rule.total_executions > 0 ? 
          Math.round((rule.successful_executions / rule.total_executions) * 100) : 0
      }));

      res.json({
        rules,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching automation rules:', error);
      res.status(500).json({ error: 'Failed to fetch automation rules' });
    }
  }
);

// =============================================================================
// GET /api/automation-rules/:id - Get specific automation rule
// =============================================================================
router.get('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid rule ID format')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const ruleId = req.params.id;

      const ruleQuery = `
        SELECT 
          ar.*,
          u.first_name || ' ' || u.last_name as created_by_name
        FROM automation_rules ar
        LEFT JOIN users u ON ar.created_by = u.id
        WHERE ar.id = $1
      `;

      const result = await dbQuery(ruleQuery, [ruleId]);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Automation rule not found' });
      }

      const rule = result.rows[0];

      // Get recent executions
      const executionsQuery = `
        SELECT *
        FROM automation_rule_executions
        WHERE rule_id = $1
        ORDER BY executed_at DESC
        LIMIT 10
      `;

      const executionsResult = await dbQuery(executionsQuery, [ruleId]);

      res.json({
        rule: {
          ...rule,
          conditions: rule.conditions || [],
          actions: rule.actions || []
        },
        recent_executions: executionsResult.rows
      });

    } catch (error) {
      console.error('Error fetching automation rule:', error);
      res.status(500).json({ error: 'Failed to fetch automation rule' });
    }
  }
);

// =============================================================================
// POST /api/automation-rules - Create automation rule
// =============================================================================
router.post('/',
  authenticateToken,
  requireAdmin,
  [
    body('name').trim().isLength({ min: 1, max: 200 }).withMessage('Name is required (max 200 chars)'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 chars'),
    body('trigger_event').isIn([
      'project_created', 'project_updated', 'phase_changed', 'file_uploaded',
      'invoice_created', 'payment_received', 'message_sent', 'user_registered'
    ]).withMessage('Invalid trigger event'),
    body('conditions').isArray().withMessage('Conditions must be an array'),
    body('actions').isArray().withMessage('Actions must be an array'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be 1-10'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const { 
        name, 
        description, 
        trigger_event, 
        conditions, 
        actions, 
        priority = 5,
        is_active = true 
      } = req.body;

      const rule = await withTransaction(async (client) => {
        // Validate conditions and actions structure
        const validationErrors = [];

        // Basic validation for conditions
        for (let i = 0; i < conditions.length; i++) {
          const condition = conditions[i];
          if (!condition.field || !condition.operator || condition.value === undefined) {
            validationErrors.push(`Condition ${i + 1}: field, operator, and value are required`);
          }
        }

        // Basic validation for actions
        for (let i = 0; i < actions.length; i++) {
          const action = actions[i];
          if (!action.type || !action.config) {
            validationErrors.push(`Action ${i + 1}: type and config are required`);
          }
        }

        if (validationErrors.length > 0) {
          throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
        }

        // Create automation rule
        const insertQuery = `
          INSERT INTO automation_rules (
            name, description, trigger_event, conditions, actions, priority, is_active, created_by
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;

        const result = await client.query(insertQuery, [
          name, description, trigger_event, JSON.stringify(conditions), 
          JSON.stringify(actions), priority, is_active, req.user.id
        ]);

        const newRule = result.rows[0];

        // Log activity
        await logActivity(
          client,
          req.user.id,
          'automation_rule',
          newRule.id,
          'created',
          `Automation rule created: ${name}`,
          { 
            trigger_event, 
            conditions_count: conditions.length, 
            actions_count: actions.length,
            priority
          }
        );

        return newRule;
      });

      res.status(201).json({
        message: 'Automation rule created successfully',
        rule: {
          ...rule,
          conditions: rule.conditions || [],
          actions: rule.actions || []
        }
      });

    } catch (error) {
      console.error('Error creating automation rule:', error);
      if (error.message.includes('Validation errors:')) {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to create automation rule' });
    }
  }
);

// =============================================================================
// PUT /api/automation-rules/:id - Update automation rule
// =============================================================================
router.put('/:id',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid rule ID format'),
    body('name').optional().trim().isLength({ min: 1, max: 200 }).withMessage('Name max 200 chars'),
    body('description').optional().trim().isLength({ max: 1000 }).withMessage('Description max 1000 chars'),
    body('trigger_event').optional().isIn([
      'project_created', 'project_updated', 'phase_changed', 'file_uploaded',
      'invoice_created', 'payment_received', 'message_sent', 'user_registered'
    ]).withMessage('Invalid trigger event'),
    body('conditions').optional().isArray().withMessage('Conditions must be an array'),
    body('actions').optional().isArray().withMessage('Actions must be an array'),
    body('priority').optional().isInt({ min: 1, max: 10 }).withMessage('Priority must be 1-10'),
    body('is_active').optional().isBoolean().withMessage('is_active must be boolean')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const ruleId = req.params.id;
      const { name, description, trigger_event, conditions, actions, priority, is_active } = req.body;

      const updatedRule = await withTransaction(async (client) => {
        // Check if rule exists
        const existingRule = await client.query(
          'SELECT * FROM automation_rules WHERE id = $1',
          [ruleId]
        );

        if (existingRule.rows.length === 0) {
          throw new Error('Automation rule not found');
        }

        const currentRule = existingRule.rows[0];
        const updatedFields = {};

        // Build update fields
        if (name && name !== currentRule.name) {
          updatedFields.name = name;
        }
        if (description !== undefined && description !== currentRule.description) {
          updatedFields.description = description;
        }
        if (trigger_event && trigger_event !== currentRule.trigger_event) {
          updatedFields.trigger_event = trigger_event;
        }
        if (conditions !== undefined) {
          updatedFields.conditions = JSON.stringify(conditions);
        }
        if (actions !== undefined) {
          updatedFields.actions = JSON.stringify(actions);
        }
        if (priority !== undefined && priority !== currentRule.priority) {
          updatedFields.priority = priority;
        }
        if (is_active !== undefined && is_active !== currentRule.is_active) {
          updatedFields.is_active = is_active;
        }

        if (Object.keys(updatedFields).length === 0) {
          throw new Error('No valid fields to update');
        }

        // Build and execute update query
        const updateParams = Object.values(updatedFields);
        const setClause = Object.keys(updatedFields).map((field, index) => 
          `${field} = $${index + 1}`
        ).join(', ');

        const updateQuery = `
          UPDATE automation_rules 
          SET ${setClause}, updated_at = CURRENT_TIMESTAMP
          WHERE id = $${updateParams.length + 1}
          RETURNING *
        `;

        updateParams.push(ruleId);
        const result = await client.query(updateQuery, updateParams);
        const rule = result.rows[0];

        // Log activity
        const changeDescription = Object.keys(updatedFields)
          .map(field => `${field}: updated`)
          .join(', ');

        await logActivity(
          client,
          req.user.id,
          'automation_rule',
          ruleId,
          'updated',
          `Automation rule updated: ${changeDescription}`,
          { updated_fields: Object.keys(updatedFields) }
        );

        return rule;
      });

      res.json({
        message: 'Automation rule updated successfully',
        rule: {
          ...updatedRule,
          conditions: updatedRule.conditions || [],
          actions: updatedRule.actions || []
        }
      });

    } catch (error) {
      console.error('Error updating automation rule:', error);
      if (error.message === 'Automation rule not found' || error.message === 'No valid fields to update') {
        return res.status(400).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to update automation rule' });
    }
  }
);

// =============================================================================
// POST /api/automation-rules/:id/test - Test automation rule execution
// =============================================================================
router.post('/:id/test',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid rule ID format'),
    body('test_data').optional().isObject().withMessage('Test data must be an object')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const ruleId = req.params.id;
      const { test_data = {} } = req.body;

      const result = await withTransaction(async (client) => {
        // Get automation rule
        const ruleResult = await client.query(
          'SELECT * FROM automation_rules WHERE id = $1',
          [ruleId]
        );

        if (ruleResult.rows.length === 0) {
          throw new Error('Automation rule not found');
        }

        const rule = ruleResult.rows[0];

        // Create test execution record
        const executionResult = await client.query(
          `INSERT INTO automation_rule_executions (
            rule_id, trigger_data, status, result, executed_at
          ) VALUES ($1, $2, 'test', $3, CURRENT_TIMESTAMP)
          RETURNING *`,
          [ruleId, JSON.stringify(test_data), JSON.stringify({ test_mode: true })]
        );

        // Log activity
        await logActivity(
          client,
          req.user.id,
          'automation_rule',
          ruleId,
          'tested',
          `Automation rule tested: ${rule.name}`,
          { test_data }
        );

        return {
          rule: {
            ...rule,
            conditions: rule.conditions || [],
            actions: rule.actions || []
          },
          execution: executionResult.rows[0],
          test_result: 'Test execution completed'
        };
      });

      res.json({
        message: 'Automation rule test completed',
        ...result
      });

    } catch (error) {
      console.error('Error testing automation rule:', error);
      if (error.message === 'Automation rule not found') {
        return res.status(404).json({ error: error.message });
      }
      res.status(500).json({ error: 'Failed to test automation rule' });
    }
  }
);

// =============================================================================
// GET /api/automation-rules/:id/executions - Get rule execution history
// =============================================================================
router.get('/:id/executions',
  authenticateToken,
  requireAdmin,
  [
    param('id').isUUID().withMessage('Invalid rule ID format'),
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be positive integer'),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1-100'),
    query('status').optional().isIn(['success', 'failed', 'test']).withMessage('Invalid status')
  ],
  validateRequest,
  async (req, res) => {
    try {
      const ruleId = req.params.id;
      const { page = 1, limit = 50, status } = req.query;
      const offset = (page - 1) * limit;

      let whereConditions = ['rule_id = $1'];
      let queryParams = [ruleId];
      let paramIndex = 1;

      // Filter by status
      if (status) {
        paramIndex++;
        whereConditions.push(`status = $${paramIndex}`);
        queryParams.push(status);
      }

      const whereClause = whereConditions.join(' AND ');

      const executionsQuery = `
        SELECT *
        FROM automation_rule_executions
        WHERE ${whereClause}
        ORDER BY executed_at DESC
        LIMIT $${paramIndex + 1} OFFSET $${paramIndex + 2}
      `;

      queryParams.push(limit, offset);
      const result = await dbQuery(executionsQuery, queryParams);

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total
        FROM automation_rule_executions
        WHERE ${whereClause}
      `;
      
      const countResult = await dbQuery(countQuery, queryParams.slice(0, -2));
      const total = parseInt(countResult.rows[0].total);

      res.json({
        executions: result.rows,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Error fetching automation rule executions:', error);
      res.status(500).json({ error: 'Failed to fetch automation rule executions' });
    }
  }
);

export default router;