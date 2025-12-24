import { Router } from "express"
import {
    createClass,
    getAllClasses
} from "../controllers/class.controller"
import { authMiddleware } from "../middlewares/auth.middleware";

const router = Router();

router.post("/", authMiddleware, createClass);
router.get("/", authMiddleware, getAllClasses);

export default router;