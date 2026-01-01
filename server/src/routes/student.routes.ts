import { Router } from "express"
import {
    getStudentsByClass,
    getStudentProfile,
    getStudentAttendance
} from "../controllers/student.controller"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher, requireStudent } from "../middlewares/role.middleware";

const router = Router();

// Routes for teachers and admin to manage students
router.get("/class/:classId", authMiddleware, requireTeacher, getStudentsByClass);

// Routes for students to manage their own profile
router.get("/profile", authMiddleware, requireStudent, getStudentProfile);
router.get("/attendance", authMiddleware, requireStudent, getStudentAttendance);

export default router;