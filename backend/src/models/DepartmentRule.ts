import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentRule extends Document {
  category: string;
  department: string;
  enabled: boolean;
  updatedBy: mongoose.Types.ObjectId;
  municipality?: string;
  verificationStatus?: 'proposed' | 'verified';
  sourceNote?: string;
}

const schema = new Schema<IDepartmentRule>({
  category: { type: String, required: true, unique: true, lowercase: true, trim: true },
  department: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  municipality: { type: String, trim: true, maxlength: 160, default: '' },
  verificationStatus: { type: String, enum: ['proposed', 'verified'], default: 'proposed' },
  sourceNote: { type: String, trim: true, maxlength: 500, default: '' },
}, { timestamps: true });

export const DepartmentRule = mongoose.model<IDepartmentRule>('DepartmentRule', schema);
