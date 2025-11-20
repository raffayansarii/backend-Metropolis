import express, { Express } from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import { CacheManager } from './config/cache';
import { createUserRoutes } from './routes/users';
import { createCacheRoutes } from './routes/cache';
import { rateLimiter, cleanupRateLimitStore } from './middleware/rateLimiter';
import authRoutes from './routes/auth';

const app: Express = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Initialize cache
const cache = new CacheManager();

// Background task to clean stale cache entries
setInterval(() => {
  cache.cleanStaleEntries();
}, 30000); // Run every 30 seconds

// Background task to clean rate limit store
setInterval(() => {
  cleanupRateLimitStore();
}, 60000); // Run every minute

// Apply rate limiting to all routes
app.use(rateLimiter);

// Routes
app.use('/auth', rateLimiter, authRoutes); // Auth routes with rate limiting
app.use('/users', createUserRoutes(cache));
app.use('/cache', createCacheRoutes(cache));

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error('Error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: err.message,
    });
  }
);

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});

