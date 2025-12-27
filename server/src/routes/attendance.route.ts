import { Router } from "express"
import { authMiddleware } from "../middlewares/auth.middleware";
import { 
    markAttendance, 
    toggleAttendance,
    getAttendanceByClassAndDate,
    bulkSyncAttendance 
} from "../controllers/attendance.controller";

const router = Router();

// Mark attendance
router.post("/", authMiddleware, markAttendance);

// Toggle attendance
router.put("/toggle", authMiddleware, toggleAttendance);

// Get attendance by class & date
router.get("/", authMiddleware, getAttendanceByClassAndDate);

// Offline bulk sync attendance
router.post("/bulk-sync", authMiddleware, bulkSyncAttendance);

export default router;