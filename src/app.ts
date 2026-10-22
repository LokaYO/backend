import express, { Request, Response } from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { ENV } from './config/env.js';
import apiRouter from './routes/index.js';
import { errorHandler } from './middlewares/error.middleware.js';

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

  // Root Welcome Route
  app.get('/', (_req: Request, res: Response) => {
    res.json({
      message: '🚀 LokalSite Backend API Server is running',
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

