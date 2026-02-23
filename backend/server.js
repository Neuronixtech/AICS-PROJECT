const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const path = require('path');
const connectDB = require('./config/db');

dotenv.config();
connectDB();

const app = express();

// Security: CORS configuration
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

// Security: Limit JSON payload size to prevent DoS
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security: Serve static files with proper headers
app.use('/uploads', express.static(path.join(__dirname, '../uploads'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    if (path.endsWith('.pdf')) {
      res.set('Content-Type', 'application/pdf');
      res.set('X-Content-Type-Options', 'nosniff');
    }
  }
}));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Routes
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/students', require('./routes/studentRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
app.use('/api/certificates', require('./routes/certificateRoutes'));
app.use('/api/enquiries', require('./routes/enquiryRoutes'));
app.use('/api/discounts', require('./routes/discountRoutes'));

app.get('/', (req, res) => res.json({ message: 'Course Institute Management API v2.0 - Secure' }));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode).json({ 
    message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`✅ Secure server running on port ${PORT}`));
