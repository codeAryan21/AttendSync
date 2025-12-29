import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Response } from "express";
import prisma from "../db/db";

// Get all users (Admin only)
const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const users = await prisma.user.findMany({
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true
        }
    });
    res.status(200).json(new ApiResponse(200, users, "Users fetched successfully"));
});

// Delete user (Admin only)
const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    await prisma.user.delete({ where: { id } });
    res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});

// Get system statistics (Admin only)
const getSystemStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const [totalUsers, totalClasses, totalStudents, totalAttendance] = await Promise.all([
        prisma.user.count(),
        prisma.class.count(),
        prisma.student.count(),
        prisma.attendance.count()
    ]);
    
    const stats = {
        totalUsers,
        totalClasses,
        totalStudents,
        totalAttendance
    };
    
    res.status(200).json(new ApiResponse(200, stats, "System statistics fetched successfully"));
});

export {
    getAllUsers,
    deleteUser,
    getSystemStats
};