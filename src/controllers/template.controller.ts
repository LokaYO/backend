import { Request, Response } from 'express';
import { PRESET_TEMPLATES } from '../templates/presetTemplates.js';

export function listTemplates(_req: Request, res: Response): void {
  res.json({ templates: PRESET_TEMPLATES });
}

