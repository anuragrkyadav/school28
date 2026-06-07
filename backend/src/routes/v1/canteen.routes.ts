import { Router } from 'express';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';
import { requirePermissions } from '../../middleware/rbac.js';
import { CanteenController } from '../../controllers/canteen.controller.js';

export const canteenRouter = Router();

canteenRouter.use(authenticateToken);

const adminRoles = requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'ACCOUNTANT');
const studentRoles = requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN', 'TEACHER', 'PARENT', 'STUDENT', 'ACCOUNTANT');

canteenRouter.get('/menu', studentRoles, CanteenController.getMenu);
canteenRouter.get('/me', requireRoles('STUDENT'), CanteenController.getMyCanteen);
canteenRouter.get('/preorders', studentRoles, CanteenController.getPreorders);
canteenRouter.post('/preorders', requireRoles('STUDENT'), CanteenController.createPreorder);

canteenRouter.get('/allergies', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.getAllergies);
canteenRouter.post('/allergies', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.addAllergy);

canteenRouter.get('/wallets', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.getWallets);
canteenRouter.post('/wallets/:walletId/topup', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.topUpWallet);
canteenRouter.patch('/wallets/:walletId/status', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.toggleWalletStatus);

canteenRouter.get('/transactions', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.getTransactions);
canteenRouter.get('/reports/daily', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.getDailyReport);
canteenRouter.patch('/orders/:id/status', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.updateOrderStatus);
canteenRouter.put('/menu/:day', adminRoles, requirePermissions('MANAGE_CANTEEN'), CanteenController.updateMenu);
