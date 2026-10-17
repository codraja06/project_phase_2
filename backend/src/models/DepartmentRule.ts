import mongoose, { Schema, Document } from 'mongoose';

export interface IDepartmentRule extends Document {
  category: string;
  department: string;
  enabled: boolean;
  updatedBy: mongoose.Types.ObjectId;
}

const schema = new Schema<IDepartmentRule>({
  category: { type: String, required: true, unique: true, lowercase: true, trim: true },
  department: { type: String, required: true, trim: true },
  enabled: { type: Boolean, default: true },
  updatedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });

export const DepartmentRule = mongoose.model<IDepartmentRule>('DepartmentRule', schema);
