import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import morgan from 'morgan';

import { connectDB } from './config/db';
import { initSocket } from './config/socket';
import { logger } from './utils/logger';
import { errorHandler } from './middlewares/error.middleware';

// Route Imports
import authRoutes from './routes/auth.routes';
import studentRoutes from './routes/student.routes';
import courseRoutes from './routes/course.routes';
import facultyRoutes from './routes/faculty.routes';
import attendanceRoutes from './routes/attendance.routes';
import resultRoutes from './routes/result.routes';
import aiRoutes from './routes/ai.routes';
import dashboardRoutes from './routes/dashboard.routes';

dotenv.config();

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5001;

// Security Headers
app.use(helmet({
  crossOriginResourcePolicy: false // Allows static file serving without blocking
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',')
  : ['http://localhost:5173', 'http://localhost:3000', 'https://smart-student-management-system-seven.vercel.app'];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));

// Request Logging using Morgan integrated with Winston
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

// Express limits
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', limiter);

// Serve uploads folder static files
const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
app.use('/uploads', express.static(uploadDir));

// Connect to Database (MongoDB or fallback to JSON)
connectDB();

// Initialize Real-time WebSockets
initSocket(server);

// Mount API Routes
import activityRoutes from './routes/activity.routes';

// Ensure other routes remain...
app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/results', resultRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/activities', activityRoutes);

// Base Route
app.get('/', (req, res) => {
  res.json({ message: 'EduManager Smart Management API is active!' });
});

// Centralized Global Error Handler Middleware
app.use(errorHandler);

// Start listener
server.listen(PORT, () => {
  logger.info(`📡 Server listening on port http://localhost:${PORT}`);
});
