import type { NextFunction, Request, Response } from 'express';
import { Types } from 'mongoose';
import { sendResponse } from '../utils/response.js';
import { LibraryBook } from '../models/LibraryBook.js';
import { BookCirculation } from '../models/BookCirculation.js';
import { LibraryReservation } from '../models/LibraryReservation.js';

type LibraryBookSeed = {
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  availableCopies: number;
  shelf: string;
  resourceType?: 'physical' | 'digital';
  resourceUrl?: string;
  lowStockThreshold?: number;
};

const DEFAULT_BOOKS: LibraryBookSeed[] = [
  {
    title: 'Calculus: Early Transcendentals',
    author: 'James Stewart',
    isbn: '978-0538497909',
    category: 'Mathematics',
    totalCopies: 10,
    availableCopies: 6,
    shelf: 'M-01',
  },
  {
    title: 'NCERT Mathematics Class 10',
    author: 'NCERT',
    isbn: '978-8174505476',
    category: 'Mathematics',
    totalCopies: 12,
    availableCopies: 10,
    shelf: 'M-02',
    resourceType: 'digital',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    title: 'Concepts of Physics Vol. 1',
    author: 'H.C. Verma',
    isbn: '978-8177091878',
    category: 'Physics',
    totalCopies: 15,
    availableCopies: 8,
    shelf: 'P-01',
  },
  {
    title: 'NCERT Physics Class 11',
    author: 'NCERT',
    isbn: '978-8174505803',
    category: 'Physics',
    totalCopies: 10,
    availableCopies: 7,
    shelf: 'P-02',
    resourceType: 'digital',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    title: 'Organic Chemistry',
    author: 'Paula Yurkanis Bruice',
    isbn: '978-0134074580',
    category: 'Chemistry',
    totalCopies: 8,
    availableCopies: 3,
    shelf: 'C-01',
  },
  {
    title: 'NCERT Chemistry Class 12',
    author: 'NCERT',
    isbn: '978-8174507098',
    category: 'Chemistry',
    totalCopies: 9,
    availableCopies: 6,
    shelf: 'C-02',
    resourceType: 'digital',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0061120084',
    category: 'Literature',
    totalCopies: 12,
    availableCopies: 9,
    shelf: 'L-01',
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0743273565',
    category: 'Literature',
    totalCopies: 10,
    availableCopies: 5,
    shelf: 'L-02',
  },
  {
    title: 'A Brief History of Time',
    author: 'Stephen Hawking',
    isbn: '978-0553380163',
    category: 'Science',
    totalCopies: 6,
    availableCopies: 2,
    shelf: 'S-01',
  },
  {
    title: 'Biology: Concepts and Connections',
    author: 'Campbell & Reece',
    isbn: '978-0321558237',
    category: 'Science',
    totalCopies: 7,
    availableCopies: 4,
    shelf: 'S-02',
  },
  {
    title: 'The Story of My Experiments with Truth',
    author: 'M.K. Gandhi',
    isbn: '978-8172345266',
    category: 'History',
    totalCopies: 5,
    availableCopies: 4,
    shelf: 'H-01',
  },
  {
    title: 'India After Gandhi',
    author: 'Ramachandra Guha',
    isbn: '978-0060958589',
    category: 'History',
    totalCopies: 4,
    availableCopies: 2,
    shelf: 'H-02',
  },
  {
    title: 'Introduction to Algorithms',
    author: 'Thomas H. Cormen',
    isbn: '978-0262033848',
    category: 'Computer Science',
    totalCopies: 5,
    availableCopies: 5,
    shelf: 'CS-01',
  },
  {
    title: 'Python Crash Course',
    author: 'Eric Matthes',
    isbn: '978-1593279288',
    category: 'Computer Science',
    totalCopies: 8,
    availableCopies: 6,
    shelf: 'CS-02',
    resourceType: 'digital',
    resourceUrl: 'https://ehmatthes.github.io/pcc_2e/',
  },
  {
    title: 'Hamlet',
    author: 'William Shakespeare',
    isbn: '978-0743477123',
    category: 'Literature',
    totalCopies: 9,
    availableCopies: 7,
    shelf: 'L-03',
  },
  {
    title: 'The Alchemist',
    author: 'Paulo Coelho',
    isbn: '978-0061122415',
    category: 'Literature',
    totalCopies: 11,
    availableCopies: 9,
    shelf: 'L-04',
  },
  {
    title: 'Economics: Principles and Policy',
    author: 'William J. Baumol',
    isbn: '978-1337617383',
    category: 'Economics',
    totalCopies: 6,
    availableCopies: 4,
    shelf: 'E-01',
  },
  {
    title: 'Indian Constitution at Work',
    author: 'NCERT',
    isbn: '978-8174506480',
    category: 'Civics',
    totalCopies: 10,
    availableCopies: 8,
    shelf: 'CIV-01',
    resourceType: 'digital',
    resourceUrl: 'https://ncert.nic.in/textbook.php',
  },
  {
    title: 'Environmental Studies',
    author: 'Erach Bharucha',
    isbn: '978-0199455386',
    category: 'Environmental Science',
    totalCopies: 7,
    availableCopies: 3,
    shelf: 'EV-01',
  },
  {
    title: 'General Knowledge 2026',
    author: 'Manohar Pandey',
    isbn: '978-9352642776',
    category: 'Reference',
    totalCopies: 6,
    availableCopies: 4,
    shelf: 'R-01',
    resourceType: 'digital',
    resourceUrl: 'https://www.britannica.com/',
  },
];

const SYSTEM_USER_ID = new Types.ObjectId('000000000000000000000001');

function schoolObjectId(req: Request): Types.ObjectId {
  const schoolId = req.user?.schoolId;
  if (typeof schoolId !== 'string' || !Types.ObjectId.isValid(schoolId)) {
    return new Types.ObjectId('000000000000000000000001');
  }
  return new Types.ObjectId(schoolId);
}

function userObjectId(req: Request): Types.ObjectId {
  const userId = req.user?.id;
  if (typeof userId !== 'string' || !Types.ObjectId.isValid(userId)) {
    return SYSTEM_USER_ID;
  }
  return new Types.ObjectId(userId);
}

function toObjectId(value: unknown, fieldName: string): Types.ObjectId {
  if (typeof value !== 'string' || !Types.ObjectId.isValid(value)) {
    throw new Error(`Invalid ${fieldName}`);
  }
  return new Types.ObjectId(value);
}

function toInt(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toDateString(value: Date) {
  return value.toISOString().split('T')[0];
}

function computeFine(dueDate: Date, returnedDate: Date) {
  const msPerDay = 1000 * 60 * 60 * 24;
  const due = new Date(dueDate.getTime());
  due.setHours(0, 0, 0, 0);
  const returned = new Date(returnedDate.getTime());
  returned.setHours(0, 0, 0, 0);
  const overdueDays = Math.max(0, Math.ceil((returned.getTime() - due.getTime()) / msPerDay));
  const finePerDay = 5;
  return {
    overdueDays,
    fineAmount: overdueDays * finePerDay,
  };
}

async function seedBooksIfNeeded(schoolId: Types.ObjectId) {
  for (const seed of DEFAULT_BOOKS) {
    await LibraryBook.findOneAndUpdate(
      { schoolId, isbn: seed.isbn },
      {
        schoolId,
        title: seed.title,
        author: seed.author,
        isbn: seed.isbn,
        category: seed.category,
        totalCopies: seed.totalCopies,
        availableCopies: seed.availableCopies,
        shelf: seed.shelf,
        resourceType: seed.resourceType ?? 'physical',
        resourceUrl: seed.resourceUrl,
        lowStockThreshold: seed.lowStockThreshold ?? 2,
        updatedBy: SYSTEM_USER_ID,
        createdBy: SYSTEM_USER_ID,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }
}

function formatBook(book: any) {
  const isLowStock = book.availableCopies <= (book.lowStockThreshold ?? 2);
  return {
    id: book._id.toString(),
    title: book.title,
    author: book.author,
    isbn: book.isbn,
    category: book.category,
    total_copies: book.totalCopies,
    available_copies: book.availableCopies,
    shelf: book.shelf,
    resource_type: book.resourceType ?? 'physical',
    resource_url: book.resourceUrl ?? null,
    low_stock_threshold: book.lowStockThreshold ?? 2,
    is_low_stock: isLowStock,
    created_at: book.createdAt,
    updated_at: book.updatedAt,
  };
}

function formatCirculation(c: any) {
  return {
    id: c._id.toString(),
    book_id: c.bookId.toString(),
    book_title: c.bookTitle,
    student_id: c.studentId.toString(),
    student_name: c.studentName,
    issued_date: toDateString(c.issuedDate),
    due_date: toDateString(c.dueDate),
    returned_date: c.returnedDate ? toDateString(c.returnedDate) : null,
    status: c.status,
    fine_amount: c.fineAmount ?? 0,
    fine_paid: c.finePaid ?? 0,
    fine_status: c.fineStatus ?? 'none',
    created_at: c.createdAt,
    updated_at: c.updatedAt,
  };
}

function formatReservation(r: any) {
  return {
    id: r._id.toString(),
    book_id: r.bookId.toString(),
    book_title: r.bookTitle,
    student_id: r.studentId.toString(),
    student_name: r.studentName,
    reserved_at: r.reservedAt.toISOString(),
    expires_at: r.expiresAt.toISOString(),
    status: r.status,
    note: r.note ?? null,
    created_at: r.createdAt,
    updated_at: r.updatedAt,
  };
}

function getSearchText(book: any) {
  return [
    book.title,
    book.author,
    book.isbn,
    book.category,
    book.shelf,
    book.resourceType,
    book.resourceUrl,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

export class LibraryController {
  static async getLibraryBooks(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      await seedBooksIfNeeded(schoolId);

      const { category, query, lowStock, digital } = req.query;
      const match: Record<string, unknown> = { schoolId };

      if (category && typeof category === 'string') match.category = category;
      if (digital === 'true') match.resourceType = 'digital';
      if (digital === 'false') match.resourceType = 'physical';

      const books = await LibraryBook.find(match).sort({ category: 1, title: 1 });
      const filtered = typeof query === 'string' && query.trim()
        ? books.filter((book) => getSearchText(book).includes(query.trim().toLowerCase()))
        : books;
      const finalBooks = lowStock === 'true'
        ? filtered.filter((book) => book.availableCopies <= (book.lowStockThreshold ?? 2))
        : filtered;

      sendResponse(res, 200, 'Books retrieved', finalBooks.map(formatBook));
    } catch (error) {
      next(error);
    }
  }

  static async getLibraryStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      await seedBooksIfNeeded(schoolId);

      const books = await LibraryBook.find({ schoolId });
      const circulations = await BookCirculation.find({ schoolId });
      const reservations = await LibraryReservation.find({ schoolId, status: 'active' });

      const totalCopies = books.reduce((sum, book) => sum + book.totalCopies, 0);
      const availableCopies = books.reduce((sum, book) => sum + book.availableCopies, 0);
      const lowStockBooks = books.filter((book) => book.availableCopies <= (book.lowStockThreshold ?? 2));
      const digitalBooks = books.filter((book) => book.resourceType === 'digital');
      const overdueCirculations = circulations.filter((c) => {
        if (c.status === 'returned') return false;
        return new Date(c.dueDate).getTime() < Date.now();
      });

      const categoryStats = Array.from(new Set(books.map((book) => book.category))).map((category) => {
        const grouped = books.filter((book) => book.category === category);
        return {
          category,
          titles: grouped.length,
          total_copies: grouped.reduce((sum, book) => sum + book.totalCopies, 0),
          available_copies: grouped.reduce((sum, book) => sum + book.availableCopies, 0),
          low_stock_titles: grouped.filter((book) => book.availableCopies <= (book.lowStockThreshold ?? 2)).length,
        };
      });

      sendResponse(res, 200, 'Library statistics retrieved', {
        total_titles: books.length,
        total_copies: totalCopies,
        available_copies: availableCopies,
        issued_copies: totalCopies - availableCopies,
        low_stock_count: lowStockBooks.length,
        digital_titles: digitalBooks.length,
        active_reservations: reservations.length,
        overdue_circulations: overdueCirculations.length,
        circulation_percentage: totalCopies > 0 ? Math.round(((totalCopies - availableCopies) / totalCopies) * 100) : 0,
        category_stats: categoryStats,
        low_stock_books: lowStockBooks.map(formatBook),
      });
    } catch (error) {
      next(error);
    }
  }

  static async getLowStockAlerts(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      await seedBooksIfNeeded(schoolId);
      const books = await LibraryBook.find({ schoolId });
      const lowStockBooks = books.filter((book) => book.availableCopies <= (book.lowStockThreshold ?? 2));
      sendResponse(res, 200, 'Low stock books retrieved', lowStockBooks.map(formatBook));
    } catch (error) {
      next(error);
    }
  }

  static async addLibraryBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const {
        title,
        author,
        isbn,
        category,
        totalCopies,
        available,
        shelf,
        resourceType,
        resourceUrl,
        lowStockThreshold,
      } = req.body;

      if (!title || !author || !category) {
        res.status(400).json({ success: false, message: 'Title, author, and category are required' });
        return;
      }

      const book = await LibraryBook.create({
        schoolId,
        title,
        author,
        isbn,
        category,
        totalCopies: Math.max(1, toInt(totalCopies, 1)),
        availableCopies: Math.min(
          Math.max(0, toInt(available, toInt(totalCopies, 1))),
          Math.max(1, toInt(totalCopies, 1)),
        ),
        shelf,
        resourceType: resourceType === 'digital' ? 'digital' : 'physical',
        resourceUrl: resourceUrl || undefined,
        lowStockThreshold: Math.max(1, toInt(lowStockThreshold, 2)),
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      sendResponse(res, 201, 'Book created', formatBook(book));
    } catch (error) {
      next(error);
    }
  }

  static async issueBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { bookId, studentId, studentName, dueDateDays, note } = req.body;
      const bookIdStr = typeof bookId === 'string' ? bookId : '';
      const studentIdStr = typeof studentId === 'string' ? studentId : '';
      const studentNameStr = typeof studentName === 'string' ? studentName : '';

      if (!bookIdStr || !studentIdStr || !studentNameStr) {
        res.status(400).json({ success: false, message: 'bookId, studentId, and studentName are required' });
        return;
      }

      const book = await LibraryBook.findOne({ schoolId, _id: toObjectId(bookIdStr, 'bookId') });
      if (!book) {
        res.status(404).json({ success: false, message: 'Book not found' });
        return;
      }

      const activeReservations = await LibraryReservation.find({
        schoolId,
        bookId: book._id,
        status: 'active',
      }).sort({ reservedAt: 1 });

      const requestedStudentId = toObjectId(studentIdStr, 'studentId');
      if (activeReservations.length > 0) {
        const hasReservationForStudent = activeReservations.some((reservation) =>
          reservation.studentId.toString() === requestedStudentId.toString(),
        );
        if (!hasReservationForStudent) {
          res.status(409).json({
            success: false,
            message: 'This book is reserved for another student',
          });
          return;
        }
      }

      if (book.availableCopies <= 0) {
        res.status(400).json({ success: false, message: 'No copies available for issue' });
        return;
      }

      book.availableCopies -= 1;
      book.updatedBy = userObjectId(req);
      await book.save();

      const days = Math.max(1, toInt(dueDateDays, 14));
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + days);

      const circulation = await BookCirculation.create({
        schoolId,
        bookId: book._id,
        bookTitle: book.title,
        studentId: requestedStudentId,
        studentName,
        issuedDate: new Date(),
        dueDate,
        status: 'issued',
        fineAmount: 0,
        finePaid: 0,
        fineStatus: 'none',
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      if (activeReservations.length > 0) {
        await LibraryReservation.updateMany(
          { _id: { $in: activeReservations.map((reservation) => reservation._id) } },
          {
            $set: {
              status: 'fulfilled',
              updatedBy: userObjectId(req),
            },
          },
        );
      }

      sendResponse(res, 201, 'Book issued successfully', {
        ...formatCirculation(circulation),
        note: note ? String(note) : null,
      });
    } catch (error) {
      next(error);
    }
  }

  static async returnBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const id = typeof req.params.id === 'string' ? req.params.id : '';
      const circulation = await BookCirculation.findOne({
        schoolId,
        _id: toObjectId(id, 'circulation id'),
      });

      if (!circulation) {
        res.status(404).json({ success: false, message: 'Circulation record not found' });
        return;
      }

      if (circulation.status === 'returned') {
        res.status(400).json({ success: false, message: 'Book has already been returned' });
        return;
      }

      const returnDate = new Date();
      const { overdueDays, fineAmount } = computeFine(circulation.dueDate, returnDate);

      circulation.status = 'returned';
      circulation.returnedDate = returnDate;
      circulation.fineAmount = fineAmount;
      circulation.finePaid = 0;
      circulation.fineStatus = fineAmount > 0 ? 'pending' : 'none';
      circulation.updatedBy = userObjectId(req);
      await circulation.save();

      const book = await LibraryBook.findOne({ schoolId, _id: circulation.bookId });
      if (book) {
        book.availableCopies = Math.min(book.totalCopies, book.availableCopies + 1);
        book.updatedBy = userObjectId(req);
        await book.save();
      }

      sendResponse(res, 200, 'Book returned successfully', {
        ...formatCirculation(circulation),
        fine_amount: fineAmount,
        overdue_days: overdueDays,
        was_overdue: overdueDays > 0,
      });
    } catch (error) {
      next(error);
    }
  }

  static async getAllCirculations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const circs = await BookCirculation.find({ schoolId }).sort({ createdAt: -1 });

      const formatted = circs.map((circulation) => {
        const overdue = circulation.status !== 'returned' && circulation.dueDate.getTime() < Date.now();
        return {
          ...formatCirculation(circulation),
          status: overdue ? 'overdue' : circulation.status,
        };
      });

      sendResponse(res, 200, 'Circulations retrieved', formatted);
    } catch (error) {
      next(error);
    }
  }

  static async getReservations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const reservations = await LibraryReservation.find({ schoolId }).sort({ createdAt: -1 });
      const formatted = reservations.map((reservation) => {
        const isExpired = reservation.status === 'active' && reservation.expiresAt.getTime() < Date.now();
        return {
          ...formatReservation(reservation),
          status: isExpired ? 'expired' : reservation.status,
        };
      });
      sendResponse(res, 200, 'Reservations retrieved', formatted);
    } catch (error) {
      next(error);
    }
  }

  static async reserveBook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const schoolId = schoolObjectId(req);
      const { bookId, studentId, studentName, note } = req.body;
      const bookIdStr = typeof bookId === 'string' ? bookId : '';
      const studentIdStr = typeof studentId === 'string' ? studentId : '';
      const studentNameStr = typeof studentName === 'string' ? studentName : '';

      if (!bookIdStr || !studentIdStr || !studentNameStr) {
        res.status(400).json({ success: false, message: 'bookId, studentId, and studentName are required' });
        return;
      }

      const book = await LibraryBook.findOne({ schoolId, _id: toObjectId(bookIdStr, 'bookId') });
      if (!book) {
        res.status(404).json({ success: false, message: 'Book not found' });
        return;
      }

      const requestedStudentId = toObjectId(studentIdStr, 'studentId');
      const existingReservation = await LibraryReservation.findOne({
        schoolId,
        bookId: book._id,
        studentId: requestedStudentId,
        status: 'active',
      });

      if (existingReservation) {
        res.status(409).json({ success: false, message: 'Student already has an active reservation for this book' });
        return;
      }

      const reservation = await LibraryReservation.create({
        schoolId,
        bookId: book._id,
        studentId: requestedStudentId,
        studentName,
        bookTitle: book.title,
        reservedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        status: 'active',
        note: note ? String(note) : undefined,
        createdBy: userObjectId(req),
        updatedBy: userObjectId(req),
      });

      sendResponse(res, 201, 'Book reserved successfully', formatReservation(reservation));
    } catch (error) {
      next(error);
    }
  }
}
