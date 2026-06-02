import mongoose from 'mongoose';
import { Room, IRoom } from './room.model.js';
import { CreateRoomDto } from './room.types';
import {
    NotFoundError,
    AuthorizationError,
    ConflictError,
} from '../../utils/errors.js';
import logger from '../../utils/logger.js';

// ─────────────────────────────────────────────
// RoomService — all room business logic
//
// Architecture note: The service is a class
// with a single exported instance (singleton).
// Controllers and socket handlers both use this
// same instance — no duplicate logic anywhere.
// ─────────────────────────────────────────────

class RoomService {
    // ── CREATE ──────────────────────────────────
    async createRoom(userId: string, data: CreateRoomDto): Promise<IRoom> {
        const room = new Room({
            ...data,
            owner: userId,
            participants: [userId], // creator is automatically a participant
        });

        await room.save();
        logger.info(`Room created: ${room.roomId} by user: ${userId}`);

        // Return populated so controller gets full owner info
        return this.getRoomById(room.roomId);
    }

    // ── READ ─────────────────────────────────────
    async getRoomById(roomId: string): Promise<IRoom> {
        const room = await Room.findOne({ roomId, isActive: true })
            .populate('owner', 'username email')
            .populate('participants', 'username email');

        if (!room) {
            throw new NotFoundError(`Room "${roomId}" not found`);
        }

        return room;
    }

    async getUserRooms(userId: string): Promise<IRoom[]> {
        // All rooms where user is owner OR participant
        return Room.find({
            $or: [
                { owner: new mongoose.Types.ObjectId(userId) },
                { participants: new mongoose.Types.ObjectId(userId) },
            ],
            isActive: true,
        })
            .populate('owner', 'username email')
            .select('-code') // exclude code — it can be large, not needed for dashboard
            .sort({ updatedAt: -1 })
            .limit(20);
    }

    // ── JOIN ─────────────────────────────────────
    async joinRoom(roomId: string, userId: string): Promise<IRoom> {
        // Use findOne first so we can apply business rules
        const room = await Room.findOne({ roomId });

        if (!room) {
            throw new NotFoundError(`Room "${roomId}" not found`);
        }

        if (!room.isActive) {
            throw new ConflictError('This room has been closed');
        }

        if (room.participants.length >= room.maxParticipants) {
            throw new ConflictError(
                `Room is full (${room.maxParticipants}/${room.maxParticipants})`
            );
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);
        const alreadyIn = room.participants.some((p) => p.equals(userObjectId));

        if (!alreadyIn) {
            room.participants.push(userObjectId);
            await room.save();
        }

        // Return fully populated room
        return this.getRoomById(roomId);
    }

    // ── LEAVE ─────────────────────────────────────
    async leaveRoom(roomId: string, userId: string): Promise<void> {
        const room = await Room.findOne({ roomId });

        if (!room) {
            throw new NotFoundError(`Room "${roomId}" not found`);
        }

        const userObjectId = new mongoose.Types.ObjectId(userId);

        // Remove user from participants list
        room.participants = room.participants.filter(
            (p) => !p.equals(userObjectId)
        );

        // If owner left but others remain → transfer ownership
        if (room.owner.equals(userObjectId) && room.participants.length > 0) {
            room.owner = room.participants[0];
            logger.info(
                `Ownership of room ${roomId} transferred to ${room.participants[0]}`
            );
        }

        // No one left → deactivate room
        if (room.participants.length === 0) {
            room.isActive = false;
            logger.info(`Room ${roomId} deactivated (no participants)`);
        }

        await room.save();
        logger.info(`User ${userId} left room ${roomId}`);
    }

    // ── CODE PERSISTENCE ─────────────────────────
    // Called by the editor socket handler (debounced)
    async updateCode(roomId: string, code: string): Promise<void> {
        await Room.findOneAndUpdate(
            { roomId, isActive: true },
            { code },
            { new: false } // we don't need the updated doc back
        );
    }

    // ── DELETE ────────────────────────────────────
    async deleteRoom(roomId: string, userId: string): Promise<void> {
        const room = await Room.findOne({ roomId });

        if (!room) {
            throw new NotFoundError(`Room "${roomId}" not found`);
        }

        if (!room.owner.equals(new mongoose.Types.ObjectId(userId))) {
            throw new AuthorizationError('Only the room owner can delete this room');
        }

        // Soft delete — mark inactive rather than remove
        room.isActive = false;
        await room.save();

        logger.info(`Room ${roomId} deleted by owner ${userId}`);
    }
}

// Export a singleton — one instance shared across the app
export const roomService = new RoomService();