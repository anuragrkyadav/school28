import type { Request, Response } from "express";
import { Types } from "mongoose";
import { sendResponse } from "../utils/response.js";
import {
  AnnualHealthCheckup,
  ClinicVisitLog,
  HealthAlert,
  IncidentReport,
  MedicationRecord,
  StudentHealthProfile,
  VaccinationRecord,
} from "../models/Medical.js";

type MedicalCategory =
  | "profiles"
  | "vaccinations"
  | "visits"
  | "medications"
  | "incidents"
  | "alerts"
  | "checkups";

const categoryLabelMap: Record<MedicalCategory, string> = {
  profiles: "Student health profiles",
  vaccinations: "Vaccination records",
  visits: "Clinic visit logs",
  medications: "Medication tracker entries",
  incidents: "Incident reports",
  alerts: "Health alerts",
  checkups: "Annual health checkups",
};

function resolveSchoolId(req: Request): string | undefined {
  return (
    req.user?.schoolId ||
    (req.query.schoolId as string | undefined) ||
    (req.body.schoolId as string | undefined)
  );
}

function parseList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
}

function toObjectId(value?: string): Types.ObjectId | undefined {
  if (!value) return undefined;
  return new Types.ObjectId(value);
}

function buildDashboardSummary(data: {
  profiles: any[];
  vaccinations: any[];
  visits: any[];
  medications: any[];
  incidents: any[];
  alerts: any[];
  checkups: any[];
}) {
  return {
    profiles: data.profiles.length,
    vaccinations: data.vaccinations.length,
    visits: data.visits.length,
    medications: data.medications.filter((item) => item.status === "ACTIVE").length,
    incidents: data.incidents.length,
    alerts: data.alerts.filter((item) => item.status === "SENT").length,
    checkups: data.checkups.length,
    followUps: data.checkups.filter((item) => item.clearanceStatus !== "CLEARED").length,
  };
}

export async function getMedicalDashboard(req: Request, res: Response): Promise<Response> {
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    return sendResponse(res, 400, "School context is required", null);
  }

  const schoolObjectId = toObjectId(schoolId);
  if (!schoolObjectId) {
    return sendResponse(res, 400, "Invalid school id", null);
  }

  const [profiles, vaccinations, visits, medications, incidents, alerts, checkups] =
    await Promise.all([
      StudentHealthProfile.find({ schoolId: schoolObjectId, isDeleted: false }).sort({
        createdAt: -1,
      }),
      VaccinationRecord.find({ schoolId: schoolObjectId, isDeleted: false }).sort({
        administrationDate: -1,
      }),
      ClinicVisitLog.find({ schoolId: schoolObjectId, isDeleted: false }).sort({ visitDate: -1 }),
      MedicationRecord.find({ schoolId: schoolObjectId, isDeleted: false }).sort({ createdAt: -1 }),
      IncidentReport.find({ schoolId: schoolObjectId, isDeleted: false }).sort({
        incidentDate: -1,
      }),
      HealthAlert.find({ schoolId: schoolObjectId, isDeleted: false }).sort({ createdAt: -1 }),
      AnnualHealthCheckup.find({ schoolId: schoolObjectId, isDeleted: false }).sort({
        checkupDate: -1,
      }),
    ]);

  return sendResponse(res, 200, "Health dashboard retrieved successfully", {
    profiles,
    vaccinations,
    visits,
    medications,
    incidents,
    alerts,
    checkups,
    summary: buildDashboardSummary({
      profiles,
      vaccinations,
      visits,
      medications,
      incidents,
      alerts,
      checkups,
    }),
  });
}

export async function createMedicalRecord(req: Request, res: Response): Promise<Response> {
  const schoolId = resolveSchoolId(req);
  if (!schoolId) {
    return sendResponse(res, 400, "School context is required", null);
  }

  const schoolObjectId = toObjectId(schoolId);
  if (!schoolObjectId) {
    return sendResponse(res, 400, "Invalid school id", null);
  }

  const category = req.params.category as MedicalCategory;
  const createdBy = req.user?.id ? new Types.ObjectId(req.user.id) : undefined;
  const updatedBy = createdBy;

  const studentId = toObjectId((req.body.studentId as string | undefined) || undefined);

  let record: any;

  switch (category) {
    case "profiles":
      record = await StudentHealthProfile.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        grade: req.body.grade,
        bloodGroup: req.body.bloodGroup,
        allergies: parseList(req.body.allergies),
        chronicConditions: parseList(req.body.chronicConditions ?? req.body.conditions),
        vaccinationStatus: req.body.vaccinationStatus || "Pending Doses",
        parentName: req.body.parentName,
        emergencyContact: req.body.emergencyContact,
        notes: req.body.notes,
        createdBy,
        updatedBy,
      });
      break;
    case "vaccinations":
      record = await VaccinationRecord.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        vaccineName: req.body.vaccineName,
        doseNumber: req.body.doseNumber,
        administrationDate: req.body.administrationDate
          ? new Date(req.body.administrationDate)
          : new Date(),
        nextDueDate: req.body.nextDueDate ? new Date(req.body.nextDueDate) : undefined,
        provider: req.body.provider,
        status: req.body.status || "Pending Doses",
        notes: req.body.notes,
        createdBy,
        updatedBy,
      });
      break;
    case "visits":
      record = await ClinicVisitLog.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        grade: req.body.grade,
        visitDate: req.body.visitDate ? new Date(req.body.visitDate) : new Date(),
        temperature: req.body.temperature,
        symptoms: req.body.symptoms,
        treatment: req.body.treatment,
        status: req.body.status || "Discharged to Class",
        guardianNotified:
          req.body.guardianNotified === true || req.body.guardianNotified === "true",
        nurseName: req.body.nurseName,
        doctorName: req.body.doctorName,
        followUpRequired:
          req.body.followUpRequired === true || req.body.followUpRequired === "true",
        createdBy,
        updatedBy,
      });
      break;
    case "medications":
      record = await MedicationRecord.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        medicationName: req.body.medicationName,
        dosage: req.body.dosage,
        frequency: req.body.frequency,
        prescribedBy: req.body.prescribedBy,
        startDate: req.body.startDate ? new Date(req.body.startDate) : undefined,
        endDate: req.body.endDate ? new Date(req.body.endDate) : undefined,
        status: req.body.status || "ACTIVE",
        notes: req.body.notes,
        createdBy,
        updatedBy,
      });
      break;
    case "incidents":
      record = await IncidentReport.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        incidentDate: req.body.incidentDate ? new Date(req.body.incidentDate) : new Date(),
        location: req.body.location,
        severity: req.body.severity || "MEDIUM",
        description: req.body.description,
        actionTaken: req.body.actionTaken,
        reportedBy: req.body.reportedBy || req.user?.fullName || "Admin",
        parentNotified: req.body.parentNotified === true || req.body.parentNotified === "true",
        status: req.body.status || "OPEN",
        createdBy,
        updatedBy,
      });
      break;
    case "alerts":
      record = await HealthAlert.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        parentName: req.body.parentName,
        parentContact: req.body.parentContact,
        alertType: req.body.alertType,
        channel: req.body.channel || "SMS",
        message: req.body.message,
        status: req.body.status || "QUEUED",
        sentAt: req.body.sentAt
          ? new Date(req.body.sentAt)
          : req.body.status === "SENT"
            ? new Date()
            : undefined,
        createdBy,
        updatedBy,
      });
      break;
    case "checkups":
      record = await AnnualHealthCheckup.create({
        schoolId: schoolObjectId,
        studentId,
        studentName: req.body.studentName,
        academicYear: req.body.academicYear,
        checkupDate: req.body.checkupDate ? new Date(req.body.checkupDate) : new Date(),
        provider: req.body.provider,
        heightCm: req.body.heightCm,
        weightKg: req.body.weightKg,
        vision: req.body.vision,
        hearing: req.body.hearing,
        clearanceStatus: req.body.clearanceStatus || "CLEARED",
        followUpDate: req.body.followUpDate ? new Date(req.body.followUpDate) : undefined,
        notes: req.body.notes,
        createdBy,
        updatedBy,
      });
      break;
    default:
      return sendResponse(res, 404, "Unknown health record category", null);
  }

  return sendResponse(res, 201, `${categoryLabelMap[category]} created successfully`, record);
}
