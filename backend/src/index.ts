// server.ts (or index.ts)
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';

import { notificationQueue } from './queue/notificationQueue';
import notifyRouter from './routes/notify';
import { startScheduler } from './scheduler/scheduler';
import { sendInApp, setSocketServer } from './services/inAppService';
import swaggerRouter from './swagger';
import logsRouter from './routes/logs';

import cors from "cors";



// Prisma Client setup
const prisma = new PrismaClient();

// Create Express app
const app = express();

app.use(cors({
  origin: [
    "http://localhost:3000",
    "https://dheenotifications.vercel.app"
  ],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: false
}));

app.use(express.json());
app.use('/api/logs', logsRouter);

app.use('/api/docs', swaggerRouter);


// Create HTTP and WebSocket servers
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

// Socket.IO setup
io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Join a room using socket ID (or user ID later)
  socket.join(socket.id);

  // Emit initial xconnected message
  socket.emit('connected', { id: socket.id });
});

// Pass Socket.IO instance to other modules
setSocketServer(io);

// Routes
app.get('/', (req, res) => {
  res.send('Dheenotifications backend is running!');
});

app.use('/api/notify', notifyRouter);

// Test DB route
app.get('/test-db', async (req, res) => {
  const logs = await prisma.notificationLog.findMany({ take: 3 });
  res.json(logs);
});

// Test queue route
app.post('/test-queue', async (req, res) => {
  await notificationQueue.add('send', {
    to: 'dheemanthmadaiah@gmail.com',
    channel: 'email',
    message: 'Hello from the queue!',
  });
  res.json({ status: 'job added' });
});

// Get latest logs
app.get('/logs', async (req, res) => {
  const logs = await prisma.notificationLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
  });
  res.json(logs);
});

// Start scheduler
startScheduler();

// Start HTTP + WebSocket server
const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});
