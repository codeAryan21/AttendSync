import { Router } from "express";
import { 
    register,
    login,
    logout,
    changePassword,
    forgotPassword,
    verifyResetOTP,
    resetPassword,
    refreshAccessToken,
    getCurrentUser,
    getPublicSettings
} from "../controllers/auth.controller";
import { authMiddleware } from "../middlewares/auth.middleware";
import { validateBody } from "../middlewares/validate.middleware";
import { loginLimiter } from "../middlewares/rateLimit.middleware";
import { registerSchema, loginSchema, changePasswordSchema, forgotPasswordSchema, verifyResetOTPSchema, resetPasswordSchema } from "../schemas";

const router = Router();

router.post("/register", validateBody(registerSchema), register);
router.post("/login", loginLimiter, validateBody(loginSchema), login);
router.get("/current-user", authMiddleware, getCurrentUser);
router.post("/logout", authMiddleware, logout);
router.post("/change-password", authMiddleware, validateBody(changePasswordSchema), changePassword);
router.post("/forgot-password", validateBody(forgotPasswordSchema), forgotPassword);
router.post("/verify-reset-otp", validateBody(verifyResetOTPSchema), verifyResetOTP);
router.post("/reset-password", validateBody(resetPasswordSchema), resetPassword);
router.post("/refresh-token", refreshAccessToken)
router.get("/settings", authMiddleware, getPublicSettings);

export default router;