import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';
import { globalApiLimiter } from './middlewares/rateLimit.middleware.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.resolve(__dirname, '../public/uploads');

export function createApp() {
  const app = express();

  // Core Middlewares
  app.use(
    cors({
      origin: ENV.CORS_ORIGIN,
      credentials: true,
    })
  );
  app.use(morgan('dev'));
  app.use(express.json({ limit: '10mb' }));

  // Static files for uploads (Direct Image Serving)
  app.use('/uploads', express.static(uploadDir));

  // Global Rate Limiting for all API Endpoints
  app.use('/api', globalApiLimiter);

  // Root Welcome Route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: '🚀 LOKA Backend API Server is running',
      version: '1.0.0',
      docs: '/api/templates',
      health: '/api/health',
    });
  });

  // Mount Modular API Routes
  app.use('/api', apiRouter);

  // Global Error Handler
  app.use(errorHandler);

  return app;
}

