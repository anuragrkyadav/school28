import mongoose, { Schema, Document } from 'mongoose';
import { IAuditFields, auditSchemaDefinition } from './common.js';

export interface ICandidate extends Document, IAuditFields {
  name: string;
  grade: string;
  votes: string;
  avatar: string;
}

const candidateSchema = new Schema<ICandidate>(
  {
    name: { type: String, required: true },
    grade: { type: String, required: true },
    votes: { type: String, required: true },
    avatar: { type: String, required: true },
    ...auditSchemaDefinition,
  },
  { timestamps: true }
);

export const Candidate = mongoose.model<ICandidate>('Candidate', candidateSchema);
