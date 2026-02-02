import { Router } from "express"
import {
    getStudentsByClass,
    getStudentProfile,
    updateStudentProfile,
    getStudentAttendance,
    getStudentById,
    getStudentAttendanceReport
} from "../controllers/student.controller"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher, requireStudent } from "../middlewares/role.middleware";
import { validateParams, validateBody } from "../middlewares/validate.middleware";
import { classIdSchema, updateStudentSchema } from "../schemas";
import { z } from "zod";

const router = Router();

// Routes for teachers and admin to manage students
router.get("/class/:classId", authMiddleware, requireTeacher, validateParams(classIdSchema), getStudentsByClass);
router.get("/profile/:studentId", authMiddleware, requireTeacher, validateParams(z.object({ studentId: z.string().uuid() })), getStudentById);

// Routes for students to manage their own profile
router.get("/profile", authMiddleware, requireStudent, getStudentProfile);
router.put("/profile", authMiddleware, requireStudent, validateBody(updateStudentSchema), updateStudentProfile);
router.get("/attendance", authMiddleware, requireStudent, getStudentAttendance);
router.get("/attendance/report", authMiddleware, requireStudent, getStudentAttendanceReport);

export default router;