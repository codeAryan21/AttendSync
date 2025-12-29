import { Router } from "express"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher } from "../middlewares/role.middleware";
import { 
    markAttendance, 
    toggleAttendance,
    getAttendanceByClassAndDate,
    bulkSyncAttendance 
} from "../controllers/attendance.controller";

const router = Router();

// Mark attendance (Teachers only)
router.post("/", authMiddleware, requireTeacher, markAttendance);

// Toggle attendance (Teachers only)
router.put("/toggle", authMiddleware, requireTeacher, toggleAttendance);

// Get attendance by class & date (Teachers and Admin)
router.get("/", authMiddleware, requireTeacher, getAttendanceByClassAndDate);

// Offline bulk sync attendance (Teachers only)
router.post("/bulk-sync", authMiddleware, requireTeacher, bulkSyncAttendance);

export default router;