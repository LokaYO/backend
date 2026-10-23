import * as adminService from '../services/admin.service.js';
export async function getMonitoringUsers(_req, res) {
    const users = await adminService.getAllUsersForMonitoring();
    res.json({ users });
}
export async function getUserDetails(req, res) {
    const data = await adminService.getUserDetailsWithWebsites(req.params.userId);
    res.json(data);
}
export async function updateUserRole(req, res) {
    const { role } = req.body;
    const result = await adminService.updateUserRole(req.params.userId, role);
    res.json(result);
}
export async function deleteUser(req, res) {
    const result = await adminService.deleteUser(req.params.userId);
    res.json(result);
}
export async function getStats(_req, res) {
    const stats = await adminService.getPlatformStats();
    res.json({ stats });
}
