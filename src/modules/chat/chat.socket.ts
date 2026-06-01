import { Server } from 'socket.io';
import { SocketUser, SOCKET_EVENTS } from '../socket/socket.types.js';
import logger from '../../utils/logger.js';

/**
 * Chat Socket Handlers
 * 
 * Manages real-time text chat within collaborative rooms.
 * Currently implemented as transient (non-persistent) messages,
 * which is highly performant and saves database costs.
 */
export const registerChatSocketHandlers = (
  io: Server,
  socket: SocketUser
): void => {
  // ── EVENT: chat:message ──────────────────────────
  // Client sends a chat message, we broadcast it to the room
  socket.on(
    SOCKET_EVENTS.CHAT_MESSAGE,
    (data: { roomId: string; text: string }) => {
      try {
        const { roomId, text } = data;
        
        // Basic validation to prevent empty messages
        if (!text || text.trim() === '') return;

        const messagePayload = {
          userId: socket.userId,
          username: socket.username,
          text: text.trim(),
          timestamp: new Date().toISOString()
        };

        // Emit to EVERYONE in the room (io.to) including the sender.
        // This ensures the sender gets the exact server-side timestamp 
        // and guarantees message order synchronization.
        io.to(roomId).emit(SOCKET_EVENTS.CHAT_MESSAGE, messagePayload);
        
        logger.debug(`[Chat] ${socket.username} sent message in room ${roomId}`);
      } catch (error) {
        logger.error(`[Socket] chat:message error: ${error}`);
      }
    }
  );
};
