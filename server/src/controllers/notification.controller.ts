import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import { sendAbsentNotifications, sendDailyReports } from "../services/notification.service";

// Send absent notifications for a specific date
const sendAbsentNotificationsManual = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date } = req.body;
    
    // If no date provided, use today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    await sendAbsentNotifications(targetDate);
    
    res.status(200).json(new ApiResponse(200, null, "Absent notifications sent successfully"));
});

// Send daily reports for a specific date
const sendDailyReportsManual = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { date } = req.body;
    
    // If no date provided, use today
    const targetDate = date ? new Date(date) : new Date();
    targetDate.setHours(0, 0, 0, 0);
    
    await sendDailyReports(targetDate);
    
    res.status(200).json(new ApiResponse(200, null, "Daily reports sent successfully"));
});

export {
    sendAbsentNotificationsManual,
    sendDailyReportsManual
};