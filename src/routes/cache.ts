import { Router, Request, Response } from 'express';
import { CacheManager } from '../config/cache';

export const createCacheRoutes = (cache: CacheManager) => {
  const router = Router();

  // DELETE /cache
  router.delete('/', (req: Request, res: Response) => {
    cache.clear();
    res.json({
      message: 'Cache cleared successfully',
    });
  });

  // GET /cache-status
  router.get('/status', (req: Request, res: Response) => {
    const stats = cache.getStats();
    res.json(stats);
  });

  return router;
};

