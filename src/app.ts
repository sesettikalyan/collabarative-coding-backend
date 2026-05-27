import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import 'express-async-errors'; // Catch async/await errors automatically
import { env } from './config/env.js';
import logger from './utils/logger.js';
import { AppError } from './utils/errors.js';

/**
 * Express App Setup
 *
 * This file configures all middleware and error handlers.
 * Middleware runs in order, so placement matters!
 *
 * Order of middleware:
 * 1. Logging and parsing (first to see all requests)
 * 2. CORS (security)
 * 3. Rate limiting (protection) - added in Phase 2 Step 2
 * 4. Routes (application logic)
 * 5. Error handling (last to catch everything)
 */

const app: Express = express();

// ========== TRUST PROXY ==========
// Important for production deployments behind reverse proxies (Render, Railway)
// Allows req.ip and req.protocol to work correctly
app.set('trust proxy', 1);

// ========== CORS ==========
// Allow frontend to communicate with backend
app.use(
  cors({
    origin: env.frontendUrl,
    credentials: true, // Allow cookies for WebSocket authentication
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// ========== BODY PARSING ==========
// Parse incoming JSON requests
app.use(express.json({ limit: '10mb' })); // 10MB limit for large payloads
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ========== REQUEST LOGGING ==========
// Log every request (helpful for debugging)
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  // Log response when it's sent
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
  });

  next();
});

// ========== HEALTH CHECK ==========
// For deployment platforms to verify server is alive
app.get('/health', (req: Request, res: Response) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// ========== ROUTES (will be added in Phase 2 Step 3) ==========
// Each module will register its routes here

// ========== 404 HANDLER ==========
// Route not found
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.path,
  });
});

// ========== ERROR HANDLING MIDDLEWARE ==========
/**
 * Centralized error handler
 *
 * Why a global error handler?
 * - Consistent error response format
 * - Don't expose internal details to frontend
 * - Log all errors for debugging
 * - Convert different error types to standard HTTP responses
 */
app.use((err: Error | AppError, req: Request, res: Response, next: NextFunction) => {
  // Log the error
  if (err instanceof AppError) {
    logger.warn(`${err.statusCode}: ${err.message}`);
  } else {
    logger.error('Unexpected error:', err);
  }

  // Handle known errors
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(env.isDevelopment && { stack: err.stack }),
    });
  }

  // Handle unknown errors (don't expose details in production)
  return res.status(500).json({
    success: false,
    message: env.isDevelopment ? err.message : 'Internal server error',
    ...(env.isDevelopment && { stack: err.stack }),
  });
});

export default app;
