# PHASE 2 STEP 1: BACKEND INITIALIZATION - COMPLETE EXPLANATION

## What We Built

A **production-grade Node.js/Express server** with proper configuration, logging, error handling, and database setup. This is the foundation for all remaining features.

---

## 1. PROJECT INITIALIZATION

### package.json - Why These Choices?

```json
"type": "module"
```
- Uses **ES6 modules** (import/export) instead of CommonJS
- Modern standard, better tree-shaking, cleaner syntax
- Node.js 14+ supports it natively

### Scripts

```json
"dev": "ts-node-dev --respawn src/server.ts"
```
- **ts-node-dev**: TypeScript transpilation + Node server + auto-restart on file changes
- Perfect for development (hot reload)

```json
"build": "tsc"
```
- Compiles TypeScript to JavaScript for production
- Output goes to `dist/` folder

```json
"start": "node dist/server.js"
```
- Runs compiled JavaScript (production mode)
- No TypeScript compiler overhead

### Dependencies Explained

| Package | Purpose | Free-Tier Notes |
|---------|---------|---|
| **express** | Web server framework | No external deps, lightweight |
| **mongoose** | MongoDB ORM with schema validation | Works with free MongoDB Atlas |
| **socket.io** | WebSocket library with fallbacks | No external service needed |
| **jsonwebtoken** | JWT token generation/verification | Stateless auth (scales easily) |
| **bcryptjs** | Password hashing | Pure JS, works everywhere |
| **dotenv** | Load environment variables from .env | Local config, no cloud service |
| **cors** | Cross-Origin Resource Sharing middleware | Frontend-backend communication |
| **winston** | Professional logging library | Free, multiple transports |
| **joi** | Input validation schemas | Prevent bad data at routes |
| **express-async-errors** | Automatically catches async errors | Less boilerplate error handling |
| **axios** | HTTP client | For Judge0 API calls |

**Dev Dependencies**: TypeScript, ts-node-dev, type definitions, ESLint

---

## 2. TYPESCRIPT CONFIGURATION (tsconfig.json)

### Key Settings

```json
"target": "ES2020",
"module": "ESNext"
```
- Compile to modern JavaScript (ES2020)
- Use ES modules (matches our package.json)

```json
"strict": true,
"noImplicitAny": true,
"strictNullChecks": true
```
- **Strict mode enabled**: Catches type errors at compile time
- No `any` types allowed (forces type safety)
- Null safety: must handle `null` and `undefined` explicitly

```json
"outDir": "./dist",
"rootDir": "./src"
```
- TypeScript files in `src/` compile to `dist/`

```json
"declaration": true,
"sourceMap": true
```
- Generate `.d.ts` files (for export to frontend)
- Generate source maps (for debugging compiled code)

---

## 3. ENVIRONMENT CONFIGURATION (src/config/env.ts)

### Why Centralize Environment Variables?

```typescript
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET', 'PORT', 'FRONTEND_URL'];
checkEnvVars(); // Fail immediately if missing
```

**Benefits:**
- **Fail fast**: Missing config detected at startup, not at runtime
- **Single source of truth**: Import from one place
- **Type safety**: `env.jwtSecret` is typed as `string` (compiler checks)
- **Dev/prod differences**: Easy to branch on `isDevelopment`

### Example Usage in Other Files

```typescript
import { env } from './config/env.js';

// Later in code:
app.listen(env.port); // Type-safe: port is number
const secret = env.jwtSecret; // Type-safe: string
```

### Free-Tier Considerations

```typescript
judge0Url: process.env.JUDGE0_API_URL || 'https://judge0-ce.p.rapidapi.com',
judge0ApiKey: process.env.JUDGE0_API_KEY || '',
```

- Optional config (not required at startup)
- Falls back to default Judge0 endpoint
- Optional in development

---

## 4. DATABASE CONNECTION (src/config/database.ts)

### MongoDB Connection Options Explained

```typescript
const connection = await mongoose.connect(env.mongodbUri, {
  maxPoolSize: 10,      // Max 10 simultaneous connections
  minPoolSize: 2,       // Keep 2 connections alive
  socketTimeoutMS: 45000, // Close idle connections after 45s
  serverSelectionTimeoutMS: 5000, // Fail fast if server unreachable
  retryWrites: true,    // Retry failed writes (transaction safety)
});
```

**Why these settings?**
- **Connection pooling**: Reuse connections instead of creating new ones (expensive)
- **maxPoolSize: 10**: Free tier friendly (MongoDB Atlas free tier can handle this)
- **minPoolSize: 2**: Keep some warm connections for faster requests
- **retryWrites**: Important for distributed systems, prevents duplicate writes

### Graceful Shutdown

```typescript
const disconnectDatabase = async () => {
  await mongoose.disconnect();
};
```

- Called when server stops (SIGTERM)
- Ensures all connections properly closed
- No "connection leaked" errors

### Free-Tier Specific

MongoDB Atlas free tier (M0):
- **512MB storage limit**
- **Shared clusters** (shared hardware)
- **3 node replica set** (redundancy)
- **Perfect for**: Development and MVP
- **Scales to**: Thousands of concurrent users with proper indexing

---

## 5. LOGGING (src/utils/logger.ts)

### Why Winston Over console.log()?

```typescript
// ❌ Bad (hard to debug production)
console.log('User logged in');

// ✅ Good (structured, levelable, transportable)
logger.info('User logged in', { userId, email });
```

### Development vs Production Logging

**Development:**
```
2026-05-27 18:30:45 [info]: GET /api/users - 200 (45ms)
```
- Pretty colors, human-readable
- Logged to console + files

**Production:**
```json
{"timestamp":"2026-05-27T18:30:45Z","level":"info","message":"GET /api/users - 200","statusCode":200}
```
- JSON format (parseable by monitoring tools)
- Can be piped to log aggregation service

### Log Levels

```typescript
logger.error('Critical failure')   // Level 0 - Always logged
logger.warn('Deprecated usage')    // Level 1 - Warnings
logger.info('User registered')     // Level 2 - Info
logger.debug('Query executed')     // Level 3 - Debug details
```

In production: Only error/warn
In development: All levels (set via `LOG_LEVEL=debug` in .env)

### Free-Tier Considerations

**Local logging:**
```
src/
  error.log    # Only errors (good for production)
  combined.log # All logs (development only)
```

These files are excluded from git (.gitignore), stored locally.

---

## 6. ERROR HANDLING (src/utils/errors.ts)

### Problem This Solves

```typescript
// ❌ Without custom errors (inconsistent)
res.status(400).json({ error: 'Bad input' });
res.status(400).json({ message: 'Invalid data' });
res.status(404).send('Not found');

// ✅ With custom errors (consistent)
throw new ValidationError('Bad input');
throw new NotFoundError('User');
```

### Error Class Hierarchy

```
AppError (base - all errors)
├── ValidationError (400)
├── AuthenticationError (401)
├── AuthorizationError (403)
├── NotFoundError (404)
├── ConflictError (409)
├── RateLimitError (429)
└── InternalServerError (500)
```

### Auto-Catching Async Errors

```typescript
import 'express-async-errors';

// Without this package:
app.get('/user', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    res.json(user);
  } catch (err) {
    next(err); // Manual
  }
});

// With express-async-errors:
app.get('/user', async (req, res) => {
  const user = await User.findById(req.params.id); // Auto-caught
  res.json(user);
});
```

---

## 7. EXPRESS APP SETUP (src/app.ts)

### Middleware Order (CRITICAL)

Middleware runs top-to-bottom. Order matters!

```typescript
// 1. Trust proxy (before any IP/protocol checks)
app.set('trust proxy', 1);

// 2. CORS (security - filter requests early)
app.use(cors(...));

// 3. Body parsing (needed before routes)
app.use(express.json());

// 4. Logging (before routes to see all requests)
app.use((req, res, next) => { /* log */ });

// 5. Routes (application logic)
app.use('/api/auth', authRoutes);

// 6. 404 handler (after routes)
app.use((req, res) => { /* 404 */ });

// 7. Error handler (LAST - catches everything)
app.use((err, req, res, next) => { /* handle error */ });
```

### CORS Explained

```typescript
cors({
  origin: env.frontendUrl,  // Only allow requests from frontend
  credentials: true,        // Allow cookies for WebSocket auth
  methods: ['GET', 'POST'], // Allowed HTTP methods
  allowedHeaders: ['Content-Type', 'Authorization'],
})
```

**Why needed?**
- Frontend on `localhost:5173` ≠ Backend on `localhost:5000`
- Browsers block cross-origin requests by default
- CORS tells browser it's OK

### Trust Proxy Setting

```typescript
app.set('trust proxy', 1);
```

**Why?**
- In production (Render/Railway), requests come through a reverse proxy
- `req.ip` and `req.protocol` would be proxy's IP/protocol without this
- The `1` means trust the first proxy in the chain

### Health Check Endpoint

```typescript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK' });
});
```

**Why?**
- Cloud platforms (Render, Railway) use `/health` to check if server is alive
- If health check fails, they restart the server
- Essential for uptime

### Centralized Error Handler

```typescript
app.use((err, req, res, next) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message });
  }
  return res.status(500).json({ message: 'Internal server error' });
});
```

**Benefits:**
- Consistent error response format
- Don't expose internal details (stack traces) in production
- Log all errors for debugging
- Handle both expected and unexpected errors

---

## 8. SERVER ENTRY POINT (src/server.ts)

### Why Separate app.ts from server.ts?

```
app.ts   → Express configuration (reusable, testable)
server.ts → Server startup/shutdown (specific to this instance)
```

Benefits:
- Can test app logic without starting server
- Can export app to other tools (testing framework)
- Clear separation of concerns

### Startup Sequence

```typescript
const startServer = async () => {
  // 1. Connect DB (fail if can't connect)
  await connectDatabase();
  
  // 2. Start server
  const server = app.listen(env.port);
  
  // 3. Setup graceful shutdown
  process.on('SIGTERM', shutdown);
};
```

### Graceful Shutdown (Production-Grade)

When server receives **SIGTERM** (signal to terminate):

```typescript
server.close(async () => {
  // Stop accepting NEW connections
  // Wait for existing requests to finish
  await disconnectDatabase();
  process.exit(0); // Clean exit
});

// But if shutdown takes >30 seconds, force exit
setTimeout(() => process.exit(1), 30000);
```

**Why important?**
- Render/Railway send SIGTERM before restart
- Without graceful shutdown:
  - In-flight requests get killed (bad UX)
  - Database connections left open (resource leak)
  - Data corruption possible

**In Render/Railway:**
- Server has ~30 seconds to shut down
- This code respects that window

### Error Boundaries

```typescript
process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  process.exit(1); // Fail fast
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  process.exit(1); // Fail fast
});
```

Catches errors that somehow escaped all try-catch blocks. Should never happen with proper error handling, but safety net.

---

## 9. DEVELOPMENT WORKFLOW

### Hot Reload During Development

```bash
npm run dev
```

- Runs `ts-node-dev --respawn`
- Watches file changes
- Auto-restarts server
- ~500ms to restart (very fast)
- Keep this running in a terminal while developing

### Compilation Check

```bash
npm run build
```

- Compiles TypeScript to JavaScript
- TypeScript compiler checks types
- Output in `dist/` folder
- Run before pushing to production

### Environment Files

```
.env          ← Actual config (git-ignored)
.env.example  ← Template (git-tracked)
```

**Setup workflow:**
```bash
cp .env.example .env
# Edit .env with your values
```

---

## 10. FREE-TIER ARCHITECTURE DECISIONS

### Why No Redis Yet?

- **Socket.IO works without Redis** (for single server)
- Redis needed only for:
  - Multiple server instances (horizontal scaling)
  - Shared session/cache across servers
- **Delay to Phase 7** when we know if we need scaling

### Why Not Cloud Storage?

- Local file logging (error.log, combined.log)
- These files are for development
- Production uses environment-based logging

### MongoDB Atlas Free Tier

**Limits:**
- 512MB storage
- 3-member replica set (built-in redundancy)
- Shared cloud cluster

**Sufficient for:**
- Development and testing
- MVP with 10k+ messages
- Up to 100+ concurrent users

**When to upgrade:**
- Hit 512MB storage limit
- Need better performance (dedicated cluster)
- Production needs guaranteed uptime SLA

---

## SUMMARY OF WHAT WE HAVE

✅ **Node.js/Express server ready to start**
✅ **TypeScript type checking enabled**
✅ **Modular folder structure created**
✅ **Database connection configured**
✅ **Professional logging setup**
✅ **Error handling framework**
✅ **CORS for frontend integration**
✅ **Graceful shutdown handling**
✅ **Free-tier services configured**
✅ **Production-grade practices embedded**

---

## NEXT: PHASE 2 STEP 2

Step 2 will add:
- Rate limiting middleware
- Request validation
- JWT token utilities
- Hash password utilities

Then Step 3 implements the Auth module with real endpoints.

**Status**: ✅ Step 1 Complete - Ready for Step 2
