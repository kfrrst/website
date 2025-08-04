import { body, param, query, validationResult } from 'express-validator';
import xss from 'xss';
import validator from 'validator';

// Custom sanitizers
const sanitizeHtml = (value) => {
  if (typeof value !== 'string') return value;
  // Remove all HTML tags and scripts
  return xss(value, {
    whiteList: {}, // No tags allowed
    stripIgnoreTag: true,
    stripIgnoreTagBody: ['script', 'style']
  });
};

const sanitizeFilename = (value) => {
  if (typeof value !== 'string') return value;
  // Remove path traversal attempts and dangerous characters
  return value
    .replace(/\.\./g, '')
    .replace(/[\/\\]/g, '')
    .replace(/[^\w\s\-\._]/g, '')
    .trim();
};

// Validation error handler
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array().map(err => ({
        field: err.path,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// Common validation chains
export const commonValidations = {
  // ID validations
  uuidParam: param('id')
    .isUUID()
    .withMessage('Invalid ID format'),
  
  // Pagination
  pagination: [
    query('page')
      .optional()
      .isInt({ min: 1, max: 1000 })
      .toInt()
      .withMessage('Page must be between 1 and 1000'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .toInt()
      .withMessage('Limit must be between 1 and 100')
  ],
  
  // Search
  search: query('search')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .customSanitizer(sanitizeHtml)
    .withMessage('Search query too long'),
  
  // Sort
  sort: (allowedFields) => [
    query('sort')
      .optional()
      .isIn(allowedFields)
      .withMessage(`Sort must be one of: ${allowedFields.join(', ')}`),
    query('order')
      .optional()
      .isIn(['asc', 'desc'])
      .toLowerCase()
      .withMessage('Order must be asc or desc')
  ]
};

// User validations
export const userValidations = {
  register: [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8, max: 128 })
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .withMessage('Password must be 8-128 characters with uppercase, lowercase, and number'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 100 })
      .customSanitizer(sanitizeHtml)
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage('Name can only contain letters, spaces, hyphens, and apostrophes'),
    body('role')
      .optional()
      .isIn(['client', 'admin'])
      .withMessage('Invalid role')
  ],
  
  login: [
    body('email')
      .trim()
      .isEmail()
      .normalizeEmail()
      .withMessage('Valid email is required'),
    body('password')
      .notEmpty()
      .withMessage('Password is required')
  ],
  
  update: [
    body('email')
      .optional()
      .trim()
      .isEmail()
      .normalizeEmail()
      .isLength({ max: 255 })
      .withMessage('Valid email is required'),
    body('first_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .customSanitizer(sanitizeHtml)
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage('First name can only contain letters, spaces, hyphens, and apostrophes'),
    body('last_name')
      .optional()
      .trim()
      .isLength({ min: 1, max: 100 })
      .customSanitizer(sanitizeHtml)
      .matches(/^[a-zA-Z\s\-']+$/)
      .withMessage('Last name can only contain letters, spaces, hyphens, and apostrophes'),
    body('phone')
      .optional()
      .trim()
      .matches(/^[\d\s\-\+\(\)]+$/)
      .isLength({ max: 20 })
      .withMessage('Invalid phone number format')
  ]
};

// Project validations
export const projectValidations = {
  create: [
    body('client_id')
      .isUUID()
      .withMessage('Valid client ID is required'),
    body('name')
      .trim()
      .isLength({ min: 1, max: 255 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Project name is required (max 255 characters)'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 2000 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Description max 2000 characters'),
    body('status')
      .optional()
      .isIn(['planning', 'in_progress', 'review', 'completed', 'on_hold', 'cancelled'])
      .withMessage('Invalid status'),
    body('priority')
      .optional()
      .isIn(['low', 'medium', 'high', 'urgent'])
      .withMessage('Invalid priority'),
    body('progress_percentage')
      .optional()
      .isInt({ min: 0, max: 100 })
      .toInt()
      .withMessage('Progress must be between 0 and 100'),
    body('budget_amount')
      .optional()
      .isDecimal({ decimal_digits: '0,2' })
      .isFloat({ min: 0, max: 999999999.99 })
      .toFloat()
      .withMessage('Invalid budget amount'),
    body('budget_currency')
      .optional()
      .isLength({ min: 3, max: 3 })
      .isAlpha()
      .toUpperCase()
      .withMessage('Currency must be 3-letter code'),
    body('start_date')
      .optional()
      .isISO8601()
      .toDate()
      .withMessage('Invalid start date'),
    body('due_date')
      .optional()
      .isISO8601()
      .toDate()
      .custom((value, { req }) => {
        if (req.body.start_date && value < new Date(req.body.start_date)) {
          throw new Error('Due date must be after start date');
        }
        return true;
      })
      .withMessage('Invalid due date')
  ]
};

// Invoice validations
export const invoiceValidations = {
  create: [
    body('project_id')
      .isUUID()
      .withMessage('Valid project ID is required'),
    body('invoice_number')
      .trim()
      .matches(/^[A-Z0-9\-]+$/)
      .isLength({ max: 50 })
      .withMessage('Invoice number must be alphanumeric with hyphens (max 50 chars)'),
    body('status')
      .optional()
      .isIn(['draft', 'sent', 'paid', 'overdue', 'cancelled'])
      .withMessage('Invalid invoice status'),
    body('due_date')
      .isISO8601()
      .toDate()
      .custom((value) => {
        if (value < new Date()) {
          throw new Error('Due date must be in the future');
        }
        return true;
      })
      .withMessage('Invalid due date'),
    body('line_items')
      .isArray({ min: 1 })
      .withMessage('At least one line item is required'),
    body('line_items.*.description')
      .trim()
      .isLength({ min: 1, max: 500 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Line item description required (max 500 chars)'),
    body('line_items.*.quantity')
      .isInt({ min: 1, max: 99999 })
      .toInt()
      .withMessage('Quantity must be between 1 and 99999'),
    body('line_items.*.unit_price')
      .isDecimal({ decimal_digits: '0,2' })
      .isFloat({ min: 0, max: 999999.99 })
      .toFloat()
      .withMessage('Invalid unit price'),
    body('line_items.*.tax_rate')
      .optional()
      .isDecimal({ decimal_digits: '0,4' })
      .isFloat({ min: 0, max: 1 })
      .toFloat()
      .withMessage('Tax rate must be between 0 and 1')
  ]
};

// File validations
export const fileValidations = {
  upload: [
    body('project_id')
      .optional()
      .isUUID()
      .withMessage('Invalid project ID'),
    body('folder_path')
      .optional()
      .trim()
      .customSanitizer(sanitizeFilename)
      .isLength({ max: 255 })
      .withMessage('Folder path too long'),
    body('description')
      .optional()
      .trim()
      .isLength({ max: 500 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Description max 500 characters')
  ],
  
  validateFilename: (filename) => {
    // Check for path traversal
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return false;
    }
    
    // Check file extension
    const allowedExtensions = [
      '.jpg', '.jpeg', '.png', '.gif', '.pdf', '.doc', '.docx',
      '.xls', '.xlsx', '.txt', '.zip', '.mp4', '.mov', '.ai',
      '.psd', '.svg', '.eps'
    ];
    
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (!allowedExtensions.includes(ext)) {
      return false;
    }
    
    // Check filename length
    if (filename.length > 255) {
      return false;
    }
    
    return true;
  }
};

// Message validations
export const messageValidations = {
  send: [
    body('recipient_id')
      .isUUID()
      .withMessage('Valid recipient ID is required'),
    body('subject')
      .trim()
      .isLength({ min: 1, max: 200 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Subject is required (max 200 characters)'),
    body('content')
      .trim()
      .isLength({ min: 1, max: 5000 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Message content is required (max 5000 characters)'),
    body('project_id')
      .optional()
      .isUUID()
      .withMessage('Invalid project ID')
  ]
};

// Phase validations
export const phaseValidations = {
  update: [
    body('phase')
      .isIn(['ideation', 'design', 'review', 'finalization', 'production', 'payment', 'delivery'])
      .withMessage('Invalid phase'),
    body('status')
      .optional()
      .isIn(['not_started', 'in_progress', 'completed', 'skipped'])
      .withMessage('Invalid status'),
    body('notes')
      .optional()
      .trim()
      .isLength({ max: 1000 })
      .customSanitizer(sanitizeHtml)
      .withMessage('Notes max 1000 characters'),
    body('completion_percentage')
      .optional()
      .isInt({ min: 0, max: 100 })
      .toInt()
      .withMessage('Completion percentage must be between 0 and 100')
  ]
};

// SQL Injection prevention for dynamic queries
export const sanitizeSqlIdentifier = (identifier) => {
  // Only allow alphanumeric characters and underscores
  if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(identifier)) {
    throw new Error('Invalid SQL identifier');
  }
  return identifier;
};

// XSS prevention for output
export const sanitizeOutput = (data) => {
  if (typeof data === 'string') {
    return sanitizeHtml(data);
  } else if (Array.isArray(data)) {
    return data.map(sanitizeOutput);
  } else if (data && typeof data === 'object') {
    const sanitized = {};
    for (const [key, value] of Object.entries(data)) {
      sanitized[key] = sanitizeOutput(value);
    }
    return sanitized;
  }
  return data;
};

// Rate limiting helper
export const createRateLimiter = (windowMs, max, message) => {
  const attempts = new Map();
  
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowStart = now - windowMs;
    
    // Clean old entries
    for (const [k, v] of attempts.entries()) {
      if (v.timestamp < windowStart) {
        attempts.delete(k);
      }
    }
    
    // Check rate limit
    const userAttempts = attempts.get(key) || { count: 0, timestamp: now };
    
    if (userAttempts.timestamp < windowStart) {
      userAttempts.count = 1;
      userAttempts.timestamp = now;
    } else {
      userAttempts.count++;
    }
    
    attempts.set(key, userAttempts);
    
    if (userAttempts.count > max) {
      return res.status(429).json({ error: message });
    }
    
    next();
  };
};