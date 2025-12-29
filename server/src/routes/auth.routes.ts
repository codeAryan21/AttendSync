import { Router } from "express";
import { 
    register,
    login,
    logout,
    changePassword,
    forgotPassword,
    resetPassword,
    refreshAccessToken,
    getCurrentUser
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validate } from "../middlewares/validate.middleware";
import { loginLimiter } from "../middlewares/rateLimit.middleware";

const router = Router();

router.post("/register", validate("register"), register);
router.post("/login",loginLimiter, validate("login"), login);
router.get("/current-user", authMiddleware, getCurrentUser);
router.post("/logout", authMiddleware, logout);
router.post("/change-password", authMiddleware, changePassword);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/refresh-token", refreshAccessToken)

export default router;