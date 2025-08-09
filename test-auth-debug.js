import express from 'express';
import { authenticateToken } from './middleware/auth.js';

const router = express.Router();

// Debug endpoint to test authentication
router.post('/test-auth', authenticateToken, (req, res) => {
  console.log('Test auth endpoint hit');
  console.log('Headers:', req.headers);
  console.log('User from token:', req.user);
  console.log('Body:', req.body);
  
  res.json({
    success: true,
    message: 'Authentication successful',
    user: req.user,
    bodyReceived: req.body
  });
});

export default router;