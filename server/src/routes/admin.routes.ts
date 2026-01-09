import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getSystemStats,
    getAllClasses,
    getClassById,
    getReports,
    getClassAttendanceDetails,
    getOverallReport,
    getSettings,
    updateSettings,
    testEmailSettings,
    createBackup,
    updateTeacherClasses
} from "../controllers/admin.controller";

const router = Router();

// User management routes
router.get("/users", authMiddleware, requireAdmin, getAllUsers);
router.get("/users/:id", authMiddleware, requireAdmin, getUserById);
router.post("/users", authMiddleware, requireAdmin, createUser);
router.put("/users/:id", authMiddleware, requireAdmin, updateUser);
router.put("/users/:id/classes", authMiddleware, requireAdmin, updateTeacherClasses);
router.delete("/users/:id", authMiddleware, requireAdmin, deleteUser);

// System routes
router.get("/stats", authMiddleware, requireAdmin, getSystemStats);
router.get("/classes", authMiddleware, requireAdmin, getAllClasses);
router.get("/classes/:id", authMiddleware, requireAdmin, getClassById);
router.get("/reports", authMiddleware, requireAdmin, getReports);
router.get("/reports/overall", authMiddleware, requireAdmin, getOverallReport);
router.get("/reports/class/:classId", authMiddleware, requireAdmin, getClassAttendanceDetails);
router.get("/settings", authMiddleware, requireAdmin, getSettings);
router.put("/settings", authMiddleware, requireAdmin, updateSettings);
router.post("/settings/test-email", authMiddleware, requireAdmin, testEmailSettings);
router.post("/backup", authMiddleware, requireAdmin, createBackup);

export default router;