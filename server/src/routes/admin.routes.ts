import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireAdmin } from "../middlewares/role.middleware";
import {
    getAllUsers,
    deleteUser,
    getSystemStats
} from "../controllers/admin.controller";

const router = Router();

router.get("/users", authMiddleware, requireAdmin, getAllUsers);
router.delete("/users/:id", authMiddleware, requireAdmin, deleteUser);
router.get("/stats", authMiddleware, requireAdmin, getSystemStats);

export default router;