import { Router } from "express"
import {
    createClass,
    getAllClasses,
    updateClass,
    deleteClass
} from "../controllers/class.controller"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const router = Router();

router.post("/", authMiddleware, requireRole(["ADMIN"]), createClass);
router.get("/", authMiddleware, getAllClasses);
router.put("/:id", authMiddleware, requireRole(["ADMIN"]), updateClass);
router.delete("/:id", authMiddleware, requireRole(["ADMIN"]), deleteClass);

export default router;