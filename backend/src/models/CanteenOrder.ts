import mongoose, { Schema, Document, Types } from 'mongoose';
import { IAuditFields, auditSchemaDefinition } from './common.js';

export interface ICanteenOrder extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId: Types.ObjectId;
  studentName: string;
  grade: string;
  mealDate: string;
  mealSlot: 'breakfast' | 'lunch' | 'snacks' | 'dinner';
  mealName: string;
  amount: number;
  status: 'placed' | 'prepared' | 'served' | 'cancelled';
  dietaryTags: string[];
  notes?: string;
  createdBy?: Types.ObjectId;
  updatedBy?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const canteenOrderSchema = new Schema<ICanteenOrder>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
    studentName: { type: String, required: true },
    grade: { type: String, required: true },
    mealDate: { type: String, required: true },
    mealSlot: {
      type: String,
      enum: ['breakfast', 'lunch', 'snacks', 'dinner'],
      required: true,
    },
    mealName: { type: String, required: true },
    amount: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: ['placed', 'prepared', 'served', 'cancelled'],
      default: 'placed',
    },
    dietaryTags: [{ type: String }],
    notes: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    ...auditSchemaDefinition,
  },
  { timestamps: true }
);

canteenOrderSchema.index({ schoolId: 1, studentId: 1, mealDate: 1, mealSlot: 1 }, { unique: true });
canteenOrderSchema.index({ schoolId: 1, mealDate: -1, status: 1 });

export const CanteenOrder = mongoose.model<ICanteenOrder>('CanteenOrder', canteenOrderSchema);
