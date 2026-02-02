import { Router } from "express"
import {
    createClass,
    getAllClasses,
    updateClass,
    deleteClass,
    getClassById
} from "../controllers/class.controller"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireRole, requireTeacher } from "../middlewares/role.middleware";
import { validateBody, validateParams } from "../middlewares/validate.middleware";
import { createClassSchema, updateClassSchema, idSchema } from "../schemas";

const router = Router();

router.post("/", authMiddleware, requireRole(["ADMIN"]), validateBody(createClassSchema), createClass);
router.get("/", authMiddleware, getAllClasses);
router.get("/:id", authMiddleware, requireTeacher, validateParams(idSchema), getClassById);
router.put("/:id", authMiddleware, requireRole(["ADMIN"]), validateParams(idSchema), validateBody(updateClassSchema), updateClass);
router.delete("/:id", authMiddleware, requireRole(["ADMIN"]), validateParams(idSchema), deleteClass);

export default router;