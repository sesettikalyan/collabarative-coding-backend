import { Server } from 'socket.io';
import { SocketUser, SOCKET_EVENTS } from '../socket/socket.types.js';
import { roomService } from '../rooms/room.service.js';
import logger from '../../utils/logger.js';

/**
 * Editor Socket Handlers
 * 
 * Manages real-time code synchronization and cursor broadcasting.
 * Follows the modular monolith pattern by keeping editor logic
 * separate from room and user logic.
 */
export const registerEditorSocketHandlers = (
  io: Server,
  socket: SocketUser
): void => {
  // ── EVENT: editor:code_change ────────────────────────
  // Broadcasts real-time typing to everyone else in the room
  // Optimization: In a more complex app, we might use OT or CRDTs,
  // but for simplicity and high performance, broadcasting full code 
  // or diffs works well for small to medium files.
  socket.on(
    SOCKET_EVENTS.CODE_CHANGE,
    (data: { roomId: string; code: string }) => {
      try {
        const { roomId, code } = data;

        // Broadcast to everyone else in the room
        socket.to(roomId).emit(SOCKET_EVENTS.CODE_CHANGE, {
          code,
          userId: socket.userId,
          username: socket.username
        });
      } catch (error) {
        logger.error(`[Socket] code_change error: ${error}`);
      }
    }
  );

  // ── EVENT: editor:cursor_change ──────────────────────
  // Used for "multiplayer cursors" - shows where others are typing
  // Scalability: these are lightweight and high-frequency,
  // no DB persistence is required.
  socket.on(
    SOCKET_EVENTS.CURSOR_CHANGE,
    (data: { roomId: string; position: any; selection: any }) => {
      try {
        const { roomId, position, selection } = data;

        socket.to(roomId).emit(SOCKET_EVENTS.CURSOR_CHANGE, {
          userId: socket.userId,
          username: socket.username,
          position,
          selection
        });
      } catch (error) {
        logger.error(`[Socket] cursor_change error: ${error}`);
      }
    }
  );

  // ── EVENT: editor:save ───────────────────────────────
  // Client debounces typing and sends a save event to persist to DB.
  // We NEVER persist on every keystroke to save DB load.
  socket.on(
    SOCKET_EVENTS.CODE_SAVE,
    async (data: { roomId: string; code: string }) => {
      try {
        const { roomId, code } = data;

        // Persist to MongoDB
        await roomService.updateCode(roomId, code);

        logger.debug(`[Editor] Code saved to DB for room ${roomId}`);
      } catch (error) {
        logger.error(`[Socket] code_save error: ${error}`);
      }
    }
  );
};
