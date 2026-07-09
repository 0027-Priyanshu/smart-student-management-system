import { Request, Response, NextFunction } from 'express';
import { RepoService } from '../services/repo.service';

export class LogController {
  static async getLogs(req: Request, res: Response, next: NextFunction) {
    try {
      const logs = await RepoService.findLogs(150); // Fetch last 150 entries
      return res.json({ logs });
    } catch (error) {
      next(error);
    }
  }
}
