import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import mongoSanitize from 'express-mongo-sanitize';
import { sanitizeSqlIdentifier } from './validation.js';

// Enhanced rate limiters for different endpoints
export const rateLimiters = {
  // Strict rate limit for authentication endpoints
  auth: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 requests per window
    message: 'Too many authentication attempts, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    // Skip successful requests
    skipSuccessfulRequests: true,
    // Skip in development for localhost
    skip: (req) => {
      return process.env.NODE_ENV === 'development' && 
             (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
    }
  }),
  
  // Moderate rate limit for API endpoints
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // 100 requests per window
    message: 'Too many requests, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return process.env.NODE_ENV === 'development' && 
             (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
    }
  }),
  
  // Lenient rate limit for file uploads
  upload: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 20, // 20 uploads per window
    message: 'Too many file uploads, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
    skip: (req) => {
      return process.env.NODE_ENV === 'development' && 
             (req.ip === '127.0.0.1' || req.ip === '::1' || req.ip === '::ffff:127.0.0.1');
    }
  })
};

// SQL Injection prevention middleware
export const preventSqlInjection = (req, res, next) => {
  // Check all query parameters
  for (const [key, value] of Object.entries(req.query)) {
    if (typeof value === 'string') {
      // Check for common SQL injection patterns
      const sqlPatterns = [
        /(\b(UNION|SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
        /(-{2}|\/\*|\*\/|;|\||'|")/,
        /(xp_|sp_|0x|@@|char|nchar|varchar|nvarchar|cast|convert|exec)/i
      ];
      
      for (const pattern of sqlPatterns) {
        if (pattern.test(value)) {
          return res.status(400).json({ 
            error: 'Invalid characters detected in request' 
          });
        }
      }
    }
  }
  
  // Check body parameters for string fields
  if (req.body && typeof req.body === 'object') {
    const checkValue = (value) => {
      if (typeof value === 'string') {
        // Allow SQL keywords in certain fields like messages or descriptions
        const allowedFields = ['message', 'content', 'description', 'notes'];
        const fieldName = Object.keys(req.body).find(key => req.body[key] === value);
        
        if (!allowedFields.includes(fieldName)) {
          const dangerousPatterns = [
            /(\b(DROP|CREATE|ALTER|EXEC|EXECUTE)\b)/i,
            /(xp_|sp_|0x)/i
          ];
          
          for (const pattern of dangerousPatterns) {
            if (pattern.test(value)) {
              return false;
            }
          }
        }
      }
      return true;
    };
    
    const checkObject = (obj) => {
      for (const value of Object.values(obj)) {
        if (typeof value === 'object' && value !== null) {
          if (!checkObject(value)) return false;
        } else {
          if (!checkValue(value)) return false;
        }
      }
      return true;
    };
    
    if (!checkObject(req.body)) {
      return res.status(400).json({ 
        error: 'Invalid characters detected in request' 
      });
    }
  }
  
  next();
};

// NoSQL Injection prevention (for any future MongoDB usage)
export const preventNoSqlInjection = mongoSanitize({
  replaceWith: '_',
  onSanitize: ({ req, key }) => {
    console.warn(`NoSQL injection attempt blocked: ${key}`);
  }
});

// Path traversal prevention
export const preventPathTraversal = (req, res, next) => {
  const checkPath = (path) => {
    if (!path) return true;
    
    // Check for path traversal patterns
    const patterns = [
      /\.\./,
      /\.\.%2F/i,
      /\.\.%5C/i,
      /%2e%2e/i,
      /\x00/,
      /%00/
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(path)) {
        return false;
      }
    }
    
    // Check for absolute paths
    if (path.startsWith('/') || path.match(/^[a-zA-Z]:\\/)) {
      return false;
    }
    
    return true;
  };
  
  // Check all possible path parameters
  const pathParams = [
    req.params.path,
    req.query.path,
    req.query.folder,
    req.query.file,
    req.body?.path,
    req.body?.folder,
    req.body?.file,
    req.body?.folder_path
  ];
  
  for (const path of pathParams) {
    if (path && !checkPath(path)) {
      return res.status(400).json({ 
        error: 'Invalid path specified' 
      });
    }
  }
  
  next();
};

// Command injection prevention
export const preventCommandInjection = (req, res, next) => {
  const checkValue = (value) => {
    if (typeof value !== 'string') return true;
    
    // Check for command injection patterns
    const patterns = [
      /[;&|`$()<>]/,
      /\n|\r/,
      /(^|[^\\])\\n/
    ];
    
    for (const pattern of patterns) {
      if (pattern.test(value)) {
        return false;
      }
    }
    
    return true;
  };
  
  // Check all input sources
  const allInputs = [
    ...Object.values(req.query),
    ...Object.values(req.params),
    ...(req.body ? Object.values(req.body) : [])
  ];
  
  for (const input of allInputs) {
    if (!checkValue(input)) {
      return res.status(400).json({ 
        error: 'Invalid characters detected in request' 
      });
    }
  }
  
  next();
};

// CSRF protection for state-changing operations
export const csrfProtection = (req, res, next) => {
  // Skip for GET requests and API endpoints that use JWT
  if (req.method === 'GET' || req.path.startsWith('/api/')) {
    return next();
  }
  
  const token = req.headers['x-csrf-token'] || req.body._csrf;
  const sessionToken = req.session?.csrfToken;
  
  if (!token || token !== sessionToken) {
    return res.status(403).json({ 
      error: 'Invalid CSRF token' 
    });
  }
  
  next();
};

// Security headers configuration
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // Consider removing unsafe-eval in production
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
    }
  },
  crossOriginEmbedderPolicy: false, // May need to adjust based on requirements
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

// Request size limits
export const requestSizeLimits = {
  json: '10mb',
  urlencoded: '10mb',
  files: '50mb'
};

// Audit logging middleware
export const auditLog = (action) => {
  return async (req, res, next) => {
    const startTime = Date.now();
    
    // Capture original send
    const originalSend = res.send;
    let responseBody;
    
    res.send = function(data) {
      responseBody = data;
      originalSend.call(this, data);
    };
    
    res.on('finish', async () => {
      const duration = Date.now() - startTime;
      const logEntry = {
        timestamp: new Date().toISOString(),
        action,
        method: req.method,
        path: req.path,
        ip: req.ip || req.connection.remoteAddress,
        userId: req.user?.id || req.user?.userId || 'anonymous',
        statusCode: res.statusCode,
        duration,
        userAgent: req.headers['user-agent'],
        // Don't log sensitive data
        query: req.method === 'GET' ? req.query : undefined,
        error: res.statusCode >= 400 ? responseBody : undefined
      };
      
      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log('[AUDIT]', JSON.stringify(logEntry));
      }
      
      // TODO: In production, send to logging service or database
    });
    
    next();
  };
};