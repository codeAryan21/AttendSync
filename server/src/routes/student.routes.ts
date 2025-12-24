import { Router } from "express"
import {
    addStudent,
    getStudents,
    updateStudent,
    deleteStudent
} from "../controllers/student.controller"
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, addStudent);
router.get("/:classId", authMiddleware, getStudents);
router.put("/:id", authMiddleware, updateStudent);
router.delete("/:id", authMiddleware, deleteStudent);

export default router;