import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { env } from './env.js';
import logger from '../utils/logger.js';

/**
 * Socket.IO Configuration
 *
 * Why separate config?
 * - Reusable socket instance across modules
 * - Centralized CORS and security settings
 * - Easy to test and mock
 */

let io: SocketIOServer | null = null;

const initializeSocket = (httpServer: HTTPServer): SocketIOServer => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: env.frontendUrl,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  logger.info('✅ Socket.IO initialized');
  return io;
};

const getSocket = (): SocketIOServer => {
  if (!io) {
    throw new Error('Socket.IO not initialized. Call initializeSocket first.');
  }
  return io;
};

export { initializeSocket, getSocket };
