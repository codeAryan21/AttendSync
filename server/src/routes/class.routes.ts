import { Router } from "express"
import {
    createClass,
    getAllClasses,
    updateClass,
    deleteClass
} from "../controllers/class.controller"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher } from "../middlewares/role.middleware";

const router = Router();

router.post("/", authMiddleware, requireTeacher, createClass);
router.get("/", authMiddleware, requireTeacher, getAllClasses);
router.put("/:id", authMiddleware, requireTeacher, updateClass);
router.delete("/:id", authMiddleware, requireTeacher, deleteClass);

export default router;