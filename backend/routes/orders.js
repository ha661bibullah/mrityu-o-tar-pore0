const express = require('express');
const router = express.Router();
const Order = require('../models/Order');
const Book = require('../models/Book');

// Create new order
router.post('/', async (req, res) => {
  try {
    const orderData = req.body;
    
    // Calculate total amount
    let totalAmount = 0;
    for (const item of orderData.books) {
      const book = await Book.findById(item.bookId);
      if (!book) {
        return res.status(404).json({ message: `Book ${item.bookId} not found` });
      }
      totalAmount += (book.discountPrice || book.price) * item.quantity;
      
      // Update stock
      book.stock -= item.quantity;
      if (book.stock < 0) {
        return res.status(400).json({ message: `Insufficient stock for ${book.title}` });
      }
      await book.save();
    }
    
    orderData.totalAmount = totalAmount;
    const order = new Order(orderData);
    const savedOrder = await order.save();
    
    res.status(201).json({
      message: 'Order created successfully',
      order: savedOrder
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate('books.bookId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get order by order ID
router.get('/track/:orderId', async (req, res) => {
  try {
    const order = await Order.findOne({ orderId: req.params.orderId }).populate('books.bookId');
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    res.json(order);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all orders (admin only)
router.get('/', async (req, res) => {
  try {
    const { status, startDate, endDate } = req.query;
    let query = {};
    
    if (status) query.orderStatus = status;
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }
    
    const orders = await Order.find(query)
      .populate('books.bookId')
      .sort({ createdAt: -1 });
    
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update order status (admin only)
router.patch('/:id/status', async (req, res) => {
  try {
    const { orderStatus } = req.body;
    const order = await Order.findByIdAndUpdate(
      req.params.id,
      { orderStatus, updatedAt: Date.now() },
      { new: true }
    );
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }
    
    res.json(order);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

module.exports = router;