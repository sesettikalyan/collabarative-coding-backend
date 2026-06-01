import logger from '../../utils/logger.js';
import { getSocket } from '../../config/socket.js';
import presenceService from '../presence/presence.service.js';
import { SocketUser, SOCKET_EVENTS, ConnectedUser } from './socket.types.js';

/**
 * Socket Event Handlers
 *
 * Manages connection, disconnection, and user presence
 */

export const setupSocketHandlers = (): void => {
  const io = getSocket();

  io.on(SOCKET_EVENTS.CONNECTION, (socket: SocketUser) => {
    logger.debug(`🔌 Socket connected: ${socket.id}`);

    // Authenticate on connection
    socket.on('auth', (data: { userId: string; username: string; email: string }) => {
      handleAuth(socket, data);
    });

    // Handle disconnection
    socket.on(SOCKET_EVENTS.DISCONNECT, () => {
      handleDisconnect(socket);
    });

    // Handle errors
    socket.on('error', (error: any) => {
      logger.error(`❌ Socket error (${socket.id}):`, error);
    });
  });
};

const handleAuth = (
  socket: SocketUser,
  data: { userId: string; username: string; email: string }
): void => {
  const { userId, username, email } = data;

  if (!userId || !username || !email) {
    socket.emit(SOCKET_EVENTS.UNAUTHORIZED, {
      message: 'Missing required authentication data',
    });
    socket.disconnect();
    return;
  }

  // Store user info on socket
  socket.userId = userId;
  socket.username = username;
  socket.email = email;

  // Add to presence service
  const user: ConnectedUser = {
    userId,
    username,
    email,
    socketId: socket.id,
    connectedAt: new Date(),
  };

  presenceService.addUser(user);

  // Broadcast user online to all clients
  const io = getSocket();
  io.emit(SOCKET_EVENTS.USER_ONLINE, {
    userId,
    username,
    timestamp: new Date(),
  });

  // Send online users count
  const onlineCount = presenceService.getOnlineCount();
  io.emit('stats:online', { count: onlineCount });

  logger.info(`✅ User authenticated: ${username} (${userId})`);
};

const handleDisconnect = (socket: SocketUser): void => {
  if (!socket.userId) {
    logger.debug(`🔌 Socket disconnected (unauthenticated): ${socket.id}`);
    return;
  }

  // Remove from presence
  const user = presenceService.removeBySocket(socket.id);

  if (user) {
    // Broadcast user offline
    const io = getSocket();
    io.emit(SOCKET_EVENTS.USER_OFFLINE, {
      userId: user.userId,
      username: user.username,
      timestamp: new Date(),
    });

    // Send updated online count
    const onlineCount = presenceService.getOnlineCount();
    io.emit('stats:online', { count: onlineCount });

    logger.info(`🔌 User disconnected: ${user.username} (${user.userId})`);
  }
};
