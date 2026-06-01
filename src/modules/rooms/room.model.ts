import mongoose, { Schema, Document } from 'mongoose';
import { nanoid } from 'nanoid';
import { SupportedLanguage } from './room.types';

// ─────────────────────────────────────────────
// IRoom — what a room document looks like in DB
// ─────────────────────────────────────────────
export interface IRoom extends Document {
    roomId: string;                          // human-friendly short ID (e.g. "V1StGXR8_Z")
    name: string;
    language: SupportedLanguage;
    owner: mongoose.Types.ObjectId;          // creator of the room
    participants: mongoose.Types.ObjectId[]; // all current members (incl owner)
    code: string;                            // persisted code content
    isActive: boolean;
    maxParticipants: number;
    createdAt: Date;
    updatedAt: Date;
}

const roomSchema = new Schema<IRoom>(
    {
        roomId: {
            type: String,
            unique: true,
            default: () => nanoid(10), // "V1StGXR8_Z" — 10 chars, URL-safe
            index: true,
        },
        name: {
            type: String,
            required: [true, 'Room name is required'],
            trim: true,
            minlength: [3, 'Room name must be at least 3 characters'],
            maxlength: [50, 'Room name cannot exceed 50 characters'],
        },
        language: {
            type: String,
            enum: ['cpp', 'java', 'python', 'javascript'],
            required: [true, 'Language is required'],
        },
        owner: {
            type: Schema.Types.ObjectId,
            ref: 'User',
            required: true,
        },
        participants: [
            {
                type: Schema.Types.ObjectId,
                ref: 'User',
            },
        ],
        code: {
            type: String,
            default: '',
            // No maxlength — code can be large
        },
        isActive: {
            type: Boolean,
            default: true,
        },
        maxParticipants: {
            type: Number,
            default: 10,
            min: [2, 'Room must allow at least 2 participants'],
            max: [20, 'Room cannot exceed 20 participants'],
        },
    },
    {
        timestamps: true, // adds createdAt, updatedAt automatically
    }
);

// Compound index: efficiently query "rooms user is part of"
roomSchema.index({ participants: 1, isActive: 1 });
// For dashboard: "rooms owned by user, sorted by recent"
roomSchema.index({ owner: 1, updatedAt: -1 });

export const Room = mongoose.model<IRoom>('Room', roomSchema);