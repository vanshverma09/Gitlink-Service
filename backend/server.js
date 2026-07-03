require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const useragent = require('express-useragent');
const requestIp = require('request-ip');

const Click = require('./models/Click');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(useragent.express());
app.use(requestIp.mw());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Redirect & Log Route
app.get('/github', async (req, res) => {
  try {
    const newClick = new Click({
      ipAddress: req.clientIp,
      userAgent: req.headers['user-agent'],
      browser: req.useragent.browser,
      os: req.useragent.os,
      device: req.useragent.isMobile ? 'Mobile' : req.useragent.isTablet ? 'Tablet' : 'Desktop',
      referrer: req.headers.referer || 'Direct',
    });
    
    await newClick.save();
    
    // Redirect to GitHub
    res.redirect(process.env.GITHUB_URL || 'https://github.com');
  } catch (error) {
    console.error('Error logging click:', error);
    res.redirect(process.env.GITHUB_URL || 'https://github.com');
  }
});

// Analytics Route (for the dashboard)
app.get('/api/clicks', async (req, res) => {
  try {
    const clicks = await Click.find().sort({ timestamp: -1 });
    res.json(clicks);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch clicks' });
  }
});

// Aggregate data for dashboard charts
app.get('/api/analytics', async (req, res) => {
  try {
    const totalClicks = await Click.countDocuments();
    
    const browserStats = await Click.aggregate([
      { $group: { _id: "$browser", count: { $sum: 1 } } }
    ]);
    
    const deviceStats = await Click.aggregate([
      { $group: { _id: "$device", count: { $sum: 1 } } }
    ]);

    const osStats = await Click.aggregate([
      { $group: { _id: "$os", count: { $sum: 1 } } }
    ]);
    
    res.json({
      totalClicks,
      browserStats,
      deviceStats,
      osStats
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch analytics' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
