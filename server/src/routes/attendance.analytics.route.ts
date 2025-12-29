import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher, requireRole } from "../middlewares/role.middleware";
import { 
    getStudentAttendancePercentage, 
    getClassAttendanceReport,
    getMonthlyClassAttendanceSummary 
} from "../controllers/attendance.analytics.controller";

const router = Router();

// Get attendance percentage for a student (All roles can access)
router.get("/student/percentage", authMiddleware, requireRole(["ADMIN", "TEACHER", "STUDENT"]), getStudentAttendancePercentage);

// Get class attendance report within date range (Teachers and Admin)
router.get("/class/report", authMiddleware, requireTeacher, getClassAttendanceReport);

// Get monthly attendance summary for a class (Teachers and Admin)
router.get("/class/monthly-summary", authMiddleware, requireTeacher, getMonthlyClassAttendanceSummary);

export default router;