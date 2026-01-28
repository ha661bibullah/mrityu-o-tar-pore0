const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Order = require('../models/Order');
const Book = require('../models/Book');
const authMiddleware = require('../middleware/auth');

// Get all admins (super_admin only)
router.get('/', authMiddleware(['super_admin']), async (req, res) => {
  try {
    const admins = await Admin.find({}, '-password');
    res.json(admins);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get admin profile
router.get('/profile', authMiddleware(), async (req, res) => {
  try {
    const admin = await Admin.findById(req.admin.id).select('-password');
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    res.json(admin);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update admin profile
router.put('/profile', authMiddleware(), async (req, res) => {
  try {
    const { username, email } = req.body;
    
    const admin = await Admin.findByIdAndUpdate(
      req.admin.id,
      { username, email, updatedAt: Date.now() },
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({
      message: 'Profile updated successfully',
      admin
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Change password
router.put('/change-password', authMiddleware(), async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    const admin = await Admin.findById(req.admin.id);
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    // Verify current password
    const isValidPassword = await admin.comparePassword(currentPassword);
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Current password is incorrect' });
    }
    
    // Update password
    admin.password = newPassword;
    await admin.save();
    
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Create new admin (super_admin only)
router.post('/', authMiddleware(['super_admin']), async (req, res) => {
  try {
    const { username, email, password, role } = req.body;
    
    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      return res.status(400).json({ message: 'Admin already exists' });
    }
    
    const admin = new Admin({
      username,
      email,
      password,
      role: role || 'admin'
    });
    
    const savedAdmin = await admin.save();
    const adminWithoutPassword = savedAdmin.toObject();
    delete adminWithoutPassword.password;
    
    res.status(201).json({
      message: 'Admin created successfully',
      admin: adminWithoutPassword
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Update admin (super_admin only)
router.put('/:id', authMiddleware(['super_admin']), async (req, res) => {
  try {
    const { username, email, role, isActive } = req.body;
    
    const updateData = { username, email, role, isActive };
    
    // Remove undefined fields
    Object.keys(updateData).forEach(key => {
      if (updateData[key] === undefined) {
        delete updateData[key];
      }
    });
    
    const admin = await Admin.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({
      message: 'Admin updated successfully',
      admin
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Delete admin (super_admin only)
router.delete('/:id', authMiddleware(['super_admin']), async (req, res) => {
  try {
    // Prevent deleting own account
    if (req.params.id === req.admin.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const admin = await Admin.findByIdAndDelete(req.params.id);
    
    if (!admin) {
      return res.status(404).json({ message: 'Admin not found' });
    }
    
    res.json({ message: 'Admin deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get dashboard statistics
router.get('/dashboard/stats', authMiddleware(), async (req, res) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today.setHours(0, 0, 0, 0));
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    // Get all orders
    const orders = await Order.find();
    
    // Calculate statistics
    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Today's orders
    const todaysOrders = await Order.find({
      createdAt: { $gte: startOfToday }
    });
    const todaysRevenue = todaysOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Monthly orders
    const monthlyOrders = await Order.find({
      createdAt: { $gte: startOfMonth }
    });
    const monthlyRevenue = monthlyOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    
    // Get all books
    const books = await Book.find();
    const totalBooks = books.length;
    const totalBooksSold = orders.reduce((sum, order) => {
      return sum + order.books.reduce((bookSum, book) => bookSum + book.quantity, 0);
    }, 0);
    
    // Get low stock books (stock < 10)
    const lowStockBooks = books.filter(book => book.stock < 10).length;
    
    // Get pending orders
    const pendingOrders = orders.filter(order => order.orderStatus === 'pending').length;
    
    res.json({
      totalOrders,
      totalRevenue,
      todaysOrders: todaysOrders.length,
      todaysRevenue,
      monthlyOrders: monthlyOrders.length,
      monthlyRevenue,
      totalBooks,
      totalBooksSold,
      lowStockBooks,
      pendingOrders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get recent orders
router.get('/dashboard/recent-orders', authMiddleware(), async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    const recentOrders = await Order.find()
      .populate('books.bookId')
      .sort({ createdAt: -1 })
      .limit(limit);
    
    res.json(recentOrders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get sales analytics data
router.get('/analytics/sales', authMiddleware(), async (req, res) => {
  try {
    const { period = 'monthly' } = req.query;
    
    let groupByFormat;
    let dateSubtract;
    
    switch (period) {
      case 'daily':
        groupByFormat = { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        };
        dateSubtract = { days: 30 };
        break;
      case 'weekly':
        groupByFormat = { 
          year: { $year: '$createdAt' },
          week: { $week: '$createdAt' }
        };
        dateSubtract = { weeks: 12 };
        break;
      case 'monthly':
      default:
        groupByFormat = { 
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        };
        dateSubtract = { months: 12 };
        break;
    }
    
    const salesData = await Order.aggregate([
      {
        $group: {
          _id: groupByFormat,
          totalAmount: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      {
        $sort: {
          '_id.year': 1,
          '_id.month': 1,
          '_id.day': 1,
          '_id.week': 1
        }
      }
    ]);
    
    res.json(salesData);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order status distribution
router.get('/analytics/order-status', authMiddleware(), async (req, res) => {
  try {
    const statusDistribution = await Order.aggregate([
      {
        $group: {
          _id: '$orderStatus',
          count: { $sum: 1 },
          totalAmount: { $sum: '$totalAmount' }
        }
      }
    ]);
    
    res.json(statusDistribution);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;