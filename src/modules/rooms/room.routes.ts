import { Router } from 'express';
import { roomController } from './room.controller.js';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { validateRequest } from '../../middleware/validation.middleware.js';
import { createRoomSchema } from './room.validation.js';

const router = Router();

// ─────────────────────────────────────────────
// All room routes are protected
// authMiddleware runs on every route below
// ─────────────────────────────────────────────
router.use(requireAuth);

// IMPORTANT: /my MUST come before /:roomId
// Express matches routes top-down. Without this order,
// a GET /my would match /:roomId with roomId = "my"
router.get('/my', roomController.getMyRooms);

router.post('/', validateRequest({ body: createRoomSchema }), roomController.createRoom);
router.get('/:roomId', roomController.getRoom);
router.post('/:roomId/join', roomController.joinRoom);
router.put('/:roomId/language', roomController.updateLanguage);
router.delete('/:roomId/leave', roomController.leaveRoom);
router.delete('/:roomId', roomController.deleteRoom);

export default router;