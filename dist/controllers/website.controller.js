import * as websiteService from '../services/website.service.js';
export async function listWebsites(req, res) {
    const websites = await websiteService.getUserWebsites(req.userId);
    res.json({ websites });
}
export async function getWebsite(req, res) {
    const website = await websiteService.getWebsiteById(req.params.id, req.userId);
    res.json({ website });
}
export async function createWebsite(req, res) {
    const result = await websiteService.createWebsite(req.userId, req.body);
    res.json({ success: true, ...result });
}
export async function updateWebsite(req, res) {
    const result = await websiteService.updateWebsite(req.params.id, req.userId, req.body);
    res.json(result);
}
export async function deleteWebsite(req, res) {
    const result = await websiteService.deleteWebsite(req.params.id, req.userId);
    res.json(result);
}
export async function publishWebsite(req, res) {
    const result = await websiteService.publishWebsite(req.params.id, req.userId);
    res.json(result);
}
export async function unpublishWebsite(req, res) {
    const result = await websiteService.unpublishWebsite(req.params.id, req.userId);
    res.json(result);
}
export async function duplicateWebsite(req, res) {
    const result = await websiteService.duplicateWebsite(req.params.id, req.userId);
    res.json(result);
}
export async function getWebsiteLeads(req, res) {
    const leads = await websiteService.getWebsiteLeads(req.params.id, req.userId);
    res.json({ leads });
}
export async function getAllUserLeads(req, res) {
    const leads = await websiteService.getAllUserLeads(req.userId);
    res.json({ leads });
}
export async function markLeadRead(req, res) {
    const result = await websiteService.markLeadRead(req.params.id, req.params.leadId, req.userId);
    res.json(result);
}
export async function deleteLead(req, res) {
    const result = await websiteService.deleteLead(req.params.id, req.params.leadId, req.userId);
    res.json(result);
}
