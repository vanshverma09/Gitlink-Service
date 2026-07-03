const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  browser: String,
  os: String,
  device: String,
  referrer: String,
});

module.exports = mongoose.model('Click', clickSchema);
