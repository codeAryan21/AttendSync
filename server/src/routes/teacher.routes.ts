import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { updateUserSchema } from "../schemas";
import { updateTeacherProfile, getTeacherProfile } from "../controllers/teacher.controller";

const router = Router();

router.get("/profile", authMiddleware, requireRole(["TEACHER"]), getTeacherProfile);
router.put("/profile", authMiddleware, requireRole(["TEACHER"]), validateBody(updateUserSchema), updateTeacherProfile);

export default router;