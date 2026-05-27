# Collaborative Coding Platform - Backend

Production-grade Node.js/Express backend for real-time collaborative coding.

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js
- **Database**: MongoDB + Mongoose
- **Real-Time**: Socket.IO
- **Authentication**: JWT + bcryptjs
- **Logging**: Winston
- **Validation**: Joi

## Project Structure

```
src/
├── modules/          # Feature modules
│   ├── auth/        # Authentication
│   ├── users/       # User management
│   ├── rooms/       # Room management
│   ├── editor/      # Code persistence
│   ├── execution/   # Code execution
│   └── chat/        # Chat system
├── socket/          # WebSocket handlers
├── middleware/      # Express middleware
├── config/          # Configuration
├── utils/           # Utilities (logger, errors)
├── types/           # Shared TypeScript types
├── app.ts           # Express app setup
└── server.ts        # Server entry point
```

## Getting Started

### 1. Setup Environment

```bash
# Copy example to actual .env file
cp .env.example .env

# Edit .env with your values
```

**Required .env variables:**
- `MONGODB_URI` - MongoDB Atlas free tier connection string
- `JWT_SECRET` - Secret key for JWT tokens (use a strong random string)
- `PORT` - Server port (default: 5000)
- `FRONTEND_URL` - Frontend URL for CORS (http://localhost:5173 for dev)

### 2. MongoDB Atlas Setup (FREE)

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create free account
3. Create a free M0 cluster
4. Get connection string: "Connect" → "Drivers" → Copy connection string
5. Replace `<password>` with your password
6. Paste into `.env` as `MONGODB_URI`

### 3. Install & Run

```bash
# Install dependencies
npm install

# Development (hot reload with file changes)
npm run dev

# Production build
npm run build

# Run built code
npm start
```

### 4. Verify Server is Running

```bash
# Check health endpoint
curl http://localhost:5000/health
```

Expected response:
```json
{
  "status": "OK",
  "timestamp": "2026-05-27T18:00:00.000Z"
}
```

## Architecture Decisions

### Why Modular Monolith?

- **Single deployable unit** - Simpler DevOps, no service discovery
- **Module isolation** - Clear boundaries via folder structure
- **Easy to reason about** - All code in one place
- **Evolution path** - Can split modules into microservices later

### Why These Tools?

| Tool | Why |
|------|-----|
| **Express** | Lightweight, flexible, industry standard |
| **TypeScript** | Type safety, catch errors at compile time |
| **MongoDB + Mongoose** | Document model fits collaborative data |
| **Socket.IO** | Auto-reconnect, fallbacks, broadcasting |
| **Winston** | Structured logging, multiple transports |
| **JWT** | Stateless auth, scales across servers |

### Error Handling Strategy

All errors inherit from `AppError` base class. Express automatically catches async errors via `express-async-errors`.

**Error types:**
- `ValidationError` (400)
- `AuthenticationError` (401)
- `AuthorizationError` (403)
- `NotFoundError` (404)
- `ConflictError` (409)
- `RateLimitError` (429)
- `InternalServerError` (500)

### Graceful Shutdown

When server receives SIGTERM/SIGINT:
1. Stop accepting new connections
2. Wait for existing requests to complete (30s timeout)
3. Close database connection
4. Exit safely

Important for cloud platforms (Render, Railway) that send SIGTERM before restart.

## Database Schema

See [Phase 1 Architecture](../../ARCHITECTURE.md) for full schema documentation.

Key collections:
- `users` - User accounts
- `rooms` - Collaboration rooms
- `messages` - Chat messages
- `executions` - Code execution history

## Free-Tier Considerations

### MongoDB Atlas Free Tier
- **Limit**: 512MB storage
- **Good for**: Development and early MVP
- **Upgrade when**: You exceed 512MB (easily handle 10k+ messages)

### Judge0 Free API
- **Limit**: 50 requests/day
- **Good for**: Development testing
- **Upgrade when**: Building production code execution features

### Render/Railway Free Tier
- **Limit**: 750 hours/month (roughly $5-7/month value)
- **Good for**: Always-on backend
- **Downgrade when**: Project inactive, free tier sleeps after 15min

## Next Steps

- Phase 2 Step 2: Logging, middleware, error handling
- Phase 2 Step 3: Authentication module (User model, JWT, login/register)
- Phase 2 Step 4: Postman testing

## Development Tips

1. **Hot Reload**: Run `npm run dev` - changes automatically reload
2. **Check Logs**: Winston logs to console + files (error.log, combined.log)
3. **Database**: Use MongoDB Atlas UI to view data
4. **TypeScript**: Compile errors show in terminal immediately

## Troubleshooting

**Error: "Missing required environment variables"**
- Solution: Create `.env` file with required variables

**Error: "connect ECONNREFUSED 127.0.0.1:27017"**
- Solution: Check MONGODB_URI is correct, cluster is running

**Port already in use**
- Solution: Change PORT in .env or kill process on that port

---

**Built with production-grade practices for educational excellence.**
