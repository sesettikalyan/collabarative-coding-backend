// ─────────────────────────────────────────────
// Room module TypeScript interfaces
// Centralizing types here means controllers,
// services, and sockets all import from one place
// ─────────────────────────────────────────────

export type SupportedLanguage = 'cpp' | 'java' | 'python' | 'javascript';

// DTO = Data Transfer Object — what the client sends
export interface CreateRoomDto {
    name: string;
    language: SupportedLanguage;
    maxParticipants?: number;
}

// Shape of a participant returned in API responses
export interface RoomParticipant {
    _id: string;
    username: string;
    email: string;
}

// What room:joined socket event sends back
export interface RoomJoinedPayload {
    roomId: string;
    name: string;
    language: SupportedLanguage;
    code: string;
    participants: RoomParticipant[];
    participantCount: number;
}

// What room:user_joined / room:user_left broadcasts
export interface RoomPresencePayload {
    userId: string;
    username: string;
    roomId: string;
    participantCount: number;
}