import { Router } from 'express';
import authRoutes from './auth.routes.js';
import websiteRoutes from './website.routes.js';
import aiRoutes from './ai.routes.js';
import templateRoutes from './template.routes.js';
import publicRoutes from './public.routes.js';
import adminRoutes from './admin.routes.js';
import uploadRoutes from './upload.routes.js';

const apiRouter = Router();

apiRouter.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

apiRouter.use('/auth', authRoutes);
apiRouter.use('/websites', websiteRoutes);
apiRouter.use('/ai', aiRoutes);
apiRouter.use('/templates', templateRoutes);
apiRouter.use('/public', publicRoutes);
apiRouter.use('/admin', adminRoutes);
apiRouter.use('/upload', uploadRoutes);

export default apiRouter;
