import { Router } from "express";
import { authenticateToken, requireRoles } from "../../middleware/auth.js";
import { asyncHandler } from "../../utils/async-handler.js";
import { createMedicalRecord, getMedicalDashboard } from "../../controllers/medical.controller.js";

const router = Router();

router.use(authenticateToken);
router.use(requireRoles("SUPER_ADMIN", "SCHOOL_ADMIN"));

router.get("/", asyncHandler(getMedicalDashboard));
router.post("/:category", asyncHandler(createMedicalRecord));

export default router;
