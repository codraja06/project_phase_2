import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';

export type UserRole = 'citizen' | 'authority';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  phone?: string;
  password?: string;
  googleId?: string;
  avatar?: string;
  role: UserRole;
  isAdmin?: boolean;
  sessionVersion?: number;
  emailVerifiedAt?: Date | null;
  phoneVerifiedAt?: Date | null;
  phoneNormalized?: string;
  notificationPreferences?: { email: boolean; sms: boolean; smsConsentedAt?: Date | null };
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, default: '' },
    password: { type: String, required: false, minlength: 6 },
    googleId: { type: String, sparse: true },
    avatar: { type: String, default: '' },
    role: { type: String, enum: ['citizen', 'authority'], default: 'citizen' },
    isAdmin: { type: Boolean, default: false },
    sessionVersion: { type: Number, default: 0 },
    emailVerifiedAt: { type: Date, default: null },
    phoneVerifiedAt: { type: Date, default: null },
    phoneNormalized: { type: String },
    notificationPreferences: {
      email: { type: Boolean, default: true }, sms: { type: Boolean, default: false },
      smsConsentedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);
// Do not backfill this field on legacy accounts: pre-existing phone duplicates remain intact.
UserSchema.index({ phoneNormalized: 1 }, { unique: true, partialFilterExpression: { phoneNormalized: { $type: 'string' } } });

UserSchema.pre('save', async function (next) {
  if (!this.password || !this.isModified('password') || this.$locals.passwordIsHashed) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error: any) {
    next(error);
  }
});

UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

// Transform output to delete password
UserSchema.set('toJSON', {
  transform: function (_doc, ret: Record<string, any>) {
    delete ret.password;
    delete ret.__v;
    return ret;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
