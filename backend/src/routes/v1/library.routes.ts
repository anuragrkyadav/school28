import { Router } from 'express';
import { LibraryController } from '../../controllers/library.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { requireParentChildAccess } from '../../middleware/resource-isolation.js';
import { requirePermissions } from '../../middleware/rbac.js';

export const libraryRouter = Router();

// Ensure all routes require authentication
libraryRouter.use(authenticateToken);

libraryRouter.get('/books', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'), LibraryController.getLibraryBooks);
libraryRouter.get('/statistics', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.getLibraryStatistics);
libraryRouter.get('/alerts/low-stock', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.getLowStockAlerts);
libraryRouter.post('/books', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.addLibraryBook);
libraryRouter.post('/circulations/issue', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.issueBook);
libraryRouter.post('/circulations/:id/return', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.returnBook);
libraryRouter.get('/circulations', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.getAllCirculations);
libraryRouter.get('/reservations', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER'), requirePermissions('MANAGE_LIBRARY'), LibraryController.getReservations);
libraryRouter.post('/reservations', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'), LibraryController.reserveBook);
libraryRouter.get(
  '/circulations/student/:studentId',
  requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT'),
  requireParentChildAccess,
  LibraryController.getStudentCirculations,
);
