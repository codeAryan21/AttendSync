import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import { validateBody, validateParams, validateQuery } from "../middlewares/validate.middleware";
import { createUserSchema, updateUserSchema, idSchema, classIdSchema, adminUsersQuerySchema } from "../schemas";
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
router.get("/users/:id", authMiddleware, requireAdmin, validateParams(idSchema), getUserById);
router.post("/users", authMiddleware, requireAdmin, validateBody(createUserSchema), createUser);
router.put("/users/:id", authMiddleware, requireAdmin, validateParams(idSchema), validateBody(updateUserSchema), updateUser);
router.put("/users/:id/classes", authMiddleware, requireAdmin, validateParams(idSchema), updateTeacherClasses);
router.delete("/users/:id", authMiddleware, requireAdmin, validateParams(idSchema), deleteUser);

// System routes
router.get("/stats", authMiddleware, requireAdmin, getSystemStats);
router.get("/classes", authMiddleware, requireAdmin, getAllClasses);
router.get("/classes/:id", authMiddleware, requireAdmin, validateParams(idSchema), getClassById);
router.get("/reports", authMiddleware, requireAdmin, getReports);
router.get("/reports/overall", authMiddleware, requireAdmin, getOverallReport);
router.get("/reports/class/:classId", authMiddleware, requireAdmin, validateParams(classIdSchema), getClassAttendanceDetails);
router.get("/settings", authMiddleware, requireAdmin, getSettings);
router.put("/settings", authMiddleware, requireAdmin, updateSettings);
router.post("/settings/test-email", authMiddleware, requireAdmin, testEmailSettings);
router.post("/backup", authMiddleware, requireAdmin, createBackup);

export default router;