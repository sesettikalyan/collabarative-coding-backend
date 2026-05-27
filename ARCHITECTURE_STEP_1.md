# ARCHITECTURE: PHASE 2 STEP 1

## Application Layer Breakdown

```
┌────────────────────────────────────────────────────────────────┐
│                        CLIENT REQUEST                          │
│               (Frontend: localhost:5173)                        │
└────────────────────────┬─────────────────────────────────────┘
                         │ HTTP Request (CORS allowed)
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    NETWORK SECURITY LAYER                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ CORS Middleware (port 5000)                             │  │
│  │ - Allow origin: http://localhost:5173                   │  │
│  │ - Allow methods: GET, POST, PUT, DELETE, PATCH          │  │
│  │ - Allow credentials: true (for WebSocket auth)          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│                         ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Body Parser Middleware                                  │  │
│  │ - Parse JSON (max 10MB)                                 │  │
│  │ - Parse URL-encoded (max 10MB)                          │  │
│  └──────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    LOGGING & MONITORING LAYER                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Request Logger Middleware                               │  │
│  │ - Method, path, status code, duration                   │  │
│  │ - Winston logger (console + file)                       │  │
│  │ Example: GET /api/users - 200 (45ms)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
└────────────────────────────────────────────────────────────────┘
                         │
                    ┌────┴────┐
                    │          │
         ┌──────────▼──┐   ┌───▼──────────┐
         │ /health     │   │ /api/*       │
         │ (hardcoded) │   │ (routes)     │
         └──────────────┘   └───┬──────────┘
                                │
                                ▼
┌────────────────────────────────────────────────────────────────┐
│              APPLICATION LOGIC LAYER (Phase 2 Step 3+)          │
│                                                                 │
│  Module Router                                                  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ /api/auth     → Auth Module (Step 3)                     │  │
│  │ /api/users    → Users Module (Step 3)                    │  │
│  │ /api/rooms    → Rooms Module (Phase 3)                   │  │
│  │ /api/editor   → Editor Module (Phase 4)                  │  │
│  │ /api/execution → Execution Module (Phase 5)              │  │
│  │ /api/chat     → Chat Module (Phase 6)                    │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
│  Each Module Contains:                                          │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │  Controller  │ │   Service    │ │    Model     │            │
│  │              │ │              │ │              │            │
│  │ HTTP Handler │→│ Business     │→│ DB Schema &  │            │
│  │ Validation   │ │ Logic        │ │ Queries      │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    ERROR HANDLING LAYER                         │
│                                                                 │
│  Express Async Error Catcher                                   │
│  ↓ (catches errors from async/await routes)                   │
│                                                                 │
│  Custom Error Hierarchy:                                        │
│  ├── ValidationError (400)                                     │
│  ├── AuthenticationError (401)                                 │
│  ├── AuthorizationError (403)                                 │
│  ├── NotFoundError (404)                                       │
│  ├── ConflictError (409)                                       │
│  ├── RateLimitError (429)                                      │
│  └── InternalServerError (500)                                 │
│                                                                 │
│  ↓ All caught by global error handler                          │
│                                                                 │
│  Response Format (consistent):                                  │
│  {                                                              │
│    "success": false,                                            │
│    "message": "Error message",                                  │
│    "stack": "..." // only in development                       │
│  }                                                              │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌────────────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                       │
│                                                                 │
│  Mongoose + MongoDB                                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ Models (Define schemas)                                 │  │
│  │ - User: { email, username, passwordHash, createdAt }    │  │
│  │ - Room: { roomId, name, code, members, ... }            │  │
│  │ - Message: { roomId, userId, content, createdAt }       │  │
│  │ - Execution: { roomId, code, output, ... }              │  │
│  │ - Chat: { roomId, userId, content, createdAt }          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                         │                                       │
│                         ▼                                       │
│  Connection Pool (max 10 connections)                          │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │ MongoDB Atlas (Free Tier M0)                            │  │
│  │ - 512MB storage                                          │  │
│  │ - 3-node replica set                                     │  │
│  │ - Shared cluster                                         │  │
│  │ - Connection string in env variable                      │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                 │
└────────────────────────────────────────────────────────────────┘
```

---

## Configuration Flow

```
Node.js Process Starts
         │
         ▼
Load .env file (dotenv)
         │
         ▼
Environment Validation (env.ts)
- Check required vars exist
- Fail immediately if missing
         │
         ▼
MongoDB Connection (database.ts)
- Connect using MONGODB_URI
- Setup connection pool
- Fail if can't connect (production) or retry (dev)
         │
         ▼
Express App Initialization (app.ts)
- Setup middleware stack
- Setup routes (from modules)
- Setup error handler
         │
         ▼
Server Startup (server.ts)
- Listen on PORT
- Log startup message
- Setup graceful shutdown handlers
         │
         ▼
Ready to Accept Requests ✅
```

---

## Data Flow: Single Request

```
1. CLIENT REQUEST
   POST /api/auth/login
   Headers: { "Content-Type": "application/json", "Authorization": "Bearer ..." }
   Body: { "email": "user@example.com", "password": "password123" }

         │
         ▼
2. NETWORK LAYER
   ✓ CORS check (origin allowed? → YES)
   ✓ Trust proxy (get real IP)
   ✓ Parse JSON body
   ✓ Log request (GET POST /api/auth/login)

         │
         ▼
3. ROUTING
   app.use('/api/auth', authRoutes)
   → Router looks for POST /login

         │
         ▼
4. AUTH CONTROLLER
   async loginHandler(req, res) {
     const { email, password } = req.body
     const user = await authService.login(email, password)
     res.json({ user, token })
   }

         │
         ▼
5. AUTH SERVICE
   async login(email, password) {
     const user = await User.findOne({ email })
     if (!user) throw new AuthenticationError('Invalid credentials')
     const isValid = await bcrypt.compare(password, user.passwordHash)
     if (!isValid) throw new AuthenticationError('Invalid credentials')
     const token = jwt.sign({ userId: user._id }, JWT_SECRET)
     return { user, token }
   }

         │
         ▼
6. DATABASE LAYER
   User.findOne({ email })
   → MongoDB query via Mongoose
   → Returns user document or null

         │
         ▼
7. RESPONSE
   Success → res.json({ user, token })
   │
   └─ Logs: POST /api/auth/login - 200 (145ms)

   Error → Controller throws error
   │
   ├─ AuthenticationError
   │  └─ Global error handler catches
   │  └─ Logs: 401 Invalid credentials
   │  └─ Returns: { success: false, message: "Invalid credentials" }
```

---

## Environment Isolation

```
Development (.env)                Production (.env in Render/Railway)
─────────────────────────         ──────────────────────────────────
NODE_ENV=development              NODE_ENV=production
PORT=5000                         PORT=5000 (assigned by platform)
MONGODB_URI=local/atlas           MONGODB_URI=production cluster
JWT_SECRET=dev-secret             JWT_SECRET=strong-random-secret
FRONTEND_URL=localhost:5173       FRONTEND_URL=https://app.vercel.com
LOG_LEVEL=debug                   LOG_LEVEL=info

Behavior:
- Dev: Pretty logs, stack traces shown, files logged
- Prod: JSON logs to stdout, no stack traces exposed
```

---

## Graceful Shutdown Flow

```
1. Platform sends SIGTERM
   (Render/Railway restart or server maintenance)

         │
         ▼
2. Server receives SIGTERM signal

         │
         ▼
3. server.ts catches signal:
   
   server.close() → Stop accepting NEW connections
   │
   └─ Existing requests finish (max 30s timeout)
   │
   └─ Disconnect MongoDB
   │
   └─ Exit cleanly (process.exit(0))

         │
         ▼
4. Monitoring
   - Health check endpoint stops responding
   - Platform detects server stopped
   - Starts new instance
```

---

## Security Considerations (Phase 2 Step 1)

✅ Implemented:
- CORS restricted to frontend URL
- Environment variables protected (.gitignored)
- Error details hidden in production
- Graceful shutdown (no data loss)

⏳ Coming in Phase 2 Step 2:
- Rate limiting middleware
- Input validation

⏳ Coming in Phase 2 Step 3:
- JWT token validation
- Password hashing
- Protected route middleware

⏳ Coming in Phase 3:
- Socket.IO authentication
- Room access control

---

## Free-Tier Optimization

```
MongoDB Atlas M0 (512MB):
├─ Users: ~10,000 users
├─ Rooms: ~5,000 rooms
├─ Messages: ~50,000 messages (with TTL)
├─ Executions: ~20,000 executions
└─ Sufficient for MVP with 100+ concurrent users

Express Single Server:
├─ No Redis needed (single instance)
├─ Connection pooling: max 10 connections
├─ In-memory storage: room presence, editor state
└─ Scales to 500+ concurrent users

Winston Logging:
├─ Local file storage (no cloud service)
├─ error.log (persistent)
├─ combined.log (development only)
└─ Free and lightweight
```

---

## Ready for Phase 2 Step 2

✅ Foundation complete
✅ TypeScript type checking enabled
✅ Express middleware stack configured
✅ Database connection ready
✅ Error handling framework established
✅ Logging infrastructure operational
✅ Graceful shutdown handling
✅ Production-grade practices embedded

Next: Add utilities (JWT, password hashing, validation, rate limiting)
