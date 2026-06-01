import { Server } from 'socket.io';
import { SocketUser, SOCKET_EVENTS } from '../socket/socket.types';
import { roomService } from './room.service';
import presenceService from '../presence/presence.service';
import logger from '../../utils/logger';

// ─────────────────────────────────────────────
// Room Socket Handlers
//
// This function is called once per socket connection.
// It registers all room-related socket event listeners
// for that specific socket.
//
// Architecture pattern: each module owns its socket handlers.
// The central socket.handler.ts just calls these registration
// functions — keeping central handler clean and thin.
// ─────────────────────────────────────────────

export const registerRoomSocketHandlers = (
    io: Server,
    socket: SocketUser
): void => {
    // ── EVENT: room:join ────────────────────────
    // Client sends this when user navigates to /room/:roomId
    socket.on(
        SOCKET_EVENTS.ROOM_JOIN,
        async (data: { roomId: string }) => {
            try {
                const { roomId } = data;
                const userId = socket.userId!;
                const username = socket.username!;

                // 1. Update MongoDB — add user to participants
                const room = await roomService.joinRoom(roomId, userId);

                // 2. Join the socket.io room (enables to(roomId) broadcasts)
                await socket.join(roomId);

                // 3. Track room in presence service
                presenceService.setUserRoom(userId, roomId);

                // 4. Count live connections in the socket room
                const socketsInRoom = await io.in(roomId).fetchSockets();
                const participantCount = socketsInRoom.length;

                // 5. Tell OTHERS in room that this user joined
                socket.to(roomId).emit(SOCKET_EVENTS.ROOM_USER_JOINED, {
                    userId,
                    username,
                    roomId,
                    participantCount,
                });

                // 6. Confirm to the joiner — send full room data
                //    (they need the existing code content to populate Monaco)
                socket.emit(SOCKET_EVENTS.ROOM_JOINED, {
                    roomId: room.roomId,
                    name: room.name,
                    language: room.language,
                    code: room.code,               // ← editor loads this on mount
                    participants: room.participants,
                    participantCount,
                });

                logger.info(
                    `[Socket] User "${username}" joined room "${roomId}" (${participantCount} online)`
                );
            } catch (error: any) {
                logger.error(`[Socket] room:join error: ${error.message}`);
                socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
                    event: SOCKET_EVENTS.ROOM_JOIN,
                    message: error.message || 'Failed to join room',
                });
            }
        }
    );

    // ── EVENT: room:leave ───────────────────────
    // Client sends this on intentional leave (not disconnect)
    socket.on(
        SOCKET_EVENTS.ROOM_LEAVE,
        async (data: { roomId: string }) => {
            try {
                const { roomId } = data;
                const userId = socket.userId!;
                const username = socket.username!;

                // 1. Leave socket.io room first
                await socket.leave(roomId);

                // 2. Clear presence
                presenceService.setUserRoom(userId, undefined);

                // 3. Update MongoDB
                await roomService.leaveRoom(roomId, userId);

                // 4. Count remaining live connections
                const socketsInRoom = await io.in(roomId).fetchSockets();
                const participantCount = socketsInRoom.length;

                // 5. Tell everyone still in the room
                io.to(roomId).emit(SOCKET_EVENTS.ROOM_USER_LEFT, {
                    userId,
                    username,
                    roomId,
                    participantCount,
                });

                // 6. Confirm to the leaver
                socket.emit(SOCKET_EVENTS.ROOM_LEFT, { roomId });

                logger.info(
                    `[Socket] User "${username}" left room "${roomId}" (${participantCount} remaining)`
                );
            } catch (error: any) {
                logger.error(`[Socket] room:leave error: ${error.message}`);
                socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
                    event: SOCKET_EVENTS.ROOM_LEAVE,
                    message: error.message || 'Failed to leave room',
                });
            }
        }
    );

    // ── EVENT: room:get_participants ────────────
    // Allows client to refresh participant list on demand
    socket.on(
        SOCKET_EVENTS.ROOM_GET_PARTICIPANTS,
        async (data: { roomId: string }) => {
            try {
                const { roomId } = data;
                const room = await roomService.getRoomById(roomId);

                socket.emit(SOCKET_EVENTS.ROOM_PARTICIPANTS, {
                    roomId,
                    participants: room.participants,
                    count: room.participants.length,
                });
            } catch (error: any) {
                socket.emit(SOCKET_EVENTS.ROOM_ERROR, {
                    event: SOCKET_EVENTS.ROOM_GET_PARTICIPANTS,
                    message: error.message || 'Failed to get participants',
                });
            }
        }
    );
};