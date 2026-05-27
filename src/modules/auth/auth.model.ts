import { Schema, model, Model, Document } from 'mongoose';

/**
 * User Schema & Model
 *
 * Why separate model from service?
 * - Model = Database schema + basic queries (find, create, update, delete)
 * - Service = Business logic (register, login, validation)
 * - Clean separation of concerns
 *
 * Each module has its own model file:
 * - auth/auth.model.ts (User model)
 * - rooms/rooms.model.ts (Room model)
 * - chat/chat.model.ts (Message model)
 * etc.
 */

// ========== USER INTERFACE ==========
// TypeScript interface for type safety

export interface IUser extends Document {
  email: string;
  username: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt?: Date;

  // Instance methods
  toJSON(): any;
}

// Static methods interface - extend standard Mongoose methods
interface IUserModel extends Model<IUser> {
  findByEmail(email: string): Promise<IUser | null>;
  findByUsername(username: string): Promise<IUser | null>;
}

// ========== USER SCHEMA ==========
/**
 * MongoDB Schema Definition
 *
 * Why Mongoose?
 * - Schema validation at application layer
 * - Type casting (string, number, etc.)
 * - Middleware hooks (before save, after find, etc.)
 * - Built-in query builder
 */

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true, // No duplicate emails
      lowercase: true, // Normalize: "User@EXAMPLE.COM" → "user@example.com"
      trim: true,
      match: /^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/, // Email regex validation
    },
    username: {
      type: String,
      required: true,
      unique: true, // No duplicate usernames
      minlength: 3,
      maxlength: 30,
      trim: true,
      match: /^[a-zA-Z0-9_]+$/, // Only alphanumeric and underscore
    },
    passwordHash: {
      type: String,
      required: true,
      minlength: 20, // Bcrypt hashes are ~60 chars, 20 is minimum
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Auto-manages createdAt and updatedAt
    collection: 'users', // Explicit collection name
  }
);

// ========== INDEXES ==========
/**
 * Database Indexes
 *
 * Why indexes?
 * - Speed up queries dramatically
 * - Email and username lookups are frequent
 * - Important for free-tier to perform well
 *
 * Without index: O(n) scan of all documents
 * With index: O(log n) binary search
 *
 * Example: 10,000 users
 * Without index: scan 10,000 docs
 * With index: scan ~14 docs (log2(10000) ≈ 14)
 */

userSchema.index({ email: 1 }); // Find by email
userSchema.index({ username: 1 }); // Find by username
userSchema.index({ createdAt: -1 }); // Sort by creation date

// ========== INSTANCE METHODS ==========
/**
 * Custom methods on user documents
 *
 * Usage:
 * const user = await User.findById(id);
 * const json = user.toJSON();  // ← Custom method
 */

userSchema.methods.toJSON = function (this: IUser) {
  const obj = this.toObject();
  // Never return password hash to frontend
  delete obj.passwordHash;
  return obj;
};

// ========== STATIC METHODS ==========
/**
 * Custom static methods on User model
 *
 * Usage:
 * const user = await User.findByEmail('user@example.com');  // ← Static method
 */

userSchema.statics.findByEmail = async function (email: string) {
  return this.findOne({ email: email.toLowerCase() });
};

userSchema.statics.findByUsername = async function (username: string) {
  return this.findOne({ username: username.toLowerCase() });
};

// ========== MIDDLEWARE HOOKS ==========
/**
 * Pre-save hook
 *
 * Runs before every save operation
 * Useful for: normalization, validation, hashing
 *
 * Example: Could hash password here if we wanted
 * But we do it in service instead (separation of concerns)
 */

userSchema.pre('save', function (this: IUser, next) {
  // Auto-normalize email on save
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  next();
});

// ========== MODEL EXPORT ==========
/**
 * Create and export User model
 *
 * Model = Schema + database operations
 * Usage: User.create(), User.find(), User.findById(), etc.
 */

const User = model<IUser, IUserModel>('User', userSchema);

export default User;

/**
 * Usage Examples:
 *
 * Create:
 * const user = await User.create({
 *   email: 'user@example.com',
 *   username: 'john_doe',
 *   passwordHash: '$2b$10$...'
 * });
 *
 * Find by email:
 * const user = await User.findByEmail('user@example.com');
 *
 * Find by username:
 * const user = await User.findByUsername('john_doe');
 *
 * Update:
 * user.lastLoginAt = new Date();
 * await user.save();
 *
 * Delete:
 * await User.deleteOne({ _id: userId });
 *
 * Find all:
 * const users = await User.find();
 *
 * Pagination:
 * const users = await User.find()
 *   .limit(10)
 *   .skip(10)
 *   .sort({ createdAt: -1 });
 */
