"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LogController = void 0;
const repo_service_1 = require("../services/repo.service");
class LogController {
    static async getLogs(req, res, next) {
        try {
            const logs = await repo_service_1.RepoService.findLogs(150); // Fetch last 150 entries
            return res.json({ logs });
        }
        catch (error) {
            next(error);
        }
    }
}
exports.LogController = LogController;
