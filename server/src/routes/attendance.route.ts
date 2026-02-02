import { Router } from "express"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher, requireAdmin } from "../middlewares/role.middleware";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware";
import { markAttendanceSchema, bulkAttendanceSchema, attendanceQuerySchema, classIdSchema } from "../schemas";
import { 
    markAttendance, 
    toggleAttendance,
    getAttendanceByClassAndDate,
    getAttendanceByClass,
    bulkSyncAttendance 
} from "../controllers/attendance.controller";

const router = Router();

// Mark attendance (Teachers only)
router.post("/", authMiddleware, requireTeacher, validateBody(markAttendanceSchema), markAttendance);

// Toggle attendance (Teachers only)
router.put("/toggle", authMiddleware, requireTeacher, validateBody(markAttendanceSchema), toggleAttendance);

// Get attendance by class & date (Teachers and Admin)
router.get("/", authMiddleware, requireTeacher, validateQuery(attendanceQuerySchema), getAttendanceByClassAndDate);

// Get attendance by class ID (Teachers and Admin)
router.get("/:classId", authMiddleware, requireTeacher, validateParams(classIdSchema), getAttendanceByClass);

// Offline bulk sync attendance (Teachers only)
router.post("/bulk-sync", authMiddleware, requireTeacher, validateBody(bulkAttendanceSchema), bulkSyncAttendance);

export default router;