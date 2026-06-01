import { Request, Response } from 'express';
import { roomService } from './room.service';

// ─────────────────────────────────────────────
// RoomController — thin layer between HTTP and service
// 
// Controllers should ONLY:
//   1. Extract data from request
//   2. Call the service
//   3. Send the response
//
// No business logic here. Ever.
// ─────────────────────────────────────────────

class RoomController {
    // POST /api/rooms
    createRoom = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.userId;
        const room = await roomService.createRoom(userId, req.body);

        res.status(201).json({
            success: true,
            message: 'Room created successfully',
            data: { room },
        });
    };

    // GET /api/rooms/my
    // Must be defined BEFORE /:roomId to avoid "my" being treated as a roomId
    getMyRooms = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.userId;
        const rooms = await roomService.getUserRooms(userId);

        res.json({
            success: true,
            data: { rooms, count: rooms.length },
        });
    };

    // GET /api/rooms/:roomId
    getRoom = async (req: Request, res: Response): Promise<void> => {
        const { roomId } = req.params;
        const room = await roomService.getRoomById(roomId);

        res.json({
            success: true,
            data: { room },
        });
    };

    // POST /api/rooms/:roomId/join
    joinRoom = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.userId;
        const { roomId } = req.params;
        const room = await roomService.joinRoom(roomId, userId);

        res.json({
            success: true,
            message: 'Joined room successfully',
            data: { room },
        });
    };

    // DELETE /api/rooms/:roomId/leave
    leaveRoom = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.userId;
        const { roomId } = req.params;
        await roomService.leaveRoom(roomId, userId);

        res.json({
            success: true,
            message: 'Left room successfully',
        });
    };

    // DELETE /api/rooms/:roomId
    deleteRoom = async (req: Request, res: Response): Promise<void> => {
        const userId = req.user!.userId;
        const { roomId } = req.params;
        await roomService.deleteRoom(roomId, userId);

        res.json({
            success: true,
            message: 'Room deleted successfully',
        });
    };
}

export const roomController = new RoomController();