import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { updateTeacherProfile, getTeacherProfile } from "../controllers/teacher.controller";

const router = Router();

router.get("/profile", authMiddleware, requireRole(["TEACHER"]), getTeacherProfile);
router.put("/profile", authMiddleware, requireRole(["TEACHER"]), updateTeacherProfile);

export default router;