import { Router } from 'express';
import { TransportController } from '../../controllers/transport.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';

export const transportRouter = Router();

// Ensure all routes require authentication
transportRouter.use(authenticateToken);

transportRouter.get('/routes', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'DRIVER'), TransportController.getTransportRoutes);
transportRouter.post('/routes', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'), requirePermissions('MANAGE_TRANSPORT'), TransportController.createTransportRoute);
transportRouter.patch('/routes/:id/location', requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'DRIVER'), requirePermissions('MANAGE_TRANSPORT'), TransportController.updateGPSLocation);
