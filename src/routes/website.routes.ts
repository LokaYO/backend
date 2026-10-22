import { Router } from 'express';
import { requireAuth, requireClientOnly } from '../middlewares/auth.middleware.js';
import { asyncHandler } from '../middlewares/error.middleware.js';
import * as websiteController from '../controllers/website.controller.js';
import * as sectionController from '../controllers/section.controller.js';

const router = Router();

// Website CRUD (Admin hanya bisa monitoring, pembuatan/pengeditan khusus role 'user')
router.get('/', requireAuth, asyncHandler(websiteController.listWebsites));
router.post('/', requireAuth, requireClientOnly, asyncHandler(websiteController.createWebsite));
router.get('/:id', requireAuth, asyncHandler(websiteController.getWebsite));
router.put('/:id', requireAuth, requireClientOnly, asyncHandler(websiteController.updateWebsite));
router.delete('/:id', requireAuth, requireClientOnly, asyncHandler(websiteController.deleteWebsite));
router.post('/:id/publish', requireAuth, requireClientOnly, asyncHandler(websiteController.publishWebsite));
router.post('/:id/unpublish', requireAuth, requireClientOnly, asyncHandler(websiteController.unpublishWebsite));

// Website Sections (Khusus client pengguna 'user')
router.post('/:id/sections', requireAuth, requireClientOnly, asyncHandler(sectionController.addSection));
router.put('/:id/sections/reorder', requireAuth, requireClientOnly, asyncHandler(sectionController.reorderSections));
router.put('/:id/sections/:sectionId', requireAuth, requireClientOnly, asyncHandler(sectionController.updateSection));
router.delete('/:id/sections/:sectionId', requireAuth, requireClientOnly, asyncHandler(sectionController.deleteSection));

export default router;
