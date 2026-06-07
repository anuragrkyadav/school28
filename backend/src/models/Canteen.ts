import mongoose, { Schema, Types, Document } from 'mongoose';
import { auditSchemaDefinition, IAuditFields } from './common.js';

export interface IMessMenu extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  day: string; // 'Monday', 'Tuesday', etc.
  breakfast: string;
  breakfastNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    allergens: string[];
    dietaryTags: string[];
    price: number;
  };
  lunch: string;
  lunchNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    allergens: string[];
    dietaryTags: string[];
    price: number;
  };
  snacks: string;
  snacksNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    allergens: string[];
    dietaryTags: string[];
    price: number;
  };
  dinner: string;
  dinnerNutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    allergens: string[];
    dietaryTags: string[];
    price: number;
  };
}

const messMenuSchema = new Schema<IMessMenu>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    day: { type: String, required: true },
    breakfast: { type: String, required: true },
    breakfastNutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      allergens: [{ type: String }],
      dietaryTags: [{ type: String }],
      price: { type: Number, default: 0 },
    },
    lunch: { type: String, required: true },
    lunchNutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      allergens: [{ type: String }],
      dietaryTags: [{ type: String }],
      price: { type: Number, default: 0 },
    },
    snacks: { type: String, required: true },
    snacksNutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      allergens: [{ type: String }],
      dietaryTags: [{ type: String }],
      price: { type: Number, default: 0 },
    },
    dinner: { type: String, required: true },
    dinnerNutrition: {
      calories: { type: Number, default: 0 },
      protein: { type: Number, default: 0 },
      carbs: { type: Number, default: 0 },
      fat: { type: Number, default: 0 },
      allergens: [{ type: String }],
      dietaryTags: [{ type: String }],
      price: { type: Number, default: 0 },
    },
    ...auditSchemaDefinition,
  },
  { timestamps: true }
);

messMenuSchema.index({ schoolId: 1, day: 1 }, { unique: true });

export interface IStudentAllergy extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  grade: string;
  allergens: string[];
  severity: 'High' | 'Medium' | 'Low';
  status: 'Active' | 'Monitored';
}

const studentAllergySchema = new Schema<IStudentAllergy>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String, required: true },
    grade: { type: String, required: true },
    allergens: [{ type: String }],
    severity: { type: String, enum: ['High', 'Medium', 'Low'], required: true },
    status: { type: String, enum: ['Active', 'Monitored'], default: 'Active' },
    ...auditSchemaDefinition,
  },
  { timestamps: true }
);

studentAllergySchema.index({ schoolId: 1, studentName: 1 });

export interface IRFIDWallet extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  grade: string;
  rfidTag: string;
  balance: number;
  status: 'Active' | 'Frozen';
}

const rfidWalletSchema = new Schema<IRFIDWallet>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentId: { type: Schema.Types.ObjectId, ref: 'Student' },
    studentName: { type: String, required: true },
    grade: { type: String, required: true },
    rfidTag: { type: String, required: true },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['Active', 'Frozen'], default: 'Active' },
    ...auditSchemaDefinition,
  },
  { timestamps: true }
);

rfidWalletSchema.index({ schoolId: 1, rfidTag: 1 }, { unique: true });

export interface IRFIDTransaction extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentName: string;
  grade: string;
  rfidTag: string;
  amount: number;
  item: string;
  type: 'Debit' | 'Credit';
  meta?: {
    mealSlot?: string;
    mealDate?: string;
    orderId?: string;
  };
  timestamp: Date;
}

const rfidTransactionSchema = new Schema<IRFIDTransaction>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: 'School', required: true },
    studentName: { type: String, required: true },
    grade: { type: String, required: true },
    rfidTag: { type: String, required: true },
    amount: { type: Number, required: true },
    item: { type: String, required: true },
    type: { type: String, enum: ['Debit', 'Credit'], required: true },
    meta: {
      mealSlot: { type: String },
      mealDate: { type: String },
      orderId: { type: String },
    },
    timestamp: { type: Date, default: Date.now },
    ...auditSchemaDefinition,
  },
  { timestamps: true }
);

rfidTransactionSchema.index({ schoolId: 1, timestamp: -1 });

export const MessMenu = mongoose.model<IMessMenu>('MessMenu', messMenuSchema);
export const StudentAllergy = mongoose.model<IStudentAllergy>('StudentAllergy', studentAllergySchema);
export const RFIDWallet = mongoose.model<IRFIDWallet>('RFIDWallet', rfidWalletSchema);
export const RFIDTransaction = mongoose.model<IRFIDTransaction>('RFIDTransaction', rfidTransactionSchema);
