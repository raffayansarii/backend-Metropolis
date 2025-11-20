# Backend Testing Guide

## 🎯 Purpose of the Backend

The backend is a **high-performance Express.js API** that demonstrates advanced server-side features:

### Main Purpose:
1. **Serve User Data** - Provides user information via REST API
2. **Performance Optimization** - Uses caching to reduce database load
3. **Protection** - Rate limiting prevents API abuse
4. **Scalability** - Async processing handles concurrent requests efficiently

### Key Features Implemented:

#### 1. **Advanced Caching System**
- **LRU (Least Recently Used) Cache** - Stores frequently accessed data
- **60-second TTL** - Data expires after 60 seconds
- **Automatic cleanup** - Removes stale entries every 30 seconds
- **Statistics tracking** - Monitors cache performance

**Why it matters:** 
- First request: ~200ms (fetches from "database")
- Cached requests: <1ms (instant response)
- Reduces server load by 99% for repeated requests

#### 2. **Rate Limiting**
- **10 requests per minute** per IP address
- **5 requests per 10 seconds** (burst protection)
- Returns 429 status when exceeded

**Why it matters:**
- Prevents API abuse and DDoS attacks
- Ensures fair usage for all clients
- Protects server resources

#### 3. **Asynchronous Processing**
- **Request Queue** - Manages database operations
- **Concurrent request deduplication** - Multiple requests for same user share one database call
- **Non-blocking** - Server stays responsive

**Why it matters:**
- Handles high traffic efficiently
- Prevents duplicate database queries
- Better resource utilization

#### 4. **Cache Management**
- View cache statistics
- Manually clear cache
- Monitor performance metrics

---

## 🧪 How to Test the Backend

### Prerequisites

1. **Backend server must be running:**
   ```bash
   cd backend
   pnpm dev
   ```

2. **You can test using:**
   - Terminal (curl commands)
   - Postman
   - Browser (for GET requests)
   - Any HTTP client

---

## 📋 Test Scenarios

### Test 1: Basic User Retrieval (Cache Miss)

**Purpose:** Test the basic GET endpoint and see the 200ms database simulation delay.

```bash
curl http://localhost:3001/users/1
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**What to observe:**
- Takes approximately 200ms (simulated database delay)
- This is a **cache miss** (first time fetching this user)

---

### Test 2: Cached User Retrieval (Cache Hit)

**Purpose:** See the caching system in action - instant response!

```bash
curl http://localhost:3001/users/1
```

**Expected Response:**
```json
{
  "id": 1,
  "name": "John Doe",
  "email": "john@example.com"
}
```

**What to observe:**
- **Instant response** (<1ms) - data comes from cache
- This is a **cache hit** (data was already fetched)

**Performance difference:**
- First request: ~200ms
- Cached request: <1ms
- **200x faster!** 🚀

---

### Test 3: Check Cache Statistics

**Purpose:** See how the cache is performing.

```bash
curl http://localhost:3001/cache/status
```

**Expected Response:**
```json
{
  "hits": 1,
  "misses": 1,
  "size": 1,
  "averageResponseTime": 150.5
}
```

**What it means:**
- **hits**: Number of requests served from cache
- **misses**: Number of requests that needed database fetch
- **size**: Number of items currently in cache
- **averageResponseTime**: Average time to serve requests (ms)

**Try this:**
1. Make 5 requests to `/users/1`
2. Check cache status
3. You should see `hits: 4, misses: 1` (first was miss, rest were hits)

---

### Test 4: Non-Existent User (404 Error)

**Purpose:** Test error handling for invalid user IDs.

```bash
curl http://localhost:3001/users/999
```

**Expected Response:**
```json
{
  "error": "User not found",
  "message": "User with ID 999 does not exist"
}
```

**Status Code:** 404 Not Found

**What to observe:**
- Proper error message
- Correct HTTP status code
- No crash or server error

---

### Test 5: Create New User

**Purpose:** Test the POST endpoint to create users.

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Alice Brown","email":"alice@example.com"}'
```

**Expected Response:**
```json
{
  "id": 4,
  "name": "Alice Brown",
  "email": "alice@example.com"
}
```

**Status Code:** 201 Created

**What to observe:**
- New user is created with auto-incremented ID
- User is automatically cached
- Can immediately retrieve it with GET request

**Verify it's cached:**
```bash
curl http://localhost:3001/users/4
# Should be instant (from cache)
```

---

### Test 6: Rate Limiting (10 requests/minute)

**Purpose:** Test the rate limiting feature.

**Make 11 requests quickly:**
```bash
for i in {1..11}; do 
  echo "Request $i:"
  curl http://localhost:3001/users/1
  echo ""
done
```

**Expected Behavior:**
- First 10 requests: ✅ Success (200 status)
- 11th request: ❌ **429 Too Many Requests**

**11th Request Response:**
```json
{
  "error": "Rate limit exceeded",
  "message": "Maximum requests per minute exceeded. Please try again later.",
  "retryAfter": 45
}
```

**What to observe:**
- Rate limit is enforced
- Clear error message
- `retryAfter` tells you when to try again (in seconds)

---

### Test 7: Burst Rate Limiting (5 requests/10 seconds)

**Purpose:** Test the burst protection.

**Make 6 requests very quickly (within 10 seconds):**
```bash
for i in {1..6}; do 
  curl http://localhost:3001/users/1 &
done
wait
```

**Expected Behavior:**
- First 5 requests: ✅ Success
- 6th request: ❌ **429 Too Many Requests** (burst limit)

**What to observe:**
- Burst protection prevents rapid-fire requests
- Different from the 10/minute limit (this is 5/10 seconds)

---

### Test 8: Concurrent Request Handling

**Purpose:** Test that multiple simultaneous requests for the same user share one database call.

**Make 5 concurrent requests for the same user:**
```bash
# Clear cache first
curl -X DELETE http://localhost:3001/cache

# Make 5 concurrent requests
for i in {1..5}; do 
  curl http://localhost:3001/users/2 &
done
wait
```

**Expected Behavior:**
- All 5 requests complete successfully
- Only **one** database call is made (shared by all requests)
- All requests get the same data
- Subsequent requests use the cached result

**What to observe:**
- Efficient handling of concurrent requests
- No duplicate database queries
- All requests return the same data

---

### Test 9: Cache Expiration (60 seconds)

**Purpose:** Test that cache entries expire after 60 seconds.

```bash
# Get user (cache miss)
curl http://localhost:3001/users/1

# Get same user immediately (cache hit - instant)
curl http://localhost:3001/users/1

# Wait 61 seconds, then get again
# (You'll need to wait manually)
sleep 61
curl http://localhost:3001/users/1
```

**Expected Behavior:**
- First request: ~200ms (cache miss)
- Second request: <1ms (cache hit)
- After 61 seconds: ~200ms again (cache expired, new fetch)

**What to observe:**
- Cache TTL (Time To Live) is working
- Stale data is automatically refreshed

---

### Test 10: Clear Cache Manually

**Purpose:** Test the cache management endpoint.

```bash
# Check cache status (should have some entries)
curl http://localhost:3001/cache/status

# Clear the cache
curl -X DELETE http://localhost:3001/cache

# Check cache status again (should be empty)
curl http://localhost:3001/cache/status
```

**Expected Response (after clear):**
```json
{
  "hits": 0,
  "misses": 0,
  "size": 0,
  "averageResponseTime": 0
}
```

**What to observe:**
- Cache is completely cleared
- Statistics are reset
- Next request will be a cache miss

---

### Test 11: Invalid User ID Format

**Purpose:** Test input validation.

```bash
curl http://localhost:3001/users/abc
```

**Expected Response:**
```json
{
  "error": "Invalid user ID",
  "message": "User ID must be a valid number"
}
```

**Status Code:** 400 Bad Request

**What to observe:**
- Proper validation
- Clear error message
- No server crash

---

### Test 12: Create User with Missing Fields

**Purpose:** Test POST endpoint validation.

```bash
curl -X POST http://localhost:3001/users \
  -H "Content-Type: application/json" \
  -d '{"name":"Test User"}'
```

**Expected Response:**
```json
{
  "error": "Validation error",
  "message": "Name and email are required"
}
```

**Status Code:** 400 Bad Request

---

## 📊 Performance Testing

### Measure Cache Performance

```bash
# Time the first request (cache miss)
time curl http://localhost:3001/users/1

# Time a cached request (cache hit)
time curl http://localhost:3001/users/1
```

**Expected Results:**
- First request: ~200ms
- Cached request: <10ms
- **20x+ speed improvement!**

### Load Testing (Multiple Users)

```bash
# Request different users to fill cache
for i in {1..3}; do
  curl http://localhost:3001/users/$i
done

# Check cache size
curl http://localhost:3001/cache/status
# Should show size: 3
```

---

## 🎯 Real-World Use Cases

### Use Case 1: High-Traffic API
**Scenario:** 1000 users requesting the same user data
- **Without cache:** 1000 × 200ms = 200 seconds total
- **With cache:** 1 × 200ms + 999 × 1ms = 1.2 seconds total
- **Result:** 166x faster! 🚀

### Use Case 2: API Protection
**Scenario:** Malicious user trying to overload server
- **Without rate limiting:** Server crashes
- **With rate limiting:** Requests throttled, server stays up
- **Result:** Service remains available for legitimate users

### Use Case 3: Concurrent Requests
**Scenario:** 50 users request same data simultaneously
- **Without queue:** 50 database queries
- **With queue:** 1 database query, shared result
- **Result:** 50x less database load

---

## 🔍 Monitoring & Debugging

### Check Server Health

```bash
curl http://localhost:3001/health
```

**Expected Response:**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### View Cache Performance Over Time

1. Make several requests
2. Check cache status after each batch
3. Observe how hits/misses ratio improves

```bash
# Initial state
curl http://localhost:3001/cache/status

# Make 10 requests
for i in {1..10}; do curl http://localhost:3001/users/1; done

# Check improved stats
curl http://localhost:3001/cache/status
# Should show: hits: 9, misses: 1
```

---

## 📝 Testing Checklist

- [ ] Basic GET request works
- [ ] Cache miss (first request) takes ~200ms
- [ ] Cache hit (cached request) is instant
- [ ] Cache statistics are accurate
- [ ] 404 error for non-existent user
- [ ] POST creates new user
- [ ] Rate limiting works (10/min)
- [ ] Burst limiting works (5/10s)
- [ ] Concurrent requests handled efficiently
- [ ] Cache expires after 60 seconds
- [ ] Cache can be cleared manually
- [ ] Input validation works
- [ ] Health check endpoint works

---

## 🛠️ Using Postman (GUI Alternative)

If you prefer a GUI tool:

1. **Import Collection:**
   - Create new request: `GET http://localhost:3001/users/1`
   - Create new request: `GET http://localhost:3001/cache/status`
   - Create new request: `POST http://localhost:3001/users`
   - Create new request: `DELETE http://localhost:3001/cache`

2. **Test Rate Limiting:**
   - Use Postman's "Runner" feature
   - Run the same request 11 times quickly
   - Observe 429 error on 11th request

---

## 💡 Key Takeaways

1. **Caching** dramatically improves performance
2. **Rate limiting** protects your API from abuse
3. **Async processing** handles high traffic efficiently
4. **Monitoring** helps you understand API performance
5. **Error handling** provides good user experience

The backend demonstrates **production-ready** patterns used in real-world applications!

