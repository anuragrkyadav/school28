import mongoose, { Document, Schema, Types } from "mongoose";
import { auditSchemaDefinition, IAuditFields } from "./common.js";

export type MedicationStatus = "ACTIVE" | "PAUSED" | "COMPLETED";
export type VisitStatus = "Resting in Infirmary" | "Discharged to Class" | "Sent Home with Parent";
export type VaccinationStatus = "Fully Vaccinated" | "Pending Doses" | "Exempt";
export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type AlertStatus = "QUEUED" | "SENT" | "FAILED";
export type ClearanceStatus = "CLEARED" | "FOLLOW_UP" | "RESTRICTED";

export interface IStudentHealthProfile extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  grade: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  vaccinationStatus: VaccinationStatus;
  parentName: string;
  emergencyContact: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IVaccinationRecord extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  vaccineName: string;
  doseNumber: string;
  administrationDate: Date;
  nextDueDate?: Date;
  provider?: string;
  status: VaccinationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IClinicVisitLog extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  grade: string;
  visitDate: Date;
  temperature?: string;
  symptoms: string;
  treatment: string;
  status: VisitStatus;
  guardianNotified: boolean;
  nurseName?: string;
  doctorName?: string;
  followUpRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IMedicationRecord extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  prescribedBy?: string;
  startDate?: Date;
  endDate?: Date;
  status: MedicationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IIncidentReport extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  incidentDate: Date;
  location?: string;
  severity: IncidentSeverity;
  description: string;
  actionTaken: string;
  reportedBy: string;
  parentNotified: boolean;
  status: "OPEN" | "RESOLVED" | "ESCALATED";
  createdAt: Date;
  updatedAt: Date;
}

export interface IHealthAlert extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  parentName: string;
  parentContact: string;
  alertType: string;
  channel: "SMS" | "APP" | "EMAIL";
  message: string;
  status: AlertStatus;
  sentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IAnnualHealthCheckup extends Document, IAuditFields {
  schoolId: Types.ObjectId;
  studentId?: Types.ObjectId;
  studentName: string;
  academicYear: string;
  checkupDate: Date;
  provider?: string;
  heightCm?: string;
  weightKg?: string;
  vision?: string;
  hearing?: string;
  clearanceStatus: ClearanceStatus;
  followUpDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const profileSchema = new Schema<IStudentHealthProfile>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    bloodGroup: { type: String, required: true, trim: true },
    allergies: [{ type: String, trim: true }],
    chronicConditions: [{ type: String, trim: true }],
    vaccinationStatus: {
      type: String,
      enum: ["Fully Vaccinated", "Pending Doses", "Exempt"],
      default: "Pending Doses",
    },
    parentName: { type: String, required: true, trim: true },
    emergencyContact: { type: String, required: true, trim: true },
    notes: { type: String },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

const vaccinationSchema = new Schema<IVaccinationRecord>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    vaccineName: { type: String, required: true, trim: true },
    doseNumber: { type: String, required: true, trim: true },
    administrationDate: { type: Date, required: true },
    nextDueDate: { type: Date },
    provider: { type: String, trim: true },
    status: {
      type: String,
      enum: ["Fully Vaccinated", "Pending Doses", "Exempt"],
      default: "Pending Doses",
    },
    notes: { type: String },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

const clinicVisitSchema = new Schema<IClinicVisitLog>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    grade: { type: String, required: true, trim: true },
    visitDate: { type: Date, required: true, default: Date.now },
    temperature: { type: String, trim: true },
    symptoms: { type: String, required: true },
    treatment: { type: String, required: true },
    status: {
      type: String,
      enum: ["Resting in Infirmary", "Discharged to Class", "Sent Home with Parent"],
      default: "Discharged to Class",
    },
    guardianNotified: { type: Boolean, default: false },
    nurseName: { type: String, trim: true },
    doctorName: { type: String, trim: true },
    followUpRequired: { type: Boolean, default: false },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

const medicationSchema = new Schema<IMedicationRecord>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    medicationName: { type: String, required: true, trim: true },
    dosage: { type: String, required: true, trim: true },
    frequency: { type: String, required: true, trim: true },
    prescribedBy: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    status: {
      type: String,
      enum: ["ACTIVE", "PAUSED", "COMPLETED"],
      default: "ACTIVE",
    },
    notes: { type: String },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

const incidentSchema = new Schema<IIncidentReport>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    incidentDate: { type: Date, required: true, default: Date.now },
    location: { type: String, trim: true },
    severity: {
      type: String,
      enum: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      default: "MEDIUM",
    },
    description: { type: String, required: true },
    actionTaken: { type: String, required: true },
    reportedBy: { type: String, required: true, trim: true },
    parentNotified: { type: Boolean, default: false },
    status: { type: String, enum: ["OPEN", "RESOLVED", "ESCALATED"], default: "OPEN" },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

const alertSchema = new Schema<IHealthAlert>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    parentName: { type: String, required: true, trim: true },
    parentContact: { type: String, required: true, trim: true },
    alertType: { type: String, required: true, trim: true },
    channel: { type: String, enum: ["SMS", "APP", "EMAIL"], default: "SMS" },
    message: { type: String, required: true },
    status: { type: String, enum: ["QUEUED", "SENT", "FAILED"], default: "QUEUED" },
    sentAt: { type: Date },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

const annualCheckupSchema = new Schema<IAnnualHealthCheckup>(
  {
    schoolId: { type: Schema.Types.ObjectId, ref: "School", required: true, index: true },
    studentId: { type: Schema.Types.ObjectId, ref: "Student" },
    studentName: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    checkupDate: { type: Date, required: true, default: Date.now },
    provider: { type: String, trim: true },
    heightCm: { type: String, trim: true },
    weightKg: { type: String, trim: true },
    vision: { type: String, trim: true },
    hearing: { type: String, trim: true },
    clearanceStatus: {
      type: String,
      enum: ["CLEARED", "FOLLOW_UP", "RESTRICTED"],
      default: "CLEARED",
    },
    followUpDate: { type: Date },
    notes: { type: String },
    ...auditSchemaDefinition,
  },
  { timestamps: true },
);

profileSchema.index({ schoolId: 1, studentName: 1 });
vaccinationSchema.index({ schoolId: 1, studentName: 1, administrationDate: -1 });
clinicVisitSchema.index({ schoolId: 1, studentName: 1, visitDate: -1 });
medicationSchema.index({ schoolId: 1, studentName: 1, status: 1 });
incidentSchema.index({ schoolId: 1, studentName: 1, incidentDate: -1 });
alertSchema.index({ schoolId: 1, studentName: 1, createdAt: -1 });
annualCheckupSchema.index({ schoolId: 1, studentName: 1, checkupDate: -1 });

export const StudentHealthProfile = mongoose.model<IStudentHealthProfile>(
  "StudentHealthProfile",
  profileSchema,
);
export const VaccinationRecord = mongoose.model<IVaccinationRecord>(
  "VaccinationRecord",
  vaccinationSchema,
);
export const ClinicVisitLog = mongoose.model<IClinicVisitLog>("ClinicVisitLog", clinicVisitSchema);
export const MedicationRecord = mongoose.model<IMedicationRecord>(
  "MedicationRecord",
  medicationSchema,
);
export const IncidentReport = mongoose.model<IIncidentReport>("IncidentReport", incidentSchema);
export const HealthAlert = mongoose.model<IHealthAlert>("HealthAlert", alertSchema);
export const AnnualHealthCheckup = mongoose.model<IAnnualHealthCheckup>(
  "AnnualHealthCheckup",
  annualCheckupSchema,
);
