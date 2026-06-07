import mongoose, { Schema, Document, Types } from 'mongoose';
import { IAuditFields, auditSchemaDefinition } from './common.js';

export interface ILibraryReservation extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  bookId: Types.ObjectId;
  studentId: Types.ObjectId;
  studentName: string;
  bookTitle: string;
  reservedAt: Date;
  expiresAt: Date;
  status: 'active' | 'fulfilled' | 'cancelled' | 'expired';
  note?: string;
}

const libraryReservationSchema = new Schema<ILibraryReservation>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    bookId: { type: Schema.Types.ObjectId, ref: 'LibraryBook', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    studentName: { type: String, required: true },
    bookTitle: { type: String, required: true },
    reservedAt: { type: Date, default: Date.now, required: true },
    expiresAt: { type: Date, required: true },
    status: { type: String, enum: ['active', 'fulfilled', 'cancelled', 'expired'], default: 'active', required: true },
    note: { type: String },
    ...auditSchemaDefinition
  },
  { timestamps: true }
);

libraryReservationSchema.index({ schoolId: 1, bookId: 1, status: 1 });
libraryReservationSchema.index({ schoolId: 1, studentId: 1, status: 1 });

export const LibraryReservation = mongoose.model<ILibraryReservation>('LibraryReservation', libraryReservationSchema);
