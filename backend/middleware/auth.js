const jwt = require('jsonwebtoken');

const authMiddleware = (roles = []) => {
  return (req, res, next) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      
      if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
      }
      
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.admin = decoded;
      
      // Check role if specified
      if (roles.length && !roles.includes(decoded.role)) {
        return res.status(403).json({ message: 'Insufficient permissions' });
      }
      
      next();
    } catch (error) {
      res.status(401).json({ message: 'Invalid token' });
    }
  };
};

// ✅ এই লাইনটি যোগ করুন: authMiddleware এক্সপোর্ট করুন
module.exports = authMiddleware;