import http from 'http';
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './config/db.js';
import { initSocket } from './socket/socketServer.js';

// Phase 1 & 2 Routes
import authRoutes from './routes/authRoutes.js';
import userRoutes from './routes/userRoutes.js';
import postRoutes from './routes/postRoutes.js';
import commentRoutes from './routes/commentRoutes.js';

// Phase 3 Routes
import conversationRoutes from './routes/conversationRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import searchRoutes from './routes/searchRoutes.js';

// Phase 4 Routes (R.9 Admin Module & R.10 Secret Chat Module)
import adminRoutes from './routes/adminRoutes.js';
import secretChatRoutes from './routes/secretChatRoutes.js';
import secretMessageRoutes from './routes/secretMessageRoutes.js';

// Phase 5 Routes (Agora Video Calling & Lifecycle)
import videoCallRoutes from './routes/videoCallRoutes.js';

// Stories Feature Routes
import storyRoutes from './routes/storyRoutes.js';

// Middleware
import { notFound, errorHandler } from './middleware/errorMiddleware.js';

dotenv.config();
connectDB();

const app = express();

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins (localhost, LAN IP, remote devices) with credentials support
      callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-secret-token']
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get(['/', '/api'], (req, res) => {
  res.json({
    status: 'online',
    project: 'SocialX API',
    version: '5.0.0',
    phase: 'Phase 5: Master Integration & Agora Video Calling'
  });
});

// Phase 1 & 2 API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);

// Phase 3 API Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/search', searchRoutes);

// Phase 4 API Routes
app.use('/api/admin', adminRoutes);
app.use('/api/secret-chats', secretChatRoutes);
app.use('/api/secret-messages', secretMessageRoutes);

// Phase 5 API Routes
app.use('/api/video-calls', videoCallRoutes);

// Stories API Routes
app.use('/api/stories', storyRoutes);

// Error Handling
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Wrap Express in HTTP server for Socket.IO
const httpServer = http.createServer(app);
initSocket(httpServer);

httpServer.listen(PORT, () => {
  console.log(`SocialX Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
});

export default app;