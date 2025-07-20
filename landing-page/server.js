const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
require('dotenv').config();

const contactHandler = require('./api/contact');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            imgSrc: ["'self'", "data:", "https://res.cloudinary.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            connectSrc: ["'self'"]
        }
    }
}));

// CORS configuration
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://coachee.co.il', 'https://www.coachee.co.il']
        : ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: {
        error: 'יותר מדי בקשות מכתובת IP זו, נסה שוב מאוחר יותר'
    }
});

const contactLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // limit each IP to 5 contact form submissions per hour
    message: {
        error: 'יותר מדי הודעות נשלחו, נסה שוב בעוד שעה'
    }
});

app.use(limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files
app.use(express.static(path.join(__dirname), {
    maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
    etag: true,
    lastModified: true
}));

// API Routes
app.post('/api/contact', contactLimiter, contactHandler);

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Serve index.html for all other routes (SPA fallback)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    
    res.status(err.status || 500).json({
        error: process.env.NODE_ENV === 'production' 
            ? 'אירעה שגיאה בשרת'
            : err.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'דף לא נמצא'
    });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});

const server = app.listen(PORT, () => {
    console.log(`
🚀 Coachee Landing Page Server Running

📍 Address: http://localhost:${PORT}
🌍 Environment: ${process.env.NODE_ENV || 'development'}
📧 Email Service: ${process.env.EMAIL_USER ? 'Configured' : 'Not configured'}
⏰ Started: ${new Date().toLocaleString('he-IL')}

📋 Available Endpoints:
   GET  /              - Landing page
   POST /api/contact   - Contact form
   GET  /api/health    - Health check

🔧 To get started:
   1. Open http://localhost:${PORT} in your browser
   2. Test the contact form
   3. Check the health endpoint: /api/health

💡 For production deployment:
   - Set NODE_ENV=production
   - Configure your domain in CORS settings
   - Update email credentials in environment variables
    `);
});

module.exports = app;