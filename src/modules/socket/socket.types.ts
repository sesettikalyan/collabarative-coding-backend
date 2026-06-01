import { Socket as SocketIOSocket } from 'socket.io';

/**
 * Socket.IO Type Definitions
 */

export interface ConnectedUser {
  userId: string;
  username: string;
  email: string;
  socketId: string;
  connectedAt: Date;
  currentRoom?: string;
}

export interface SocketUser extends SocketIOSocket {
  userId?: string;
  username?: string;
  email?: string;
}

export interface RoomPresence {
  roomId: string;
  users: ConnectedUser[];
  updatedAt: Date;
}

export interface SocketEventPayload {
  userId: string;
  username: string;
  email: string;
  timestamp: Date;
}

export const SOCKET_EVENTS = {
  // Connection events
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',

  // User events
  USER_ONLINE: 'user:online',
  USER_OFFLINE: 'user:offline',

  // Room events
  JOIN_ROOM: 'room:join',
  LEAVE_ROOM: 'room:leave',
  ROOM_UPDATED: 'room:updated',

  // Presence events
  PRESENCE_UPDATE: 'presence:update',
  GET_PRESENCE: 'presence:get',

  // Error events
  ERROR: 'error',
  UNAUTHORIZED: 'unauthorized',
};
