import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { apiRateLimiter } from './middleware/rateLimiter';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import complaintRoutes from './routes/complaintRoutes';
import authorityRoutes from './routes/authorityRoutes';
import aiRoutes from './routes/aiRoutes';
import uploadRoutes from './routes/uploadRoutes';
import chatRoutes from './routes/chatRoutes';
import managementRoutes from './routes/managementRoutes';

const app = express();

// Security and parser middleware
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Apply rate limiter to all API endpoints
app.use('/api', apiRateLimiter);

// Serve static uploaded files
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Health Check
app.get(['/health', '/api/health'], (_req, res) => {
  res.status(200).json({ status: 'OK', message: 'Backend API is running.' });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/complaints', complaintRoutes);
app.use('/api/authority', authorityRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/management', managementRoutes);

// Global Error Handler
app.use(errorHandler);

export default app;
