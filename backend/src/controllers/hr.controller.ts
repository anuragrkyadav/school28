import type { Request, Response, NextFunction } from 'express';
import { sendResponse } from '../utils/response.js';
import { LeaveRequest } from '../models/LeaveRequest.js';
import { Employee } from '../models/Employee.js';
import { User } from '../models/User.js';
import { Types } from 'mongoose';

const DEFAULT_SCHOOL_ID = '000000000000000000000001';
const DEFAULT_USER_ID = '000000000000000000000001';

function normalizeLeaveType(input?: string): 'SICK' | 'CASUAL' | 'EARNED' | 'MATERNITY' | 'OTHER' {
  if (!input) return 'CASUAL';

  const normalized = input.toUpperCase().replace(' LEAVE', '').replace('/PATERNITY', '').trim();

  if (normalized === 'DUTY') return 'EARNED';
  if (normalized === 'UNPAID') return 'OTHER';
  if (['SICK', 'CASUAL', 'EARNED', 'MATERNITY', 'OTHER'].includes(normalized)) {
    return normalized as 'SICK' | 'CASUAL' | 'EARNED' | 'MATERNITY' | 'OTHER';
  }

  return 'OTHER';
}

function getDisplayLeaveType(backendType: string): string {
  switch (backendType) {
    case 'SICK':
      return 'Sick Leave';
    case 'CASUAL':
      return 'Casual Leave';
    case 'EARNED':
      return 'Duty Leave';
    case 'MATERNITY':
      return 'Maternity/Paternity Leave';
    default:
      return 'Other Leave';
  }
}

function formatLeaveResponse(leave: any, employee: any, userDoc: any, approverDoc: any) {
  const displayType = getDisplayLeaveType(leave.leaveType);
  const startISO = !isNaN(leave.startDate?.getTime()) ? leave.startDate.toISOString() : new Date().toISOString();
  const endISO = !isNaN(leave.endDate?.getTime()) ? leave.endDate.toISOString() : new Date().toISOString();
  const createdISO = !isNaN(leave.createdAt?.getTime()) ? leave.createdAt.toISOString() : new Date().toISOString();
  const updatedISO = !isNaN(leave.updatedAt?.getTime()) ? leave.updatedAt.toISOString() : new Date().toISOString();

  return {
    id: leave._id.toString(),
    _id: leave._id.toString(),
    staff_id: employee ? employee.userId.toString() : '',
    staffId: employee ? employee.userId.toString() : '',
    staff_name: userDoc ? `${userDoc.firstName} ${userDoc.lastName}`.trim() : 'Unknown Staff',
    staffName: userDoc ? `${userDoc.firstName} ${userDoc.lastName}`.trim() : 'Unknown Staff',
    leave_type: leave.leaveType.toLowerCase(),
    leaveType: displayType,
    type: displayType,
    start_date: startISO.split('T')[0],
    startDate: startISO,
    from: startISO,
    end_date: endISO.split('T')[0],
    endDate: endISO,
    to: endISO,
    reason: leave.reason,
    status: leave.status.toLowerCase(),
    approved_by: approverDoc ? `${approverDoc.firstName} ${approverDoc.lastName}`.trim() : null,
    approvedBy: approverDoc ? `${approverDoc.firstName} ${approverDoc.lastName}`.trim() : null,
    created_at: createdISO,
    createdAt: createdISO,
    appliedOn: createdISO,
    updated_at: updatedISO,
    updatedAt: updatedISO,
  };
}

async function getOrCreateEmployee(schoolId: Types.ObjectId, userId: Types.ObjectId) {
  let emp = await Employee.findOne({ schoolId, userId });
  if (!emp) {
    emp = new Employee({
      schoolId,
      userId,
      employeeId: `EMP_${userId.toString().slice(-6).toUpperCase()}`,
      employeeType: 'TEACHING',
      designation: 'Faculty',
      joiningDate: new Date(),
      createdBy: userId,
      updatedBy: userId,
    });
    await emp.save();
  }
  return emp;
}

export class HRController {
  static async createLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = req.user?.schoolId || DEFAULT_SCHOOL_ID;
      const userId = req.user?.id || DEFAULT_USER_ID;
      const { staff_id, staff_name, leave_type, leaveType, start_date, startDate, end_date, endDate, reason } = req.body;

      const sId = new Types.ObjectId(schoolId as string);
      let targetUserId: Types.ObjectId;

      if (staff_id) {
        if (typeof staff_id !== 'string' || !Types.ObjectId.isValid(staff_id)) {
          res.status(400).json({ success: false, message: 'Invalid staff_id' });
          return;
        }
        targetUserId = new Types.ObjectId(staff_id);
      } else {
        targetUserId = new Types.ObjectId(userId as string);
      }

      const employee = await getOrCreateEmployee(sId, targetUserId);
      const backendType = normalizeLeaveType(leave_type || leaveType);
      const sDate = start_date || startDate;
      const eDate = end_date || endDate;

      if (!sDate || !eDate) {
        res.status(400).json({ success: false, message: 'Start date and end date are required' });
        return;
      }

      const parsedStartDate = new Date(sDate);
      const parsedEndDate = new Date(eDate);
      if (isNaN(parsedStartDate.getTime()) || isNaN(parsedEndDate.getTime())) {
        res.status(400).json({ success: false, message: 'Invalid start date or end date format' });
        return;
      }

      const leave = new LeaveRequest({
        schoolId: sId,
        employeeId: employee._id,
        leaveType: backendType,
        startDate: parsedStartDate,
        endDate: parsedEndDate,
        reason: reason || '',
        status: 'PENDING',
        createdBy: new Types.ObjectId(userId as string),
        updatedBy: new Types.ObjectId(userId as string),
      });

      await leave.save();

      const userDoc = await User.findById(targetUserId);
      const responsePayload = {
        ...formatLeaveResponse(leave, employee, userDoc, null),
        staff_name: staff_name || (userDoc ? `${userDoc.firstName} ${userDoc.lastName}`.trim() : 'Staff'),
        staffName: staff_name || (userDoc ? `${userDoc.firstName} ${userDoc.lastName}`.trim() : 'Staff'),
        start_date: leave.startDate.toISOString().split('T')[0],
        end_date: leave.endDate.toISOString().split('T')[0],
        approved_by: null,
        approvedBy: null,
      };

      sendResponse(res, 201, 'Leave request created successfully', responsePayload);
    } catch (error) {
      next(error);
    }
  }

  static async getLeaveRequests(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = req.user?.schoolId || DEFAULT_SCHOOL_ID;
      const { staffId, status } = req.query;

      const sId = new Types.ObjectId(schoolId as string);
      const match: any = { schoolId: sId };

      if (status && typeof status === 'string') {
        match.status = status.toUpperCase();
      }

      if (staffId && typeof staffId === 'string') {
        if (!Types.ObjectId.isValid(staffId)) {
          res.status(400).json({ success: false, message: 'Invalid staffId parameter' });
          return;
        }

        const employee = await Employee.findOne({ schoolId: sId, userId: new Types.ObjectId(staffId) });
        if (employee) {
          match.employeeId = employee._id;
        } else {
          sendResponse(res, 200, 'Leave requests retrieved', []);
          return;
        }
      }

      const leaves = await LeaveRequest.find(match).sort({ createdAt: -1 });
      const formatted: any[] = [];

      for (const leave of leaves) {
        const emp = await Employee.findById(leave.employeeId);
        const userDoc = emp ? await User.findById(emp.userId) : null;
        const approverDoc = leave.approvedBy ? await User.findById(leave.approvedBy) : null;
        formatted.push(formatLeaveResponse(leave, emp, userDoc, approverDoc));
      }

      sendResponse(res, 200, 'Leave requests retrieved', formatted);
    } catch (error) {
      next(error);
    }
  }

  static async approveLeaveRequest(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = req.user?.schoolId || DEFAULT_SCHOOL_ID;
      const userId = req.user?.id || DEFAULT_USER_ID;
      const { id } = req.params;
      const { approvedBy } = req.body;

      if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid leave request id' });
        return;
      }

      const sId = new Types.ObjectId(schoolId as string);
      const leave = await LeaveRequest.findOne({ schoolId: sId, _id: new Types.ObjectId(id as string) });

      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave request not found' });
        return;
      }

      leave.status = 'APPROVED';
      leave.approvedBy = new Types.ObjectId(userId as string);
      await leave.save();

      const emp = await Employee.findById(leave.employeeId);
      const userDoc = emp ? await User.findById(emp.userId) : null;
      const approverDoc = await User.findById(leave.approvedBy);
      const responsePayload = formatLeaveResponse(leave, emp, userDoc, approverDoc);

      sendResponse(res, 200, 'Leave request approved successfully', {
        ...responsePayload,
        approved_by: approverDoc ? responsePayload.approved_by : approvedBy || req.user?.fullName || 'Admin',
        approvedBy: approverDoc ? responsePayload.approvedBy : approvedBy || req.user?.fullName || 'Admin',
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateLeaveStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = req.user?.schoolId || DEFAULT_SCHOOL_ID;
      const userId = req.user?.id || DEFAULT_USER_ID;
      const { id } = req.params;
      const { status, rejectionReason } = req.body;

      if (typeof id !== 'string' || !Types.ObjectId.isValid(id)) {
        res.status(400).json({ success: false, message: 'Invalid leave request id' });
        return;
      }

      const sId = new Types.ObjectId(schoolId as string);
      const leave = await LeaveRequest.findOne({ schoolId: sId, _id: new Types.ObjectId(id as string) });

      if (!leave) {
        res.status(404).json({ success: false, message: 'Leave request not found' });
        return;
      }

      const upperStatus = (status || 'PENDING').toUpperCase();
      if (upperStatus === 'APPROVED') {
        leave.status = 'APPROVED';
        leave.approvedBy = new Types.ObjectId(userId as string);
      } else if (upperStatus === 'REJECTED') {
        leave.status = 'REJECTED';
        leave.rejectionReason = rejectionReason || '';
      } else {
        leave.status = 'PENDING';
      }

      await leave.save();

      const emp = await Employee.findById(leave.employeeId);
      const userDoc = emp ? await User.findById(emp.userId) : null;
      const approverDoc = leave.approvedBy ? await User.findById(leave.approvedBy) : null;
      sendResponse(res, 200, 'Leave request updated successfully', formatLeaveResponse(leave, emp, userDoc, approverDoc));
    } catch (error) {
      next(error);
    }
  }
}
