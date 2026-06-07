import mongoose, { Schema, Types, Document } from 'mongoose';
import { auditSchemaDefinition, IAuditFields } from './common.js';

export interface ITransportTripLog extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  routeId: Types.ObjectId;
  routeNo: string;
  busNo: string;
  startedAt: Date;
  endedAt?: Date;
  status: 'ACTIVE' | 'COMPLETED';
  lastLat?: number;
  lastLng?: number;
  createdAt: Date;
  updatedAt: Date;
}

const transportTripLogSchema = new Schema<ITransportTripLog>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    routeId: { type: Schema.Types.ObjectId, ref: 'TransportRoute', required: true },
    routeNo: { type: String, required: true },
    busNo: { type: String, required: true },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    status: { type: String, enum: ['ACTIVE', 'COMPLETED'], default: 'ACTIVE' },
    lastLat: { type: Number },
    lastLng: { type: Number },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

transportTripLogSchema.index({ schoolId: 1, routeId: 1, status: 1, startedAt: -1 });

export const TransportTripLog = mongoose.model<ITransportTripLog>('TransportTripLog', transportTripLogSchema);
