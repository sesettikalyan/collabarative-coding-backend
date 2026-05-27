# PHASE 2 STEP 2: MIDDLEWARE & UTILITIES - COMPLETE EXPLANATION

## What We Built

Six production-grade utility and middleware modules that form the security and validation foundation for authentication:

### 1. JWT Token Utility (`src/utils/jwt.ts`)
- **Generate tokens** for login/register
- **Verify tokens** on protected routes
- **Extract tokens** from Authorization header
- **Decode tokens** for debugging

### 2. Password Hashing (`src/utils/hash.ts`)
- **Hash passwords** before storing in DB
- **Compare passwords** during login
- **Verify hash format** for validation

### 3. Validation Schemas (`src/utils/validators.ts`)
- **Joi schemas** for all data types
- **Reusable validation rules**
- **Auth, rooms, chat, execution schemas**

### 4. Rate Limiting (`src/middleware/rateLimit.middleware.ts`)
- **Prevent brute force attacks** (login attempts)
- **Prevent API spam** (excessive requests)
- **In-memory storage** (lightweight, free-tier friendly)

### 5. Validation Middleware (`src/middleware/validation.middleware.ts`)
- **Validate request body, query, params**
- **Standardized error responses**
- **Integrates with Joi schemas**

### 6. JWT Auth Middleware (`src/middleware/auth.middleware.ts`)
- **Verify JWT on protected routes**
- **Attach user to request**
- **Optional vs required auth**

---

## DETAILED EXPLANATIONS

### 1. JWT TOKEN UTILITY

**What is JWT?**
```
JWT = JSON Web Token

Structure: header.payload.signature
Example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI2MjMifQ.XXXX

Part 1 (header): { alg: "HS256", typ: "JWT" }
Part 2 (payload): { userId: "623", email: "user@ex.com", iat: 1234, exp: 5678 }
Part 3 (signature): HMAC-SHA256(part1.part2, secret)
```

**Why JWT?**
1. **Stateless**: No need for session table in DB
2. **Scalable**: Works across multiple servers
3. **Self-contained**: Token has everything (user ID, email, expiry)
4. **Signed**: Can't be tampered with (signature won't match)

**How it works:**
```
User logs in
    ↓
Server generates token with JWT_SECRET
    ↓
Send token to frontend
    ↓
Frontend stores token (localStorage, cookie)
    ↓
Future requests: Frontend sends "Authorization: Bearer <token>"
    ↓
Backend verifies signature with JWT_SECRET
    ↓
If signature valid → token not tampered
If signature invalid → reject request (401 Unauthorized)
```

**Code Walkthrough:**

```typescript
export const generateToken = (payload: TokenPayload): string => {
  const token = jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpire,  // e.g., "7d" = 7 days
  });
  return token;
};
```

Why `expiresIn`?
- Token should eventually expire (security)
- Example: If token stolen, it's only valid for 7 days
- After 7 days, user must login again

```typescript
export const verifyToken = (token: string): TokenPayload => {
  const decoded = jwt.verify(token, env.jwtSecret) as TokenPayload;
  return decoded;
};
```

What does `jwt.verify` do?
1. Extract signature from token
2. Compute HMAC-SHA256(header.payload, JWT_SECRET)
3. Compare computed signature with extracted signature
4. If they match → payload is genuine
5. If they don't match → token was tampered with → throw error

**Practical Example:**

Login flow:
```
User sends: { email: "user@ex.com", password: "pass123" }
  ↓
Server verifies password
  ↓
generateToken({ userId: "623" })  // Create token
  ↓
Return token to frontend
  ↓
Frontend stores token

Later, accessing protected route:
Frontend sends header: Authorization: Bearer <token>
  ↓
extractTokenFromHeader() → gets token
  ↓
verifyToken(token) → verify signature is valid
  ↓
If valid → req.user = { userId: "623" }
If invalid → throw AuthenticationError
```

---

### 2. PASSWORD HASHING

**Why not store passwords as plain text?**
```
❌ BAD:
Database: { email: "user@ex.com", password: "myPassword123" }
If database breached → attacker has all passwords

✅ GOOD:
Database: { email: "user@ex.com", passwordHash: "$2b$10$..." }
If database breached → passwords are still safe
```

**How bcrypt works:**

```
bcrypt(password, salt) → hash

Example:
Password: "myPassword123"
Salt: random 16-byte string
Hash: "$2b$10$randomsalt$hashvalue" (60 characters)

Every time you hash same password with different salt:
Different salt → Different hash (but both correct!)

When verifying:
bcrypt.compare("myPassword123", "$2b$10$...") 
  ↓
Extract salt from hash
  ↓
Bcrypt again with same salt
  ↓
Compare hashes
  ↓
Match → Correct password
```

**Code Walkthrough:**

```typescript
export const hashPassword = async (plainPassword: string): Promise<string> => {
  const hash = await bcrypt.hash(plainPassword, SALT_ROUNDS);
  return hash;
};
```

What does `SALT_ROUNDS = 10` mean?
- 10 = 2^10 = 1024 iterations
- Higher = more secure but slower
- 10 is industry standard (balances security + speed)

```typescript
export const comparePassword = async (
  plainPassword: string,
  passwordHash: string
): Promise<boolean> => {
  const isMatch = await bcrypt.compare(plainPassword, passwordHash);
  return isMatch;
};
```

Why async?
- Bcrypt uses worker threads (doesn't block main thread)
- Important for production performance

**Login Flow:**

```
User sends plaintext password: "myPassword123"
  ↓
Get stored hash from DB: "$2b$10$..."
  ↓
bcrypt.compare("myPassword123", "$2b$10$...")
  ↓
Extract salt from hash
  ↓
Hash plaintext with same salt
  ↓
Compare: does new hash match stored hash?
  ↓
YES → Correct password, login successful
NO → Wrong password, deny access
```

---

### 3. VALIDATION SCHEMAS (JOI)

**Why Joi instead of manual validation?**

```typescript
// ❌ Manual (repetitive, error-prone)
if (!email || !email.includes('@')) {
  throw new Error('Invalid email');
}
if (!password || password.length < 6) {
  throw new Error('Password too short');
}
if (password !== confirmPassword) {
  throw new Error('Passwords do not match');
}

// ✅ Joi (declarative, reusable, consistent)
const schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
});

const { error, value } = schema.validate(data);
```

**Key Schemas Created:**

```typescript
// Registration
registerSchema validates:
- email: valid email format
- username: alphanumeric, 3-30 characters
- password: min 6 chars, has uppercase, has numbers
- confirmPassword: matches password

// Login
loginSchema validates:
- email: valid email format
- password: min 6 characters

// Create Room
createRoomSchema validates:
- name: 1-100 characters
- description: optional, max 500 chars
- isPublic: boolean
- language: one of ['javascript', 'python', 'java', 'cpp']

// Chat Message
sendMessageSchema validates:
- roomId: required
- content: 1-1000 characters

// Code Execution
executeCodeSchema validates:
- roomId: required
- code: not empty
- language: valid language
- input: optional
```

**Joi Features Used:**

```typescript
Joi.string()           // Must be string
  .email()            // Must be valid email
  .required()         // Cannot be empty
  .min(6)            // Min length 6
  .max(100)          // Max length 100
  .alphanum()        // Only letters and numbers
  .pattern(/[A-Z]/)  // Must contain uppercase
  .valid('val1', 'val2')  // Must be one of these values
  .optional()        // Can be empty
  .default('value')  // Default if not provided
```

**Validation Workflow:**

```
Request arrives with data
  ↓
Route calls validateRequest({ body: schema })
  ↓
Middleware calls schema.validate(data)
  ↓
If error: throw ValidationError → 400 response
  ↓
If valid: Clean data (remove unknown fields), continue to handler
  ↓
Handler receives cleaned, validated data
```

---

### 4. RATE LIMITING

**Problem:** Without rate limiting, anyone can:
- Brute force passwords (try 1000 passwords per second)
- Spam API (DOS attack)
- Exhaust free-tier API limits (Judge0 has 50/day limit)

**Solution:** In-memory rate limiter

**How it works:**

```
Request comes from IP: 192.168.1.1
  ↓
Check rate limit store: { "192.168.1.1": { count: 3, resetTime: 1234567890 } }
  ↓
Is count > maxRequests (5)?
  ↓
NO: count++, continue
  ↓
YES: Reject with 429 Too Many Requests

Every minute: Clean up old entries (prevent memory leak)
```

**Specific Limiters:**

```typescript
// Auth (login, register)
authLimiter = 5 requests per 15 minutes
// Prevents: Brute force password guessing

// General API
apiLimiter = 100 requests per minute
// Prevents: Spam, DOS attacks

// Code Execution
executionLimiter = 10 requests per minute
// Prevents: Overloading free Judge0 API (50/day limit)
```

**Response Headers Added:**

```
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 2
X-RateLimit-Reset: 1234567890

Frontend can read these headers and:
- Show "X attempts remaining"
- Disable button when count reaches 0
- Show countdown timer until reset
```

**Free-Tier Friendly:**

Why in-memory instead of Redis?
- Redis requires external service (paid or complex setup)
- In-memory works great for single server
- Sufficient for 1000+ concurrent users
- If we scale to multiple servers → upgrade to Redis

---

### 5. VALIDATION MIDDLEWARE

**Purpose:** Validate request data before it reaches route handler

**Flow:**

```
Request
  ↓
validateRequest({ body: schema })  ← Middleware
  ↓
If invalid: Throw error → 400 response
If valid: Clean data → Route handler
  ↓
Route handler receives validated, cleaned data
```

**What "clean" means:**

```typescript
// User sends:
{ email: "user@ex.com", password: "123", evil: "malicious", extra: "field" }

// After validation:
{ email: "user@ex.com", password: "123" }
// ✓ Extra fields removed
// ✓ Data matches schema exactly
// ✓ No surprises for business logic
```

**Type Safety:**

```typescript
// TypeScript types validated data:
const { email, password } = req.body;  // ✓ Compiler knows these exist
// email is definitely string, valid email
// password is definitely string, min 6 chars

// Without validation:
const { email, password } = req.body;  // email could be anything!
```

---

### 6. JWT AUTH MIDDLEWARE

**Purpose:** Verify JWT on protected routes

**Flow:**

```
Client sends: Authorization: Bearer <token>
  ↓
requireAuth middleware
  ↓
Extract token from header
  ↓
Verify token signature
  ↓
If invalid: Throw AuthenticationError → 401
If valid: req.user = { userId, email, ... }
  ↓
Route handler runs with req.user available
```

**Code Example:**

```typescript
// Protected route:
router.get('/profile', requireAuth, profileHandler);

// Handler:
async profileHandler(req, res) {
  const userId = req.user!.userId;  // We know it exists
  const user = await userService.getProfile(userId);
  res.json(user);
}

// Without token:
❌ requireAuth throws error
❌ Handler never runs
✓ Client gets 401 Unauthorized

// With valid token:
✓ Middleware sets req.user
✓ Handler runs
✓ Client gets user profile

// With invalid token:
❌ Middleware throws error
❌ Handler never runs
✓ Client gets 401 Unauthorized
```

**Global Declaration:**

```typescript
declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}
```

Why?
- Tells TypeScript: "Express Request has optional user property"
- Prevents TypeScript errors: `req.user` doesn't exist
- Makes IDE autocomplete work: `req.user.u` → suggests userId

---

## SECURITY CONSIDERATIONS

### ✅ Implemented in Step 2

1. **Password Hashing**
   - Bcrypt with salt rounds
   - Cannot recover passwords from DB

2. **JWT Signing**
   - HMAC-SHA256 signature
   - Token can't be tampered with

3. **Token Verification**
   - Signature checked
   - Expiration checked
   - Invalid tokens rejected immediately

4. **Rate Limiting**
   - Brute force protection
   - Login attempts limited (5 per 15 min)

5. **Input Validation**
   - Joi schemas validate all input
   - SQL injection prevented (no raw SQL)
   - No unexpected data reaches handlers

### ⏳ Coming in Phase 2 Step 3

1. **User Model** - Database schema
2. **Auth Service** - Business logic (register, login)
3. **Auth Routes** - HTTP endpoints
4. **Token Refresh** - Refresh tokens for long sessions
5. **Protected Routes** - Combine auth middleware + routes

---

## FLOW DIAGRAMS

### Registration Flow

```
User fills form: email, username, password, confirmPassword
  ↓
Frontend sends POST /api/auth/register with JSON body
  ↓
BACKEND:
  validateRequest({ body: registerSchema })
    ↓
    Validate email format
    Validate username (alphanumeric, 3-30 chars)
    Validate password (6+ chars, uppercase, numbers)
    Validate confirmPassword matches password
    ↓
    If invalid → throw ValidationError → 400 response
  ↓
authController.register(email, username, password)
  ↓
authService.register(email, username, password)
  ↓
Check if email already exists in DB
  ↓
If exists → throw ConflictError → 409 response
  ↓
Hash password: passwordHash = await hashPassword(password)
  ↓
Create user in DB: User({ email, username, passwordHash })
  ↓
Generate token: token = generateToken({ userId })
  ↓
Return: { success: true, user, token }
  ↓
Frontend stores token, logs in user
```

### Login Flow

```
User enters email and password
  ↓
Frontend sends POST /api/auth/login
  ↓
BACKEND:
  validateRequest({ body: loginSchema })
    ↓
    Validate email format
    Validate password (6+ chars)
    ↓
    If invalid → 400 response
  ↓
authLimiter (max 5 attempts per 15 min)
    ↓
    If exceeded → 429 Too Many Requests
  ↓
authService.login(email, password)
  ↓
Find user by email in DB
  ↓
If not found → throw AuthenticationError → 401
  ↓
Compare plaintext password with DB hash:
comparePassword(password, user.passwordHash)
  ↓
If doesn't match → throw AuthenticationError → 401
  ↓
Generate token: token = generateToken({ userId, email })
  ↓
Return: { success: true, user, token }
  ↓
Frontend stores token in localStorage
  ↓
Future requests include: Authorization: Bearer <token>
```

### Protected Route Access

```
User clicks "Get Profile" button
  ↓
Frontend sends GET /api/users/profile
Header: Authorization: Bearer <token>
  ↓
BACKEND:
  requireAuth middleware
    ↓
    Extract token from header
    ↓
    verifyToken(token)
      ↓
      Check signature (matches JWT_SECRET?)
      Check expiration (not expired?)
      ↓
      If invalid → throw AuthenticationError → 401
    ↓
    Set req.user = { userId, email }
  ↓
profileHandler(req, res)
  ↓
const userId = req.user.userId
const user = await userService.getProfile(userId)
return user
  ↓
Frontend displays profile
```

---

## FILES CREATED IN STEP 2

| File | Lines | Purpose |
|------|-------|---------|
| `src/utils/jwt.ts` | 70 | JWT token generation/verification |
| `src/utils/hash.ts` | 70 | Password hashing with bcrypt |
| `src/utils/validators.ts` | 180 | Joi validation schemas |
| `src/middleware/rateLimit.middleware.ts` | 120 | Rate limiting middleware |
| `src/middleware/validation.middleware.ts` | 140 | Request validation middleware |
| `src/middleware/auth.middleware.ts` | 110 | JWT authentication middleware |

**Total: ~690 lines of production-grade code**

---

## HOW TO USE THESE IN STEP 3

### In Auth Routes

```typescript
import { Router } from 'express';
import { validateRequest } from '../middleware/validation.middleware.js';
import { authLimiter } from '../middleware/rateLimit.middleware.js';
import { registerSchema, loginSchema } from '../utils/validators.js';
import authController from '../modules/auth/auth.controller.js';

const router = Router();

router.post('/register',
  validateRequest({ body: registerSchema }),
  authController.register
);

router.post('/login',
  authLimiter,
  validateRequest({ body: loginSchema }),
  authController.login
);

export default router;
```

### In Protected Routes

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import userController from '../modules/users/users.controller.js';

const router = Router();

// Only logged-in users can access
router.get('/profile', requireAuth, userController.getProfile);

export default router;
```

### In Auth Service

```typescript
import { hashPassword, comparePassword } from '../utils/hash.js';
import { generateToken } from '../utils/jwt.js';
import { validateOrThrow } from '../middleware/validation.middleware.js';
import { registerSchema } from '../utils/validators.js';

class AuthService {
  async register(email: string, username: string, password: string) {
    // Validate input
    validateOrThrow({ email, username, password, confirmPassword: password }, registerSchema);

    // Check if user exists
    const existing = await User.findOne({ email });
    if (existing) throw new ConflictError('Email already registered');

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await User.create({
      email,
      username,
      passwordHash,
    });

    // Generate token
    const token = generateToken({ userId: user._id.toString() });

    return { user, token };
  }

  async login(email: string, password: string) {
    // Find user
    const user = await User.findOne({ email });
    if (!user) throw new AuthenticationError('Invalid credentials');

    // Verify password
    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) throw new AuthenticationError('Invalid credentials');

    // Generate token
    const token = generateToken({ userId: user._id.toString() });

    return { user, token };
  }
}
```

---

## NEXT: PHASE 2 STEP 3

Step 3 will implement the Auth Module:
1. User model (MongoDB schema)
2. Auth service (register, login logic)
3. Auth controller (HTTP handlers)
4. Auth routes (PUT IT ALL TOGETHER)
5. Postman testing (verify everything works)

All the utilities we built in Step 2 will be used in Step 3.

**Status**: ✅ Step 2 Complete - Utilities & Middleware Ready
