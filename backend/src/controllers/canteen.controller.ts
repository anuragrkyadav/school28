import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { sendResponse } from '../utils/response.js';
import { ApiError } from '../utils/api-error.js';
import { Class } from '../models/Class.js';
import { Section } from '../models/Section.js';
import { Student } from '../models/Student.js';
import { CanteenOrder } from '../models/CanteenOrder.js';
import { MessMenu, RFIDTransaction, RFIDWallet, StudentAllergy } from '../models/Canteen.js';

type MealSlot = 'breakfast' | 'lunch' | 'snacks' | 'dinner';

type MealNutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  allergens: string[];
  dietaryTags: string[];
  price: number;
};

type MenuSeed = {
  day: string;
  breakfast: string;
  breakfastNutrition: MealNutrition;
  lunch: string;
  lunchNutrition: MealNutrition;
  snacks: string;
  snacksNutrition: MealNutrition;
  dinner: string;
  dinnerNutrition: MealNutrition;
};

const WEEKLY_MENU: MenuSeed[] = [
  {
    day: 'Monday',
    breakfast: 'Poha with peanuts, banana, milk',
    breakfastNutrition: { calories: 320, protein: 10, carbs: 48, fat: 9, allergens: ['Peanuts', 'Dairy'], dietaryTags: ['vegetarian'], price: 35 },
    lunch: 'Rice, rajma, salad, curd',
    lunchNutrition: { calories: 560, protein: 18, carbs: 82, fat: 15, allergens: ['Dairy'], dietaryTags: ['vegetarian', 'high-fiber'], price: 70 },
    snacks: 'Fruit chaat and baked mathri',
    snacksNutrition: { calories: 220, protein: 4, carbs: 32, fat: 8, allergens: ['Gluten'], dietaryTags: ['vegetarian'], price: 25 },
    dinner: 'Chapati, mixed veg, dal tadka',
    dinnerNutrition: { calories: 540, protein: 19, carbs: 74, fat: 15, allergens: [], dietaryTags: ['vegetarian'], price: 80 },
  },
  {
    day: 'Tuesday',
    breakfast: 'Idli, sambar, chutney, fruit',
    breakfastNutrition: { calories: 300, protein: 9, carbs: 44, fat: 7, allergens: ['Coconut'], dietaryTags: ['vegetarian', 'light-meal'], price: 35 },
    lunch: 'Veg pulao, raita, papad',
    lunchNutrition: { calories: 520, protein: 14, carbs: 78, fat: 14, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 65 },
    snacks: 'Corn chaat, buttermilk',
    snacksNutrition: { calories: 210, protein: 5, carbs: 28, fat: 7, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 30 },
    dinner: 'Jeera rice, paneer curry, salad',
    dinnerNutrition: { calories: 580, protein: 21, carbs: 72, fat: 19, allergens: ['Dairy'], dietaryTags: ['vegetarian', 'protein-rich'], price: 85 },
  },
  {
    day: 'Wednesday',
    breakfast: 'Aloo paratha, curd, pickle',
    breakfastNutrition: { calories: 430, protein: 12, carbs: 58, fat: 16, allergens: ['Gluten', 'Dairy'], dietaryTags: ['vegetarian'], price: 40 },
    lunch: 'Chapati, chole, salad, rice',
    lunchNutrition: { calories: 610, protein: 22, carbs: 88, fat: 16, allergens: [], dietaryTags: ['vegetarian', 'high-protein'], price: 75 },
    snacks: 'Milkshake and vegetable puff',
    snacksNutrition: { calories: 260, protein: 6, carbs: 34, fat: 10, allergens: ['Dairy', 'Gluten'], dietaryTags: ['vegetarian'], price: 35 },
    dinner: 'Lemon rice, veg kurma, curd rice',
    dinnerNutrition: { calories: 540, protein: 16, carbs: 76, fat: 15, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 75 },
  },
  {
    day: 'Thursday',
    breakfast: 'Upma, coconut chutney, fruit',
    breakfastNutrition: { calories: 280, protein: 8, carbs: 42, fat: 8, allergens: ['Coconut'], dietaryTags: ['vegetarian'], price: 30 },
    lunch: 'Roti, dal fry, aloo gobi, salad',
    lunchNutrition: { calories: 560, protein: 18, carbs: 75, fat: 17, allergens: [], dietaryTags: ['vegetarian'], price: 70 },
    snacks: 'Sprouts bowl and jaggery chikki',
    snacksNutrition: { calories: 240, protein: 9, carbs: 28, fat: 9, allergens: ['Peanuts'], dietaryTags: ['vegetarian', 'high-protein'], price: 30 },
    dinner: 'Khichdi, kadhi, papad',
    dinnerNutrition: { calories: 500, protein: 16, carbs: 68, fat: 14, allergens: ['Dairy'], dietaryTags: ['vegetarian', 'comfort-food'], price: 65 },
  },
  {
    day: 'Friday',
    breakfast: 'Dosa, potato filling, sambar',
    breakfastNutrition: { calories: 310, protein: 9, carbs: 45, fat: 9, allergens: ['Coconut'], dietaryTags: ['vegetarian'], price: 35 },
    lunch: 'Veg biryani, cucumber raita, salad',
    lunchNutrition: { calories: 640, protein: 17, carbs: 88, fat: 20, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 80 },
    snacks: 'Tea, roasted makhana, fruit',
    snacksNutrition: { calories: 190, protein: 5, carbs: 24, fat: 7, allergens: [], dietaryTags: ['vegetarian', 'light-meal'], price: 25 },
    dinner: 'Naan, paneer butter masala, rice',
    dinnerNutrition: { calories: 680, protein: 23, carbs: 82, fat: 24, allergens: ['Dairy', 'Gluten'], dietaryTags: ['vegetarian'], price: 90 },
  },
  {
    day: 'Saturday',
    breakfast: 'Bread toast, omelette option, juice',
    breakfastNutrition: { calories: 340, protein: 13, carbs: 36, fat: 14, allergens: ['Gluten', 'Eggs'], dietaryTags: ['mixed'], price: 40 },
    lunch: 'Rice, dal makhani, mixed veg, salad',
    lunchNutrition: { calories: 600, protein: 20, carbs: 80, fat: 18, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 75 },
    snacks: 'Fruit bowl and yogurt',
    snacksNutrition: { calories: 180, protein: 6, carbs: 22, fat: 6, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 25 },
    dinner: 'Pav bhaji, salad, dessert',
    dinnerNutrition: { calories: 620, protein: 14, carbs: 86, fat: 20, allergens: ['Gluten', 'Dairy'], dietaryTags: ['vegetarian'], price: 80 },
  },
  {
    day: 'Sunday',
    breakfast: 'Pancakes, fruit, milk',
    breakfastNutrition: { calories: 360, protein: 11, carbs: 52, fat: 11, allergens: ['Gluten', 'Dairy', 'Eggs'], dietaryTags: ['vegetarian'], price: 45 },
    lunch: 'Pulao, shahi paneer, salad, lassi',
    lunchNutrition: { calories: 690, protein: 24, carbs: 84, fat: 24, allergens: ['Dairy'], dietaryTags: ['vegetarian'], price: 95 },
    snacks: 'Veg sandwich and lemon water',
    snacksNutrition: { calories: 220, protein: 7, carbs: 30, fat: 8, allergens: ['Gluten'], dietaryTags: ['vegetarian'], price: 30 },
    dinner: 'Dal khichdi, kadhi, papad, fruit salad',
    dinnerNutrition: { calories: 520, protein: 16, carbs: 74, fat: 15, allergens: ['Dairy'], dietaryTags: ['vegetarian', 'easy-digest'], price: 70 },
  },
];

const MEAL_SLOTS: MealSlot[] = ['breakfast', 'lunch', 'snacks', 'dinner'];
const SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000001');
const DEFAULT_WALLET_BALANCE = 120;
const LOW_BALANCE_THRESHOLD = 25;

function schoolObjectId(req: Request): Types.ObjectId {
  return new Types.ObjectId((req.user?.schoolId || '000000000000000000000001') as string);
}

function userObjectId(req: Request): Types.ObjectId {
  return new Types.ObjectId((req.user?.id || SYSTEM_USER_ID.toString()) as string);
}

function toObjectId(value: string, fieldName: string): Types.ObjectId {
  if (!Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return new Types.ObjectId(value);
}

function dateKey(date = new Date()) {
  return date.toISOString().split('T')[0];
}

function currentDayName(date = new Date()) {
  return new Intl.DateTimeFormat('en-US', { weekday: 'long' }).format(date);
}

function toNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseDateInput(value: unknown) {
  if (typeof value !== 'string' || !value.trim()) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateTime(value?: Date | string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function formatMenuDoc(menu: any) {
  return {
    id: menu._id.toString(),
    day: menu.day,
    breakfast: menu.breakfast,
    breakfastNutrition: menu.breakfastNutrition ?? null,
    lunch: menu.lunch,
    lunchNutrition: menu.lunchNutrition ?? null,
    snacks: menu.snacks,
    snacksNutrition: menu.snacksNutrition ?? null,
    dinner: menu.dinner,
    dinnerNutrition: menu.dinnerNutrition ?? null,
    createdAt: menu.createdAt,
    updatedAt: menu.updatedAt,
  };
}

function formatWalletDoc(wallet: any) {
  return {
    id: wallet._id.toString(),
    studentId: wallet.studentId ? wallet.studentId.toString() : null,
    studentName: wallet.studentName,
    grade: wallet.grade,
    rfidTag: wallet.rfidTag,
    balance: Number(wallet.balance ?? 0),
    status: wallet.status,
    lowBalance: Number(wallet.balance ?? 0) < LOW_BALANCE_THRESHOLD,
    createdAt: wallet.createdAt,
    updatedAt: wallet.updatedAt,
  };
}

function formatOrderDoc(order: any) {
  return {
    id: order._id.toString(),
    studentId: order.studentId.toString(),
    studentName: order.studentName,
    grade: order.grade,
    mealDate: order.mealDate,
    mealSlot: order.mealSlot,
    mealName: order.mealName,
    amount: Number(order.amount ?? 0),
    status: order.status,
    dietaryTags: order.dietaryTags ?? [],
    notes: order.notes ?? null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

function formatTransactionDoc(tx: any) {
  return {
    id: tx._id.toString(),
    studentName: tx.studentName,
    grade: tx.grade,
    rfidTag: tx.rfidTag,
    amount: Number(tx.amount ?? 0),
    item: tx.item,
    type: tx.type,
    mealSlot: tx.meta?.mealSlot ?? null,
    mealDate: tx.meta?.mealDate ?? null,
    orderId: tx.meta?.orderId ?? null,
    timestamp: tx.timestamp ? tx.timestamp.toISOString() : tx.createdAt?.toISOString?.() ?? null,
    createdAt: tx.createdAt,
    updatedAt: tx.updatedAt,
  };
}

function formatAllergyDoc(allergy: any) {
  return {
    id: allergy._id.toString(),
    studentId: allergy.studentId ? allergy.studentId.toString() : null,
    studentName: allergy.studentName,
    grade: allergy.grade,
    allergens: allergy.allergens ?? [],
    severity: allergy.severity,
    status: allergy.status,
    createdAt: allergy.createdAt,
    updatedAt: allergy.updatedAt,
  };
}

async function ensureWeeklyMenu(schoolId: Types.ObjectId) {
  for (const menu of WEEKLY_MENU) {
    const existing = await MessMenu.findOne({ schoolId, day: menu.day });
    if (existing) continue;

    await MessMenu.create({
      schoolId,
      day: menu.day,
      breakfast: menu.breakfast,
      breakfastNutrition: menu.breakfastNutrition,
      lunch: menu.lunch,
      lunchNutrition: menu.lunchNutrition,
      snacks: menu.snacks,
      snacksNutrition: menu.snacksNutrition,
      dinner: menu.dinner,
      dinnerNutrition: menu.dinnerNutrition,
      updatedBy: SYSTEM_USER_ID,
      createdBy: SYSTEM_USER_ID,
    });
  }
}

async function ensureStudentWallet(student: any, schoolId: Types.ObjectId) {
  const classDoc = student.classId && typeof student.classId === 'object' ? student.classId : null;
  const sectionDoc = student.sectionId && typeof student.sectionId === 'object' ? student.sectionId : null;
  const className = classDoc?.name || 'Grade';
  const sectionName = sectionDoc?.name ? `-${sectionDoc.name}` : '';
  const grade = `${className}${sectionName}`;
  const rfidTag = `RFID-${student.admissionNumber || student._id.toString().slice(-6)}`;

  let wallet = await RFIDWallet.findOne({ schoolId, studentId: student._id });
  if (!wallet) {
    wallet = await RFIDWallet.create({
      schoolId,
      studentId: student._id,
      studentName: `${student.userId?.firstName || ''} ${student.userId?.lastName || ''}`.trim() || student.admissionNumber,
      grade,
      rfidTag,
      balance: DEFAULT_WALLET_BALANCE,
      status: 'Active',
      updatedBy: SYSTEM_USER_ID,
      createdBy: SYSTEM_USER_ID,
    });
  }

  return wallet;
}

async function ensureSchoolWallets(schoolId: Types.ObjectId) {
  const students = await Student.find({ schoolId }).populate('userId').populate('classId').populate('sectionId');
  for (const student of students) {
    await ensureStudentWallet(student, schoolId);
  }
}

async function resolveStudentForUser(req: Request) {
  const schoolId = schoolObjectId(req);
  const student = await Student.findOne({ schoolId, userId: req.user?.id })
    .populate('userId')
    .populate('classId')
    .populate('sectionId');

  if (!student) {
    throw new ApiError(404, 'Student profile not found for the signed-in account');
  }

  const wallet = await ensureStudentWallet(student, schoolId);
  return { student, wallet };
}

function mealSlotToField(slot: MealSlot) {
  return slot;
}

function getMealDetail(menu: any, slot: MealSlot) {
  const detailKey = `${slot}Nutrition` as const;
  return {
    name: menu[slot] as string,
    nutrition: menu[detailKey] ?? null,
  };
}

async function getMenuForDay(schoolId: Types.ObjectId, day: string) {
  let menu = await MessMenu.findOne({ schoolId, day });
  if (!menu) {
    await ensureWeeklyMenu(schoolId);
    menu = await MessMenu.findOne({ schoolId, day });
  }
  return menu;
}

async function getOrCreateOrderForStudent(studentId: Types.ObjectId, mealDate: string, mealSlot: MealSlot) {
  return CanteenOrder.findOne({ studentId, mealDate, mealSlot });
}

function buildDailyReport(date: string, orders: any[], transactions: any[], wallets: any[], allergies: any[], menu: any | null) {
  const revenue = orders.reduce((sum, order) => sum + Number(order.amount ?? 0), 0);
  const bySlot = MEAL_SLOTS.reduce((acc, slot) => {
    acc[slot] = {
      count: orders.filter((order) => order.mealSlot === slot).length,
      revenue: orders.filter((order) => order.mealSlot === slot).reduce((sum, order) => sum + Number(order.amount ?? 0), 0),
    };
    return acc;
  }, {} as Record<MealSlot, { count: number; revenue: number }>);

  const mealRevenue = new Map<string, number>();
  for (const order of orders) {
    mealRevenue.set(order.mealName, (mealRevenue.get(order.mealName) ?? 0) + Number(order.amount ?? 0));
  }

  const topMeals = [...mealRevenue.entries()]
    .map(([mealName, amount]) => ({ mealName, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  return {
    date,
    revenue,
    totalOrders: orders.length,
    debitTransactions: transactions.filter((tx) => tx.type === 'Debit').length,
    creditTransactions: transactions.filter((tx) => tx.type === 'Credit').length,
    lowBalanceAlerts: wallets.filter((wallet) => Number(wallet.balance ?? 0) < LOW_BALANCE_THRESHOLD).length,
    allergyAlerts: allergies.filter((allergy) => allergy.status === 'Active').length,
    mealBreakdown: bySlot,
    topMeals,
    menu: menu ? formatMenuDoc(menu) : null,
    orders: orders.map(formatOrderDoc),
    transactions: transactions.map(formatTransactionDoc),
    wallets: wallets.map(formatWalletDoc),
    allergyRecords: allergies.map(formatAllergyDoc),
  };
}

export class CanteenController {
  static async getMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      await ensureWeeklyMenu(schoolId);

      const day = typeof req.query.day === 'string' && req.query.day.trim()
        ? req.query.day.trim()
        : currentDayName();
      const menus = typeof req.query.week === 'string' && req.query.week === 'true'
        ? await MessMenu.find({ schoolId }).sort({ createdAt: 1 })
        : [await getMenuForDay(schoolId, day)].filter(Boolean);

      sendResponse(res, 200, 'Canteen menu retrieved', {
        day,
        menus: menus.map((menu) => formatMenuDoc(menu)),
        currentDay: formatMenuDoc(await getMenuForDay(schoolId, currentDayName())),
      });
    } catch (error) {
      next(error);
    }
  }

  static async updateMenu(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { day } = req.params;
      const payload = req.body ?? {};

      const updated = await MessMenu.findOneAndUpdate(
        { schoolId, day },
        {
          schoolId,
          day,
          breakfast: String(payload.breakfast ?? 'Breakfast not set'),
          breakfastNutrition: payload.breakfastNutrition ?? {},
          lunch: String(payload.lunch ?? 'Lunch not set'),
          lunchNutrition: payload.lunchNutrition ?? {},
          snacks: String(payload.snacks ?? 'Snacks not set'),
          snacksNutrition: payload.snacksNutrition ?? {},
          dinner: String(payload.dinner ?? 'Dinner not set'),
          dinnerNutrition: payload.dinnerNutrition ?? {},
          updatedBy: userObjectId(req),
          createdBy: userObjectId(req),
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );

      sendResponse(res, 200, 'Canteen menu updated', formatMenuDoc(updated));
    } catch (error) {
      next(error);
    }
  }

  static async getMyCanteen(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      await ensureWeeklyMenu(schoolId);
      const { student, wallet } = await resolveStudentForUser(req);
      const today = dateKey();
      const currentDay = currentDayName();
      const menu = await getMenuForDay(schoolId, currentDay);
      const orders = await CanteenOrder.find({
        schoolId,
        studentId: student._id,
        mealDate: today,
      }).sort({ createdAt: -1 });
      const allergies = await StudentAllergy.find({
        schoolId,
        $or: [{ studentId: student._id }, { studentName: student.userId ? `${student.userId.firstName} ${student.userId.lastName}`.trim() : student.admissionNumber }],
      });

      sendResponse(res, 200, 'Student canteen summary retrieved', {
        student: {
          id: student._id.toString(),
          name: student.userId ? `${student.userId.firstName} ${student.userId.lastName}`.trim() : student.admissionNumber,
          grade: student.classId?.name && student.sectionId?.name ? `${student.classId.name}-${student.sectionId.name}` : student.classId?.name ?? 'Grade',
        },
        wallet: formatWalletDoc(wallet),
        menu: formatMenuDoc(menu),
        todayOrders: orders.map(formatOrderDoc),
        allergies: allergies.map(formatAllergyDoc),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getPreorders(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { date, studentId, status } = req.query;
      const filter: Record<string, unknown> = { schoolId };

      if (typeof date === 'string' && date.trim()) filter.mealDate = date.trim();
      if (typeof studentId === 'string' && studentId.trim()) filter.studentId = toObjectId(studentId.trim(), 'studentId');
      if (typeof status === 'string' && status.trim()) filter.status = status.trim();

      if (req.user?.role === 'STUDENT' && !studentId) {
        const { student } = await resolveStudentForUser(req);
        filter.studentId = student._id;
      }

      const orders = await CanteenOrder.find(filter).sort({ createdAt: -1 });
      sendResponse(res, 200, 'Pre-orders retrieved', orders.map(formatOrderDoc));
    } catch (error) {
      next(error);
    }
  }

  static async createPreorder(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { mealSlot, notes, mealDate } = req.body ?? {};

      if (!MEAL_SLOTS.includes(mealSlot)) {
        res.status(400).json({ success: false, message: 'mealSlot must be breakfast, lunch, snacks, or dinner' });
        return;
      }

      const orderDate = typeof mealDate === 'string' && mealDate.trim() ? mealDate.trim() : dateKey();
      const { student, wallet } = await resolveStudentForUser(req);
      if (wallet.status === 'Frozen') {
        res.status(403).json({ success: false, message: 'Your canteen wallet is frozen' });
        return;
      }
      const menu = await getMenuForDay(schoolId, currentDayName(new Date(orderDate)));
      if (!menu) {
        res.status(404).json({ success: false, message: 'Menu not available for the selected day' });
        return;
      }

      const existing = await getOrCreateOrderForStudent(student._id, orderDate, mealSlot);
      if (existing) {
        res.status(409).json({ success: false, message: 'You already have a preorder for this meal slot' });
        return;
      }

      const meal = getMealDetail(menu, mealSlot);
      const amount = Number(meal.nutrition?.price ?? 0);
      if (amount > Number(wallet.balance ?? 0)) {
        res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        return;
      }

      wallet.balance = Number(wallet.balance ?? 0) - amount;
      wallet.updatedBy = userObjectId(req);
      await wallet.save();

      const order = await CanteenOrder.create({
        schoolId,
        studentId: student._id,
        studentName: student.userId ? `${student.userId.firstName} ${student.userId.lastName}`.trim() : student.admissionNumber,
        grade: student.classId?.name && student.sectionId?.name ? `${student.classId.name}-${student.sectionId.name}` : student.classId?.name ?? 'Grade',
        mealDate: orderDate,
        mealSlot,
        mealName: meal.name,
        amount,
        status: 'placed',
        dietaryTags: meal.nutrition?.dietaryTags ?? [],
        notes: notes ? String(notes) : undefined,
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      await RFIDTransaction.create({
        schoolId,
        studentName: student.userId ? `${student.userId.firstName} ${student.userId.lastName}`.trim() : student.admissionNumber,
        grade: student.classId?.name && student.sectionId?.name ? `${student.classId.name}-${student.sectionId.name}` : student.classId?.name ?? 'Grade',
        rfidTag: wallet.rfidTag,
        amount,
        item: `${mealSlot.toUpperCase()} preorder - ${meal.name}`,
        type: 'Debit',
        meta: {
          mealSlot,
          mealDate: orderDate,
          orderId: order._id.toString(),
        },
        timestamp: new Date(),
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      sendResponse(res, 201, 'Meal pre-order placed', {
        order: formatOrderDoc(order),
        wallet: formatWalletDoc(wallet),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getWallets(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      await ensureSchoolWallets(schoolId);
      const wallets = await RFIDWallet.find({ schoolId }).sort({ balance: 1, studentName: 1 });
      sendResponse(res, 200, 'Wallets retrieved', wallets.map(formatWalletDoc));
    } catch (error) {
      next(error);
    }
  }

  static async topUpWallet(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { walletId } = req.params;
      const { amount, note } = req.body ?? {};
      const wallet = await RFIDWallet.findOne({ schoolId, _id: toObjectId(walletId, 'walletId') });

      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      const credit = Math.max(0, toNumber(amount, 0));
      if (credit <= 0) {
        res.status(400).json({ success: false, message: 'Top-up amount must be greater than zero' });
        return;
      }

      wallet.balance = Number(wallet.balance ?? 0) + credit;
      wallet.updatedBy = userObjectId(req);
      await wallet.save();

      await RFIDTransaction.create({
        schoolId,
        studentName: wallet.studentName,
        grade: wallet.grade,
        rfidTag: wallet.rfidTag,
        amount: credit,
        item: note ? String(note) : 'Wallet top-up',
        type: 'Credit',
        meta: {
          mealSlot: null,
          mealDate: dateKey(),
          orderId: null,
        },
        timestamp: new Date(),
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      sendResponse(res, 200, 'Wallet topped up', formatWalletDoc(wallet));
    } catch (error) {
      next(error);
    }
  }

  static async toggleWalletStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { walletId } = req.params;
      const { status } = req.body ?? {};
      if (status !== 'Active' && status !== 'Frozen') {
        res.status(400).json({ success: false, message: 'status must be Active or Frozen' });
        return;
      }

      const wallet = await RFIDWallet.findOneAndUpdate(
        { schoolId, _id: toObjectId(walletId, 'walletId') },
        { $set: { status, updatedBy: userObjectId(req) } },
        { new: true },
      );

      if (!wallet) {
        res.status(404).json({ success: false, message: 'Wallet not found' });
        return;
      }

      sendResponse(res, 200, 'Wallet status updated', formatWalletDoc(wallet));
    } catch (error) {
      next(error);
    }
  }

  static async getAllergies(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const allergies = await StudentAllergy.find({ schoolId }).sort({ createdAt: -1 });
      sendResponse(res, 200, 'Allergy records retrieved', allergies.map(formatAllergyDoc));
    } catch (error) {
      next(error);
    }
  }

  static async addAllergy(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { studentId, studentName, grade, allergens, severity, status } = req.body ?? {};

      if (!studentName || !grade || !Array.isArray(allergens) || allergens.length === 0) {
        res.status(400).json({ success: false, message: 'studentName, grade, and allergens are required' });
        return;
      }

      const student = typeof studentId === 'string' && studentId.trim()
        ? await Student.findOne({ schoolId, _id: toObjectId(studentId.trim(), 'studentId') })
        : null;

      const record = await StudentAllergy.create({
        schoolId,
        studentId: student ? student._id : undefined,
        studentName: String(studentName),
        grade: String(grade),
        allergens: allergens.map((item: unknown) => String(item).trim()).filter(Boolean),
        severity: severity === 'High' || severity === 'Low' ? severity : 'Medium',
        status: status === 'Monitored' ? 'Monitored' : 'Active',
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      sendResponse(res, 201, 'Allergy record created', formatAllergyDoc(record));
    } catch (error) {
      next(error);
    }
  }

  static async getTransactions(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { date, type, studentId } = req.query;
      const filter: Record<string, unknown> = { schoolId };

      if (typeof date === 'string' && date.trim()) {
        const start = new Date(`${date.trim()}T00:00:00.000Z`);
        const end = new Date(`${date.trim()}T23:59:59.999Z`);
        filter.timestamp = { $gte: start, $lte: end };
      }
      if (typeof type === 'string' && type.trim()) filter.type = type.trim();
      if (typeof studentId === 'string' && studentId.trim()) filter.studentName = { $regex: studentId.trim(), $options: 'i' };

      const transactions = await RFIDTransaction.find(filter).sort({ timestamp: -1, createdAt: -1 }).limit(100);
      sendResponse(res, 200, 'Transactions retrieved', transactions.map(formatTransactionDoc));
    } catch (error) {
      next(error);
    }
  }

  static async getDailyReport(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const date = typeof req.query.date === 'string' && req.query.date.trim() ? req.query.date.trim() : dateKey();
      const start = new Date(`${date}T00:00:00.000Z`);
      const end = new Date(`${date}T23:59:59.999Z`);
      const [orders, transactions, wallets, allergies, menu] = await Promise.all([
        CanteenOrder.find({ schoolId, mealDate: date }).sort({ createdAt: -1 }),
        RFIDTransaction.find({ schoolId, timestamp: { $gte: start, $lte: end } }).sort({ timestamp: -1 }),
        RFIDWallet.find({ schoolId }).sort({ balance: 1 }),
        StudentAllergy.find({ schoolId }),
        getMenuForDay(schoolId, currentDayName(new Date(date))),
      ]);

      sendResponse(res, 200, 'Daily canteen report retrieved', buildDailyReport(date, orders, transactions, wallets, allergies, menu));
    } catch (error) {
      next(error);
    }
  }

  static async updateOrderStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { id } = req.params;
      const { status } = req.body ?? {};
      if (!['placed', 'prepared', 'served', 'cancelled'].includes(status)) {
        res.status(400).json({ success: false, message: 'Invalid order status' });
        return;
      }

      const order = await CanteenOrder.findOneAndUpdate(
        { schoolId, _id: toObjectId(id, 'order id') },
        { $set: { status, updatedBy: userObjectId(req) } },
        { new: true },
      );

      if (!order) {
        res.status(404).json({ success: false, message: 'Order not found' });
        return;
      }

      sendResponse(res, 200, 'Order status updated', formatOrderDoc(order));
    } catch (error) {
      next(error);
    }
  }
}
