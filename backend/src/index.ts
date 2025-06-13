import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import cors from 'cors';
import cron from 'node-cron';
import dotenv from 'dotenv';

// Import routes
import { notificationQueue } from './queue/notificationQueue';
import notifyRouter from './routes/notify';
import logsRouter from './routes/logs';
import authRouter from './routes/auth';
import analyticsRouter from './routes/analytics';
import templatesRouter from './routes/templates';
import campaignsRouter from './routes/campaigns';
import swaggerRouter from './swagger';

// Import middleware
import { generalLimiter } from './middleware/rateLimiter';
import { securityHeaders, trackApiUsage, validateContentType } from './middleware/security';
import { optionalAuth } from './middleware/auth';

// Import services
import { startScheduler } from './scheduler/scheduler';
import { sendInApp, setSocketServer } from './services/inAppService';
import { HealthService } from './services/healthService';

dotenv.config();

// Prisma Client setup
const prisma = new PrismaClient();

// Create Express app
const app = express();

// Security middleware
app.use(securityHeaders);
app.use(generalLimiter);

// CORS configuration
app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://dheenotifications.vercel.app",
    "https://work-1-gjjroxznnvaorefr.prod-runtime.all-hands.dev",
    "https://work-2-gjjroxznnvaorefr.prod-runtime.all-hands.dev"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization", "x-api-key"]
}));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Content type validation
app.use(validateContentType);

// API usage tracking (optional auth for tracking)
app.use(optionalAuth);
app.use(trackApiUsage);

// Create HTTP and WebSocket servers
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { 
    origin: [
      "http://localhost:3000",
      "https://dheenotifications.vercel.app",
      "https://work-1-gjjroxznnvaorefr.prod-runtime.all-hands.dev",
      "https://work-2-gjjroxznnvaorefr.prod-runtime.all-hands.dev"
    ],
    credentials: true 
  },
});

// Socket.IO setup with authentication
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room using socket ID (or user ID later)
  socket.join(socket.id);

  // Emit initial connected message
  socket.emit('connected', { id: socket.id });

  // Handle user authentication for socket
  socket.on('authenticate', (data) => {
    if (data.userId) {
      socket.join(`user_${data.userId}`);
      console.log(`User ${data.userId} authenticated on socket ${socket.id}`);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

// Pass Socket.IO instance to other modules
setSocketServer(io);

// API Routes
app.get('/', (req, res) => {
  res.json({
    message: 'Dheenotifications API is running!',
    version: '2.0.0',
    features: [
      'Multi-channel notifications (Email, SMS, In-App)',
      'User authentication & authorization',
      'Template management',
      'Campaign management',
      'Real-time analytics',
      'Rate limiting & security',
      'Health monitoring',
      'API documentation'
    ],
    endpoints: {
      auth: '/api/auth',
      notifications: '/api/notify',
      templates: '/api/templates',
      campaigns: '/api/campaigns',
      analytics: '/api/analytics',
      logs: '/api/logs',
      docs: '/api/docs'
    }
  });
});

// Mount routers
app.use('/api/auth', authRouter);
app.use('/api/notify', notifyRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/campaigns', campaignsRouter);
app.use('/api/analytics', analyticsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/docs', swaggerRouter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const healthService = HealthService.getInstance();
    const status = await healthService.getSystemStatus();
    
    const overallStatus = Object.values(status).every((service: any) => 
      service.status === 'healthy'
    ) ? 'healthy' : 'degraded';

    res.status(overallStatus === 'healthy' ? 200 : 503).json({
      status: overallStatus,
      timestamp: new Date().toISOString(),
      services: status
    });
  } catch (error) {
    res.status(503).json({
      status: 'down',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    });
  }
});

// Legacy routes for backward compatibility
app.get('/test-db', async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({ take: 3 });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Database connection failed' });
  }
});

app.post('/test-queue', async (req, res) => {
  try {
    await notificationQueue.add('send', {
      to: 'test@example.com',
      channel: 'email',
      message: 'Hello from the queue!',
    });
    res.json({ status: 'job added' });
  } catch (error) {
    res.status(500).json({ error: 'Queue test failed' });
  }
});

app.get('/logs', async (req, res) => {
  try {
    const logs = await prisma.notificationLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint not found',
    message: 'Please check the API documentation at /api/docs'
  });
});

// Global error handler
app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error:', error);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
});

// Start scheduler
startScheduler();

// Start health monitoring
const healthService = HealthService.getInstance();

// Health check every 5 minutes
cron.schedule('*/5 * * * *', async () => {
  try {
    await healthService.performHealthCheck();
  } catch (error) {
    console.error('Health check failed:', error);
  }
});

// Cleanup old health records daily at midnight
cron.schedule('0 0 * * *', async () => {
  try {
    await healthService.cleanupOldHealthRecords();
    console.log('Old health records cleaned up');
  } catch (error) {
    console.error('Health records cleanup failed:', error);
  }
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  await prisma.$disconnect();
  process.exit(0);
});

// Start HTTP + WebSocket server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Dheenotifications API v2.0 listening on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/health`);
});
