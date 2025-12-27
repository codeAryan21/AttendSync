import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { 
    getStudentAttendancePercentage, 
    getClassAttendanceReport,
    getMonthlyClassAttendanceSummary 
} from "../controllers/attendance.analytics.controller";

const router = Router();

// Get attendance percentage for a student
router.get("/student/:studentId/percentage", authMiddleware, getStudentAttendancePercentage);

// Get class attendance report within date range
router.get("/class/report", authMiddleware, getClassAttendanceReport);

// Get monthly attendance summary for a class
router.get("/class/monthly-summary", authMiddleware, getMonthlyClassAttendanceSummary);

export default router;