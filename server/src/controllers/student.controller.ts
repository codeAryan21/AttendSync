import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";
import { Role } from "@prisma/client";

// Get students by class (for teachers and admin)
const getStudentsByClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    const { page = 1, limit = 10, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    if (!classId) {
        throw new ApiError(400, "ClassId is required");
    }

    const classExists = await prisma.class.findFirst({
        where: { id: classId as string }
    });
    if (!classExists) {
        throw new ApiError(400, "Class does not exist");
    }
    
    // Allow admin to view any class, teachers only their own
    if (req.user?.role === Role.TEACHER && classExists.teacherId !== req.user?.id) {
        throw new ApiError(403, "You are not authorized to view this class");
    }

    const where: any = { classId: classId as string, isActive: true };
    if (search) {
        where.user = {
            name: { contains: search as string, mode: 'insensitive' }
        };
    }

    const [students, total] = await Promise.all([
        prisma.student.findMany({
            where,
            skip,
            take: Number(limit),
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        phone: true,
                        isActive: true
                    }
                },
                class: {
                    select: {
                        name: true,
                        section: true,
                        subjects: true
                    }
                }
            },
            orderBy: { rollNo: 'asc' }
        }),
        prisma.student.count({ where })
    ]);
    
    res.status(200).json(new ApiResponse(200, {
        students,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    }, "Students fetched successfully"));
});

// Get student profile (for students to view their own profile)
const getStudentProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    
    if (req.user?.role !== Role.STUDENT) {
        throw new ApiError(403, "Only students can access this endpoint");
    }
    
    const student = await prisma.student.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true,
                    section: true,
                    subjects: true,
                    schedule: true,
                    teacher: {
                        select: {
                            name: true,
                            email: true,
                            phone: true
                        }
                    }
                }
            }
        }
    });
    
    if (!student) {
        throw new ApiError(404, "Student profile not found");
    }
    
    res.status(200).json(new ApiResponse(200, student, "Student profile fetched successfully"));
});



// Get student attendance (for students to view their own attendance)
const getStudentAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { startDate, endDate, page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    if (req.user?.role !== Role.STUDENT) {
        throw new ApiError(403, "Only students can access this endpoint");
    }
    
    const student = await prisma.student.findUnique({
        where: { userId }
    });
    
    if (!student) {
        throw new ApiError(404, "Student profile not found");
    }
    
    const where: any = { studentId: student.id };
    if (startDate && endDate) {
        where.date = {
            gte: new Date(startDate as string),
            lte: new Date(endDate as string)
        };
    }
    
    const [attendance, total] = await Promise.all([
        prisma.attendance.findMany({
            where,
            skip,
            take: Number(limit),
            include: {
                class: {
                    select: {
                        name: true,
                        subjects: true
                    }
                },
                teacher: {
                    select: {
                        name: true
                    }
                }
            },
            orderBy: { date: 'desc' }
        }),
        prisma.attendance.count({ where })
    ]);
    
    // Calculate attendance statistics
    const totalPresent = await prisma.attendance.count({
        where: { ...where, status: 'PRESENT' }
    });
    
    const attendancePercentage = total > 0 ? (totalPresent / total) * 100 : 0;
    
    res.status(200).json(new ApiResponse(200, {
        attendance,
        statistics: {
            totalClasses: total,
            totalPresent,
            totalAbsent: total - totalPresent,
            attendancePercentage: Math.round(attendancePercentage * 100) / 100
        },
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    }, "Student attendance fetched successfully"));
});

export {
    getStudentsByClass,
    getStudentProfile,
    getStudentAttendance
};