import logger from '../../utils/logger.js';
import { ConnectedUser } from '../socket/socket.types.js';

/**
 * Presence Service
 *
 * In-memory user presence tracking
 * Maps userId → ConnectedUser for fast lookups
 * Alternative: Use Redis for distributed deployments
 */

class PresenceService {
  private users: Map<string, ConnectedUser> = new Map();
  private socketToUser: Map<string, string> = new Map();

  addUser(user: ConnectedUser): void {
    this.users.set(user.userId, user);
    this.socketToUser.set(user.socketId, user.userId);
    logger.info(`👤 User online: ${user.username} (${user.userId})`);
  }

  removeUser(userId: string): ConnectedUser | null {
    const user = this.users.get(userId);
    if (user) {
      this.socketToUser.delete(user.socketId);
      this.users.delete(userId);
      logger.info(`👤 User offline: ${user.username} (${userId})`);
    }
    return user || null;
  }

  removeBySocket(socketId: string): ConnectedUser | null {
    const userId = this.socketToUser.get(socketId);
    if (userId) {
      return this.removeUser(userId);
    }
    return null;
  }

  getUser(userId: string): ConnectedUser | null {
    return this.users.get(userId) || null;
  }

  getBySocket(socketId: string): ConnectedUser | null {
    const userId = this.socketToUser.get(socketId);
    return userId ? this.getUser(userId) : null;
  }

  getAllUsers(): ConnectedUser[] {
    return Array.from(this.users.values());
  }

  getOnlineCount(): number {
    return this.users.size;
  }

  getUsersInRoom(roomId: string): ConnectedUser[] {
    return Array.from(this.users.values()).filter(
      (u) => u.currentRoom === roomId
    );
  }

  setUserRoom(userId: string, roomId: string | undefined): void {
    const user = this.users.get(userId);
    if (user) {
      user.currentRoom = roomId;
      this.users.set(userId, user);
    }
  }

  isUserOnline(userId: string): boolean {
    return this.users.has(userId);
  }
}

export default new PresenceService();
