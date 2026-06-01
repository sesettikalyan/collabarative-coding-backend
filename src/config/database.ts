import mongoose from 'mongoose';
import { env } from './env.js';
import logger from '../utils/logger.js';

/**
 * MongoDB Connection Setup
 *
 * Why Mongoose?
 * - Schema validation at application layer
 * - Built-in type safety with TypeScript
 * - Middleware hooks (before save, after find, etc.)
 * - Connection pooling (important for scalability)
 *
 * Why connect once at startup?
 * - Database connections are expensive
 * - Reuse connections for all requests
 * - Proper cleanup on shutdown
 */

const connectDatabase = async (): Promise<void> => {
  try {
    logger.info('Connecting to MongoDB...');

    const connection = await mongoose.connect(env.mongodbUri, {
      // Connection options for optimal performance
      maxPoolSize: 10, // Maintain up to 10 connections (free tier friendly)
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      family: 4, // Use IPv4, skip trying IPv6
    });

    logger.info(`✅ MongoDB connected: ${connection.connection.host}`);
    return;
  } catch (error) {
    logger.error('❌ MongoDB connection failed:', error);
    // In production, exit immediately. In dev, retry later
    if (env.isProduction) {
      process.exit(1);
    }
    throw error;
  }
};

/**
 * Graceful shutdown
 * Close database connection when server stops
 */
const disconnectDatabase = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('✅ MongoDB disconnected');
  } catch (error) {
    logger.error('❌ Error disconnecting MongoDB:', error);
  }
};

export { connectDatabase, disconnectDatabase };
