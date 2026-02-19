const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const expressValidator = require('express-validator');

// Import middleware
const { 
  errorHandler, 
  notFoundHandler, 
  databaseErrorHandler,
  healthCheckErrorHandler,
  timeoutHandler,
  payloadTooLargeHandler
} = require('./middleware/errorHandler');
const { 
  authenticate, 
  securityHeaders, 
  requestLogger,
  rateLimit: customRateLimit 
} = require('./middleware/authMiddleware');

// Import routes
const authRoutes = require('./routes/authRoutes');
const bankRoutes = require('./routes/bankRoutes');
const userRoutes = require('./routes/userRoutes');

// Import utilities
const logger = require('./utils/logger');
const database = require('./config/database');

// Create Express app
const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    // In development, allow all origins
    if (process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    
    // In production, allow specific origins
    const allowedOrigins = [
      'http://localhost:3000',
      'https://kodbank.example.com',
      'https://www.kodbank.example.com'
    ];
    
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.logSecurity('CORS_VIOLATION', 'medium', {
        origin,
        allowedOrigins
      });
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
  exposedHeaders: ['X-Total-Count', 'X-Page-Count']
};

app.use(cors(corsOptions));

// Custom security headers
app.use(securityHeaders);

// Compression middleware
app.use(compression());

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Request logging
app.use(morgan('combined', { stream: logger.stream }));

// Custom request logger
app.use(requestLogger);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 100 : 1000, // Limit each IP
  message: {
    success: false,
    message: 'Too many requests from this IP, please try again later.',
    error: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.logSecurity('RATE_LIMIT_EXCEEDED', 'high', {
      ip: req.ip,
      userAgent: req.get('User-Agent'),
      method: req.method,
      url: req.originalUrl
    });
    
    res.status(429).json({
      success: false,
      message: 'Too many requests from this IP, please try again later.',
      error: 'RATE_LIMIT_EXCEEDED',
      retryAfter: Math.ceil(15 * 60) // 15 minutes
    });
  }
});

app.use('/api/', limiter);

// Stricter rate limiting for auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 50, // Limit auth attempts
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later.',
    error: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  skipSuccessfulRequests: true
});

// Health check endpoint (no rate limiting)
app.get('/health', async (req, res) => {
  try {
    const dbHealth = await database.healthCheck();
    
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.npm_package_version || '1.0.0',
      database: dbHealth,
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024 * 100) / 100
      }
    };

    if (dbHealth.status !== 'healthy') {
      health.status = 'degraded';
      return res.status(503).json(health);
    }

    res.json(health);
  } catch (error) {
    logger.logError(error, req);
    
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// API info endpoint
app.get('/api', (req, res) => {
  res.json({
    name: 'KodBank API',
    version: '1.0.0',
    description: 'Modern Banking Application API',
    endpoints: {
      auth: '/api/auth',
      bank: '/api/bank',
      user: '/api/user',
      health: '/health'
    },
    documentation: '/api/docs',
    status: 'operational',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/bank', bankRoutes);
app.use('/api/user', userRoutes);

// API documentation (simple version)
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'KodBank API Documentation',
    version: '1.0.0',
    description: 'Complete API documentation for KodBank banking application',
    baseUrl: `${req.protocol}://${req.get('host')}/api`,
    authentication: {
      type: 'Bearer Token',
      description: 'JWT token required for most endpoints',
      login: '/api/auth/login'
    },
    endpoints: {
      authentication: {
        'POST /auth/signup': 'Register new user',
        'POST /auth/login': 'User login',
        'POST /auth/logout': 'User logout',
        'GET /auth/profile': 'Get user profile',
        'PUT /auth/profile': 'Update user profile',
        'POST /auth/change-password': 'Change password',
        'DELETE /auth/account': 'Delete account'
      },
      banking: {
        'GET /bank/balance': 'Get account balance',
        'POST /bank/transfer': 'Transfer money',
        'GET /bank/transactions': 'Get transaction history',
        'POST /bank/deposit': 'Deposit money',
        'POST /bank/withdraw': 'Withdraw money',
        'GET /bank/statistics': 'Get account statistics'
      },
      user: {
        'GET /user/dashboard': 'Get dashboard data',
        'GET /user/activity': 'Get account activity',
        'GET /user/search': 'Search users',
        'GET /user/preferences': 'Get user preferences'
      }
    },
    errors: {
      commonCodes: {
        '400': 'Bad Request - Validation error',
        '401': 'Unauthorized - Authentication required',
        '403': 'Forbidden - Access denied',
        '404': 'Not Found - Resource not found',
        '429': 'Too Many Requests - Rate limit exceeded',
        '500': 'Internal Server Error'
      }
    },
    examples: {
      login: {
        method: 'POST',
        url: '/api/auth/login',
        body: {
          email: 'user@example.com',
          password: 'password123'
        }
      },
      transfer: {
        method: 'POST',
        url: '/api/bank/transfer',
        headers: {
          'Authorization': 'Bearer <jwt_token>'
        },
        body: {
          to_customer_id: 2,
          amount: 100.50,
          description: 'Payment for services'
        }
      }
    }
  });
});

// Handle 404 for API routes
app.use('/api/*', notFoundHandler);

// Error handling middleware
app.use(healthCheckErrorHandler);
app.use(databaseErrorHandler);
app.use(timeoutHandler);
app.use(payloadTooLargeHandler);
app.use(errorHandler);

// Handle 404 for non-API routes
app.use(notFoundHandler);

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    database.close().then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    });
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    database.close().then(() => {
      logger.info('Database connections closed');
      process.exit(0);
    });
  });
});

// Unhandled promise rejection handler
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Uncaught exception handler
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});

module.exports = app;
