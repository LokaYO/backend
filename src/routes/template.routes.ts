import { Router } from 'express';
import * as templateController from '../controllers/template.controller.js';

const router = Router();

router.get('/', templateController.listTemplates);

export default router;

