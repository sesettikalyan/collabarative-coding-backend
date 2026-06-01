import { createServer } from 'http';
import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/database.js';
import { initializeSocket } from './config/socket.js';
import { setupSocketHandlers } from './modules/socket/socket.handler.js';
import logger from './utils/logger.js';

/**
 * Server Entry Point
 *
 * This file:
 * 1. Starts the HTTP server (required for Socket.IO)
 * 2. Connects to MongoDB
 * 3. Initializes Socket.IO
 * 4. Handles graceful shutdown
 *
 * Why separate server.ts from app.ts?
 * - app.ts is just middleware and routes (reusable)
 * - server.ts handles startup/shutdown (specific to this instance)
 * - Easier to test app logic without starting server
 */

const startServer = async (): Promise<void> => {
  try {
    // Connect to database FIRST
    // No point starting server if DB connection fails
    await connectDatabase();

    // Create HTTP server (required for Socket.IO)
    const httpServer = createServer(app);

    // Initialize Socket.IO
    initializeSocket(httpServer);
    setupSocketHandlers();

    // Start HTTP server
    httpServer.listen(env.port, () => {
      logger.info(`🚀 Server running on http://localhost:${env.port}`);
      logger.info(`📝 Environment: ${env.nodeEnv}`);
      logger.info(`🔗 Frontend URL: ${env.frontendUrl}`);
      logger.info(`🔌 Socket.IO ready for real-time connections`);
    });

    const server = httpServer;

    // ========== GRACEFUL SHUTDOWN ==========
    /**
     * When server receives SIGTERM or SIGINT (Ctrl+C), gracefully close:
     * 1. Stop accepting new requests
     * 2. Wait for existing requests to finish (30s timeout)
     * 3. Close database connection
     * 4. Exit process
     *
     * Why important?
     * - Render/Railway send SIGTERM before restart
     * - Prevents incomplete requests from hanging
     * - Ensures database connections are closed properly
     */
    const shutdown = async (signal: string) => {
      logger.info(`⏸️  Received ${signal}, shutting down gracefully...`);

      // Stop accepting new connections
      server.close(async () => {
        await disconnectDatabase();
        logger.info('✅ Server shutdown complete');
        process.exit(0);
      });

      // Force exit after 30 seconds
      setTimeout(() => {
        logger.error('❌ Forced shutdown after 30s timeout');
        process.exit(1);
      }, 30000);
    };

    // Listen for shutdown signals
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (err: Error) => {
      logger.error('💥 Uncaught Exception:', err);
      process.exit(1);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      logger.error('💥 Unhandled Rejection:', reason);
      process.exit(1);
    });
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
