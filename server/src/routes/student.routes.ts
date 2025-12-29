import { Router } from "express"
import {
    addStudent,
    getStudents,
    updateStudent,
    deleteStudent
} from "../controllers/student.controller"
import { authMiddleware } from "../middlewares/auth.middleware";
import { requireTeacher } from "../middlewares/role.middleware";

const router = Router();

router.post("/", authMiddleware, requireTeacher, addStudent);
router.get("/:classId", authMiddleware, requireTeacher, getStudents);
router.put("/:id", authMiddleware, requireTeacher, updateStudent);
router.delete("/:id", authMiddleware, requireTeacher, deleteStudent);

export default router;