import { PRESET_TEMPLATES } from '../templates/presetTemplates.js';
export function listTemplates(_req, res) {
    res.json({ templates: PRESET_TEMPLATES });
}
