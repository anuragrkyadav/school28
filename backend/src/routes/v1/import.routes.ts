import { Router } from 'express';
import multer from 'multer';
import { importStudents } from '../../controllers/import.controller.js';
import { authenticateToken, requireRoles } from '../../middleware/auth.js';

const router = Router();
const upload = multer({ dest: 'uploads/' }); // Files temporarily stored in uploads/

router.use(authenticateToken);
router.use(requireRoles('SUPER_ADMIN', 'SCHOOL_ADMIN'));

router.post('/students', upload.single('file'), importStudents);

export default router;
