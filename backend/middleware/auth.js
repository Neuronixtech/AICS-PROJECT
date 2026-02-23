const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Sanitize input to prevent NoSQL injection
const sanitizeInput = (input) => {
  if (typeof input === 'object' && input !== null) {
    return JSON.parse(JSON.stringify(input));
  }
  return input;
};

// Protect routes - verify JWT token
exports.protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    try {
      // Get token from header
      token = req.headers.authorization.split(' ')[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Sanitize decoded id
      const userId = sanitizeInput(decoded.id);

      // Get user from token (excluding password)
      req.user = await User.findById(userId).select('-password');

      if (!req.user || !req.user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      next();
    } catch (error) {
      console.error('Auth error:', error.message);
      res.status(401).json({ message: 'Not authorized, token failed' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'Not authorized, no token' });
  }
};

// Check if user is admin
exports.adminOnly = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin only.' });
  }
};

// Check if user is admin or staff
exports.adminOrStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'admin' || req.user.role === 'staff')) {
    next();
  } else {
    res.status(403).json({ message: 'Access denied. Admin or Staff only.' });
  }
};
