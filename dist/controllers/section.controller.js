import * as sectionService from '../services/section.service.js';
export async function addSection(req, res) {
    const { type, content } = req.body;
    const section = await sectionService.addSection(req.params.id, req.userId, type, content);
    res.json({ success: true, section });
}
export async function updateSection(req, res) {
    const { content } = req.body;
    const result = await sectionService.updateSection(req.params.id, req.params.sectionId, req.userId, content);
    res.json(result);
}
export async function deleteSection(req, res) {
    const result = await sectionService.deleteSection(req.params.id, req.params.sectionId, req.userId);
    res.json(result);
}
export async function reorderSections(req, res) {
    const { sectionIds } = req.body;
    const result = await sectionService.reorderSections(req.params.id, req.userId, sectionIds);
    res.json(result);
}
