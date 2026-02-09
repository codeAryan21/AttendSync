import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { 
    sendAbsentNotificationsManual,
    sendDailyReportsManual
} from "../controllers/notification.controller";

const router = Router();

// Admin check middleware
const adminOnly = (req: any, res: any, next: any) => {
    if (req.user?.role !== 'ADMIN') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
};

// Manual notification triggers (admin only)
router.post("/send-absent-notifications", authMiddleware, adminOnly, sendAbsentNotificationsManual);
router.post("/send-daily-reports", authMiddleware, adminOnly, sendDailyReportsManual);

export default router;