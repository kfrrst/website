import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    
    // Map the JWT payload to match expected user object structure
    // Handle both 'id' and 'userId' in the token payload
    req.user = {
      id: decoded.id || decoded.userId,
      email: decoded.email,
      role: decoded.role
    };
    next();
  });
};

// Middleware to check if user is admin
const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Middleware to check if user is client
const requireClient = (req, res, next) => {
  if (req.user.role !== 'client' && req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Client access required' });
  }
  next();
};

// Middleware to optionally authenticate (for mixed public/private routes)
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      req.user = null;
    } else {
      // Map the JWT payload to match expected user object structure
      // Handle both 'id' and 'userId' in the token payload
      req.user = {
        id: decoded.id || decoded.userId,
        email: decoded.email,
        role: decoded.role
      };
    }
    next();
  });
};

export {
  authenticateToken,
  requireAdmin,
  requireClient,
  optionalAuth
};