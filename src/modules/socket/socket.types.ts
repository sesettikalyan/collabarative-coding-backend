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
  ROOM_UPDATED: 'room:updated',
  ROOM_JOIN: 'room:join',
  ROOM_JOINED: 'room:joined',
  ROOM_USER_JOINED: 'room:user_joined',
  ROOM_LEAVE: 'room:leave',
  ROOM_LEFT: 'room:left',
  ROOM_USER_LEFT: 'room:user_left',
  ROOM_GET_PARTICIPANTS: 'room:get_participants',
  ROOM_PARTICIPANTS: 'room:participants',
  ROOM_ERROR: 'room:error',

  // Presence events
  PRESENCE_UPDATE: 'presence:update',
  GET_PRESENCE: 'presence:get',

  // Editor events
  CODE_CHANGE: 'editor:code_change',
  CURSOR_CHANGE: 'editor:cursor_change',
  CODE_SAVE: 'editor:save',

  // Chat events
  CHAT_MESSAGE: 'chat:message',

  // Error events
  ERROR: 'error',
  UNAUTHORIZED: 'unauthorized',
};
