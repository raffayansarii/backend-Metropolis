# Backend API - Interactive Event

Express.js API with advanced caching, rate limiting, and asynchronous processing.

## Setup

```bash
pnpm install
```

## Running

```bash
# Development
pnpm dev

# Production
pnpm build
pnpm start
```

## Environment Variables

Create a `.env` file:

```
PORT=3001
NODE_ENV=development
```

## API Endpoints

### Users

- `GET /users/:id` - Get user by ID (cached)
- `POST /users` - Create new user

### Cache Management

- `GET /cache/status` - Get cache statistics
- `DELETE /cache` - Clear entire cache

### Health

- `GET /health` - Health check

## Features

### Caching Strategy
- **LRU Cache** with 60-second TTL
- Automatic stale entry cleanup (every 30s)
- Cache hit/miss statistics
- Average response time tracking

### Rate Limiting
- **10 requests per minute** per IP
- **5 requests per 10 seconds** (burst limit)
- Returns 429 status with retry-after header

### Asynchronous Processing
- Request queue for database operations
- Concurrent request deduplication
- Non-blocking API responses

### Concurrent Request Handling
When multiple requests arrive for the same user ID:
1. First request fetches from "database"
2. Subsequent requests wait and share the result
3. All requests receive cached data after first fetch

## Testing

Test with Postman or curl:

```bash
# First request (cache miss, ~200ms delay)
curl http://localhost:3001/users/1

# Second request (cache hit, instant)
curl http://localhost:3001/users/1

# Rate limit test (make 11 requests quickly)
for i in {1..11}; do curl http://localhost:3001/users/1; done
```

## Architecture

- **Routes**: Handle HTTP requests
- **Services**: Business logic (UserService)
- **Cache**: LRU cache manager
- **Queue**: Async request processing
- **Middleware**: Rate limiting

