const mongoose = require('mongoose');

const clickSchema = new mongoose.Schema({
  timestamp: { type: Date, default: Date.now },
  ipAddress: String,
  userAgent: String,
  browser: String,
  browserVersion: String,
  os: String,
  osVersion: String,
  device: String,
  referrer: String,
  country: { type: String, default: 'Unknown' },
  city: { type: String, default: 'Unknown' },
  isp: { type: String, default: 'Unknown' },
  cpuCores: Number,
  ram: Number,
  gpu: String,
  screenResolution: String,
  colorDepth: Number,
  timezone: String,
  language: String
});

module.exports = mongoose.model('Click', clickSchema);
