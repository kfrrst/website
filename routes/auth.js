import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import { authenticateToken } from '../middleware/auth.js';
import { query, beginTransaction, commitTransaction, rollbackTransaction } from '../config/database.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const router = express.Router();

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const JWT_EXPIRES_IN = '15m';
const REFRESH_TOKEN_EXPIRES_IN = '7d';

// Generate tokens
const generateTokens = (userId, email, role) => {
  const accessToken = jwt.sign(
    { userId, email, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
  
  const refreshToken = jwt.sign(
    { userId, email, role, type: 'refresh' },
    JWT_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRES_IN }
  );
  
  return { accessToken, refreshToken };
};

// Validation rules
const registerValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('name').trim().notEmpty().withMessage('Name is required'),
  body('role').optional().isIn(['client', 'admin']).withMessage('Invalid role')
];

const loginValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
];

// Register endpoint
router.post('/register', registerValidation, async (req, res) => {
  const client = await beginTransaction();
  
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      await rollbackTransaction(client);
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password, name, role = 'client' } = req.body;

    // Check if user already exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      await rollbackTransaction(client);
      return res.status(409).json({ 
        error: 'User already exists with this email' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const userId = uuidv4();
    const userResult = await client.query(
      `INSERT INTO users (id, email, password_hash, name, role) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, email, name, role, created_at`,
      [userId, email, hashedPassword, name, role]
    );
    
    const user = userResult.rows[0];

    // Create user session
    const sessionId = uuidv4();
    const sessionToken = uuidv4();
    const { accessToken, refreshToken } = generateTokens(userId, email, role);
    
    await client.query(
      `INSERT INTO user_sessions (id, user_id, session_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [sessionId, userId, sessionToken, refreshToken]
    );

    await commitTransaction(client);

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    await rollbackTransaction(client);
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Login endpoint
router.post('/login', loginValidation, async (req, res) => {
  try {
    // Check validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const userResult = await query(
      'SELECT id, email, password_hash, first_name, last_name, role, is_active FROM users WHERE email = $1',
      [email]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = userResult.rows[0];
    
    // Check if user is active
    if (!user.is_active) {
      return res.status(403).json({ error: 'Account is disabled' });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password_hash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login
    await query(
      'UPDATE users SET last_login_at = NOW() WHERE id = $1',
      [user.id]
    );

    // Generate tokens
    const { accessToken, refreshToken } = generateTokens(user.id, user.email, user.role);
    
    // Store refresh token in database
    const sessionId = uuidv4();
    const sessionToken = uuidv4(); // Generate session token
    await query(
      `INSERT INTO user_sessions (id, user_id, session_token, refresh_token, expires_at)
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '7 days')`,
      [sessionId, user.id, sessionToken, refreshToken]
    );
    
    // Log activity
    await query(
      `INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), user.id, 'login', 'user', user.id, `User ${user.email} logged in`]
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        name: `${user.first_name} ${user.last_name}`,
        role: user.role
      },
      accessToken,
      refreshToken
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Refresh token endpoint
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      return res.status(401).json({ error: 'Refresh token required' });
    }

    // Check if refresh token exists in database
    const sessionResult = await query(
      `SELECT s.id, s.user_id, s.expires_at, u.email, u.role 
       FROM user_sessions s 
       JOIN users u ON s.user_id = u.id 
       WHERE s.refresh_token = $1 AND s.expires_at > NOW()`,
      [refreshToken]
    );

    if (sessionResult.rows.length === 0) {
      return res.status(403).json({ error: 'Invalid or expired refresh token' });
    }

    const session = sessionResult.rows[0];

    // Verify refresh token
    jwt.verify(refreshToken, JWT_SECRET, async (err, decoded) => {
      if (err) {
        // Remove invalid session
        await query('DELETE FROM user_sessions WHERE id = $1', [session.id]);
        return res.status(403).json({ error: 'Invalid refresh token' });
      }

      // Generate new tokens
      const { accessToken, refreshToken: newRefreshToken } = generateTokens(
        session.user_id,
        session.email,
        session.role
      );

      // Update session with new refresh token
      await query(
        `UPDATE user_sessions 
         SET refresh_token = $1, expires_at = NOW() + INTERVAL '7 days', updated_at = NOW() 
         WHERE id = $2`,
        [newRefreshToken, session.id]
      );

      res.json({
        accessToken,
        refreshToken: newRefreshToken
      });
    });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (refreshToken) {
      // Remove session from database
      await query(
        'DELETE FROM user_sessions WHERE refresh_token = $1',
        [refreshToken]
      );
    }
    
    // Log activity
    await query(
      `INSERT INTO activity_log (id, user_id, action, entity_type, entity_id, description)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [uuidv4(), req.user.userId, 'logout', 'user', req.user.userId, `User logged out`]
    );

    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get current user endpoint
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userResult = await query(
      `SELECT id, email, name, role, created_at, last_login, is_active 
       FROM users WHERE id = $1`,
      [req.user.userId]
    );
    
    if (userResult.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = userResult.rows[0];

    res.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        createdAt: user.created_at,
        lastLogin: user.last_login,
        isActive: user.is_active
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Initialize database admin user if needed
if (process.env.NODE_ENV === 'development') {
  (async () => {
    try {
      const adminEmail = 'admin@kendrickforrest.com';
      const existingAdmin = await query(
        'SELECT id FROM users WHERE email = $1',
        [adminEmail]
      );
      
      if (existingAdmin.rows.length === 0) {
        console.log('Creating default admin user...');
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await query(
          `INSERT INTO users (id, email, password_hash, first_name, last_name, role) 
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [uuidv4(), adminEmail, hashedPassword, 'Kendrick', 'Forrest', 'admin']
        );
        console.log('Default admin user created:', adminEmail);
      } else {
        console.log('Admin user already exists');
      }
    } catch (error) {
      console.error('Error initializing admin user:', error);
    }
  })();
}

export default router;