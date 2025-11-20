import { Router, Request, Response } from 'express';
import { CacheManager } from '../config/cache';
import { UserService } from '../services/userService';
import { RequestQueue } from '../queue/requestQueue';

const router = Router();
const userService = new UserService();
const requestQueue = new RequestQueue(userService);

export const createUserRoutes = (cache: CacheManager) => {
  // GET /users - List all users (for admin/testing)
  router.get('/', async (req: Request, res: Response) => {
    try {
      const users = await userService.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch users',
      });
    }
  });

  // GET /users/:id
  router.get('/:id', async (req: Request, res: Response) => {
    const startTime = Date.now();
    const userId = parseInt(req.params.id, 10);

    if (isNaN(userId)) {
      return res.status(400).json({
        error: 'Invalid user ID',
        message: 'User ID must be a valid number',
      });
    }

    const cacheKey = `user:${userId}`;

    // Check cache first
    const cachedUser = cache.get(cacheKey);
    if (cachedUser) {
      const responseTime = Date.now() - startTime;
      cache.recordResponseTime(responseTime);
      return res.json(cachedUser);
    }

    // Check if already cached (to avoid duplicate requests)
    if (cache.has(cacheKey)) {
      // Wait a bit and check again (concurrent request handling)
      await new Promise((resolve) => setTimeout(resolve, 50));
      const retryCached = cache.get(cacheKey);
      if (retryCached) {
        const responseTime = Date.now() - startTime;
        cache.recordResponseTime(responseTime);
        return res.json(retryCached);
      }
    }

    try {
      // Use queue for async processing
      const user = await requestQueue.enqueue(userId);

      if (!user) {
        return res.status(404).json({
          error: 'User not found',
          message: `User with ID ${userId} does not exist`,
        });
      }

      // Cache the result
      cache.set(cacheKey, user);

      const responseTime = Date.now() - startTime;
      cache.recordResponseTime(responseTime);

      // Return user without password
      res.json(userService.getUserResponse(user));
    } catch (error) {
      const responseTime = Date.now() - startTime;
      cache.recordResponseTime(responseTime);

      res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch user data',
      });
    }
  });

  // POST /users - Create user (legacy endpoint, use /auth/register instead)
  router.post('/', async (req: Request, res: Response) => {
    const { name, email, password } = req.body;

    if (!name || !email) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Name and email are required',
      });
    }

    // If password provided, use auth service
    if (password) {
      try {
        const user = await userService.createUser({ name, email, password });
        const cacheKey = `user:${user.id}`;
        cache.set(cacheKey, user);
        res.status(201).json(userService.getUserResponse(user));
      } catch (error) {
        if (error instanceof Error && error.message === 'Email already exists') {
          return res.status(409).json({
            error: 'Conflict',
            message: 'Email already registered',
          });
        }
        res.status(500).json({
          error: 'Internal server error',
          message: 'Failed to create user',
        });
      }
    } else {
      // Legacy: create without password (for testing)
      const user = await userService.createUser({
        name,
        email,
        password: 'default123',
      });
      const cacheKey = `user:${user.id}`;
      cache.set(cacheKey, user);
      res.status(201).json(userService.getUserResponse(user));
    }
  });

  return router;
};

