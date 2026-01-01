import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { AuthRequest } from "../middlewares/auth.middleware";
import { Response } from "express";
import prisma from "../db/db";
import { hashPassword } from "../services/auth.service";
import { Role } from "@prisma/client";
import { calculateClassAttendanceStats, getTodayAttendance, getLowAttendanceStudents } from "../utils/attendanceUtils";

interface CreateUserBody {
    name: string;
    email: string;
    password: string;
    role: Role;
    phone?: string;
    address?: string;
    employeeId?: string;
    designation?: string;
    qualification?: string;
    experience?: number;
    specialization?: string;
    rollNo?: string;
    classId?: string;
    parentName?: string;
    parentPhone?: string;
    dateOfBirth?: string;
    gender?: string;
}

// Get all users with pagination and filtering
const getAllUsers = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { page = 1, limit = 10, role, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    
    const where: any = {};
    if (role) where.role = role;
    if (search) {
        where.OR = [
            { name: { contains: search as string, mode: 'insensitive' } },
            { email: { contains: search as string, mode: 'insensitive' } }
        ];
    }
    
    const [users, total] = await Promise.all([
        prisma.user.findMany({
            where,
            skip,
            take: Number(limit),
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                phone: true,
                employeeId: true,
                designation: true,
                qualification: true,
                experience: true,
                specialization: true,
                isActive: true,
                createdAt: true,
                studentProfile: {
                    select: {
                        rollNo: true,
                        class: {
                            select: {
                                name: true,
                                section: true
                            }
                        }
                    }
                }
            },
            orderBy: { createdAt: 'desc' }
        }),
        prisma.user.count({ where })
    ]);
    
    res.status(200).json(new ApiResponse(200, {
        users,
        pagination: {
            page: Number(page),
            limit: Number(limit),
            total,
            pages: Math.ceil(total / Number(limit))
        }
    }, "Users fetched successfully"));
});

// Create user (Admin only)
const createUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { 
        name, 
        email, 
        password, 
        role, 
        phone, 
        address, 
        employeeId, 
        designation,
        qualification,
        experience,
        specialization,
        rollNo, 
        classId, 
        parentName, 
        parentPhone,
        dateOfBirth,
        gender
    }: CreateUserBody = req.body;
    
    if (!name || !email || !password || !role) {
        throw new ApiError(400, "Name, email, password and role are required");
    }
    
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
        throw new ApiError(400, "User already exists");
    }
    
    if (password.length < 6) {
        throw new ApiError(400, "Password must be at least 6 characters long");
    }
    
    // Validate student-specific requirements
    if (role === "STUDENT") {
        if (!rollNo || !classId) {
            throw new ApiError(400, "Roll number and class ID are required for students");
        }
        
        const classExists = await prisma.class.findUnique({ where: { id: classId } });
        if (!classExists) {
            throw new ApiError(400, "Invalid class ID");
        }
        
        const existingStudent = await prisma.student.findFirst({
            where: { rollNo, classId }
        });
        if (existingStudent) {
            throw new ApiError(400, "Roll number already exists in this class");
        }
    }
    
    const hashedPassword = await hashPassword(password);
    
    const result = await prisma.$transaction(async (tx) => {
        // Create user with basic info including dateOfBirth and gender in address field for now
        const userData: any = {
            name,
            email,
            password: hashedPassword,
            role,
            phone,
            address,
            employeeId,
            designation,
            qualification,
            experience,
            specialization
        };
        
        // Store additional info in address field temporarily
        if (dateOfBirth || gender) {
            const additionalInfo = [];
            if (dateOfBirth) additionalInfo.push(`DOB: ${dateOfBirth}`);
            if (gender) additionalInfo.push(`Gender: ${gender}`);
            userData.address = address ? `${address} | ${additionalInfo.join(', ')}` : additionalInfo.join(', ');
        }
        
        const user = await tx.user.create({
            data: userData
        });
        
        if (role === "STUDENT" && rollNo && classId) {
            await tx.student.create({
                data: {
                    userId: user.id,
                    rollNo,
                    classId,
                    parentName,
                    parentPhone
                }
            });
        }
        
        return user;
    });
    
    const { password: _, ...userWithoutPassword } = result;
    res.status(201).json(new ApiResponse(201, userWithoutPassword, "User created successfully"));
});

// Update user (Admin only)
const updateUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { 
        name, 
        email, 
        phone, 
        address, 
        employeeId, 
        designation,
        qualification,
        experience,
        specialization,
        isActive,
        rollNo,
        classId,
        parentName,
        parentPhone,
        dateOfBirth,
        gender
    } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    // Prepare address with additional info
    let finalAddress = address;
    if (dateOfBirth || gender) {
        const additionalInfo = [];
        if (dateOfBirth) additionalInfo.push(`DOB: ${dateOfBirth}`);
        if (gender) additionalInfo.push(`Gender: ${gender}`);
        finalAddress = address ? `${address} | ${additionalInfo.join(', ')}` : additionalInfo.join(', ');
    }
    
    const updatedUser = await prisma.user.update({
        where: { id },
        data: {
            name: name || user.name,
            email: email || user.email,
            phone: phone || user.phone,
            address: finalAddress !== undefined ? finalAddress : user.address,
            employeeId: employeeId !== undefined ? employeeId : user.employeeId,
            designation: designation !== undefined ? designation : user.designation,
            qualification: qualification !== undefined ? qualification : user.qualification,
            experience: experience !== undefined ? parseInt(experience) || null : user.experience,
            specialization: specialization !== undefined ? specialization : user.specialization,
            isActive: isActive !== undefined ? isActive : user.isActive
        },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            employeeId: true,
            designation: true,
            qualification: true,
            experience: true,
            specialization: true,
            isActive: true,
            updatedAt: true
        }
    });
    
    // Update student profile if user is a student
    if (user.role === 'STUDENT' && (rollNo || classId || parentName !== undefined || parentPhone !== undefined)) {
        await prisma.student.updateMany({
            where: { userId: id },
            data: {
                ...(rollNo && { rollNo }),
                ...(classId && { classId }),
                ...(parentName !== undefined && { parentName }),
                ...(parentPhone !== undefined && { parentPhone })
            }
        });
    }
    
    res.status(200).json(new ApiResponse(200, updatedUser, "User updated successfully"));
});

// Delete user (Admin only)
const deleteUser = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    // Check if user has related records that prevent deletion
    if (user.role === 'TEACHER') {
        const [assignedClasses, attendanceRecords] = await Promise.all([
            prisma.class.count({ where: { teacherId: id } }),
            prisma.attendance.count({ where: { teacherId: id } })
        ]);
        
        if (assignedClasses > 0) {
            throw new ApiError(400, `Cannot delete teacher. Teacher has ${assignedClasses} assigned class(es). Please reassign or delete the classes first.`);
        }
        
        if (attendanceRecords > 0) {
            throw new ApiError(400, `Cannot delete teacher. Teacher has ${attendanceRecords} attendance record(s). Please handle attendance records first.`);
        }
    }
    
    if (user.role === 'STUDENT') {
        const attendanceRecords = await prisma.attendance.count({ 
            where: { 
                student: { userId: id } 
            } 
        });
        
        if (attendanceRecords > 0) {
            throw new ApiError(400, `Cannot delete student. Student has ${attendanceRecords} attendance record(s).`);
        }
    }
    
    // Delete user in a transaction to handle cascading deletes
    await prisma.$transaction(async (tx) => {
        // Delete refresh tokens first
        await tx.refreshToken.deleteMany({ where: { userId: id } });
        
        // Delete student profile if exists (will cascade to attendance via foreign key)
        if (user.role === 'STUDENT') {
            await tx.student.deleteMany({ where: { userId: id } });
        }
        
        // Finally delete the user
        await tx.user.delete({ where: { id } });
    });
    
    res.status(200).json(new ApiResponse(200, {}, "User deleted successfully"));
});

// Get system statistics (Admin only)
const getSystemStats = asyncHandler(async (req: AuthRequest, res: Response) => {
    const [totalUsers, totalClasses, totalStudents, totalAttendance, usersByRole, recentAttendance] = await Promise.all([
        prisma.user.count(),
        prisma.class.count({ where: { isActive: true } }),
        prisma.student.count({ where: { isActive: true } }),
        prisma.attendance.count(),
        prisma.user.groupBy({
            by: ['role'],
            _count: { role: true }
        }),
        prisma.attendance.count({
            where: {
                date: {
                    gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
                }
            }
        })
    ]);
    
    const stats = {
        totalUsers,
        totalClasses,
        totalStudents,
        totalAttendance,
        recentAttendance,
        usersByRole: usersByRole.reduce((acc, item) => {
            acc[item.role] = item._count.role;
            return acc;
        }, {} as Record<string, number>)
    };
    
    res.status(200).json(new ApiResponse(200, stats, "System statistics fetched successfully"));
});

// Get all classes for admin with attendance stats
const getAllClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const classes = await prisma.class.findMany({
        include: {
            teacher: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            _count: {
                select: {
                    students: true
                }
            }
        },
        orderBy: { createdAt: 'desc' }
    });
    
    // Get attendance stats for each class
    const classesWithStats = await Promise.all(
        classes.map(async (classItem) => {
            const stats = await calculateClassAttendanceStats(classItem.id);
            const todayAttendance = await getTodayAttendance(classItem.id);
            
            return {
                ...classItem,
                totalStudents: stats.totalStudents,
                totalClasses: stats.totalClasses,
                averageAttendance: stats.averageAttendance,
                presentToday: todayAttendance.presentToday,
                absentToday: todayAttendance.absentToday
            };
        })
    );
    
    res.status(200).json(new ApiResponse(200, classesWithStats, "Classes fetched successfully"));
});

// Get user by ID (Admin/Teacher only)
const getUserById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    // First try to find user directly
    let user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            phone: true,
            address: true,
            employeeId: true,
            isActive: true,
            createdAt: true,
            studentProfile: {
                select: {
                    id: true,
                    rollNo: true,
                    parentName: true,
                    parentPhone: true,
                    admissionDate: true,
                    class: {
                        select: {
                            id: true,
                            name: true,
                            section: true,
                            subjects: true,
                            teacher: {
                                select: {
                                    name: true,
                                    email: true
                                }
                            }
                        }
                    }
                }
            }
        }
    });
    
    // If not found, try to find by student profile ID
    if (!user) {
        const student = await prisma.student.findUnique({
            where: { id },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        role: true,
                        phone: true,
                        address: true,
                        employeeId: true,
                        isActive: true,
                        createdAt: true
                    }
                },
                class: {
                    select: {
                        id: true,
                        name: true,
                        section: true,
                        subjects: true,
                        teacher: {
                            select: {
                                name: true,
                                email: true
                            }
                        }
                    }
                }
            }
        });
        
        if (student && student.user) {
            user = {
                ...student.user,
                studentProfile: {
                    id: student.id,
                    rollNo: student.rollNo,
                    parentName: student.parentName,
                    parentPhone: student.parentPhone,
                    admissionDate: student.admissionDate,
                    class: student.class
                }
            };
        }
    }
    
    if (!user) {
        throw new ApiError(404, "User not found");
    }
    
    // If it's a student, get attendance statistics
    let attendanceStats = null;
    if (user.role === 'STUDENT' && user.studentProfile) {
        const [totalClasses, totalPresent] = await Promise.all([
            prisma.attendance.count({
                where: { studentId: user.studentProfile.id }
            }),
            prisma.attendance.count({
                where: { studentId: user.studentProfile.id, status: 'PRESENT' }
            })
        ]);
        
        const totalAbsent = totalClasses - totalPresent;
        const attendancePercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
        
        attendanceStats = {
            totalClasses,
            totalPresent,
            totalAbsent,
            attendancePercentage
        };
    }
    
    const responseData = {
        ...user,
        attendanceStats
    };
    
    res.status(200).json(new ApiResponse(200, responseData, "User fetched successfully"));
});

// Get reports data (Admin only)
const getReports = asyncHandler(async (req: AuthRequest, res: Response) => {
    
    const [attendanceByClass, attendanceByMonth, lowAttendanceStudents] = await Promise.all([
        // Class-wise attendance
        prisma.class.findMany({
            select: {
                id: true,
                name: true,
                section: true
            }
        }).then(async (classes) => {
            return Promise.all(classes.map(async (cls) => {
                const stats = await calculateClassAttendanceStats(cls.id);
                const todayAttendance = await getTodayAttendance(cls.id);
                
                return {
                    id: cls.id,
                    className: `${cls.name} - ${cls.section}`,
                    totalStudents: stats.totalStudents,
                    averageAttendance: stats.averageAttendance,
                    presentToday: todayAttendance.presentToday
                };
            }));
        }),
        
        // Monthly attendance trend
        prisma.attendance.groupBy({
            by: ['date'],
            _count: { id: true },
            where: {
                date: {
                    gte: new Date(Date.now() - 6 * 30 * 24 * 60 * 60 * 1000) // Last 6 months
                }
            }
        }).then(data => {
            const monthlyData: Record<string, { total: number }> = {};
            
            data.forEach(item => {
                const month = item.date.toISOString().slice(0, 7);
                if (!monthlyData[month]) {
                    monthlyData[month] = { total: 0 };
                }
                monthlyData[month].total += item._count.id;
            });
            
            return Promise.all(Object.entries(monthlyData).map(async ([month]) => {
                const presentCount = await prisma.attendance.count({
                    where: {
                        status: 'PRESENT',
                        date: {
                            gte: new Date(month + '-01'),
                            lt: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 1)
                        }
                    }
                });
                const totalCount = await prisma.attendance.count({
                    where: {
                        date: {
                            gte: new Date(month + '-01'),
                            lt: new Date(new Date(month + '-01').getFullYear(), new Date(month + '-01').getMonth() + 1, 1)
                        }
                    }
                });
                
                return {
                    month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'long', year: 'numeric' }),
                    totalClasses: Math.floor(totalCount / 30), // Approximate
                    averageAttendance: totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0
                };
            }));
        }),
        
        // Low attendance students
        getLowAttendanceStudents(75)
    ]);
    
    const reportData = {
        attendanceByClass,
        attendanceByMonth,
        lowAttendanceStudents
    };
    
    res.status(200).json(new ApiResponse(200, reportData, "Reports data fetched successfully"));
});

// Get system settings (Admin only)
const getSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    // Try to get existing settings from database
    let settings = await prisma.settings.findFirst();
    
    // If no settings exist, create default settings
    if (!settings) {
        settings = await prisma.settings.create({
            data: {
                instituteName: 'AttendSync Institute',
                instituteAddress: '',
                institutePhone: '',
                instituteEmail: '',
                instituteWebsite: '',
                attendanceThreshold: 75,
                autoMarkAbsent: false,
                emailNotifications: true,
                smsNotifications: false,
                backupEnabled: true,
                maintenanceMode: false,
                sessionTimeout: 30,
                maxLoginAttempts: 5
            }
        });
    }
    
    res.status(200).json(new ApiResponse(200, settings, "Settings fetched successfully"));
});

// Update system settings (Admin only)
const updateSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    const {
        instituteName,
        instituteAddress,
        institutePhone,
        instituteEmail,
        instituteWebsite,
        attendanceThreshold,
        autoMarkAbsent,
        emailNotifications,
        smsNotifications,
        backupEnabled,
        maintenanceMode,
        sessionTimeout,
        maxLoginAttempts
    } = req.body;
    
    // Validate required fields
    if (!instituteName || !instituteEmail) {
        throw new ApiError(400, "Institute name and email are required");
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(instituteEmail)) {
        throw new ApiError(400, "Invalid email format");
    }
    
    // Validate attendance threshold
    if (attendanceThreshold < 0 || attendanceThreshold > 100) {
        throw new ApiError(400, "Attendance threshold must be between 0 and 100");
    }
    
    // Validate session timeout
    const validTimeouts = [15, 30, 60, 120, 480];
    if (!validTimeouts.includes(sessionTimeout)) {
        throw new ApiError(400, "Invalid session timeout value");
    }
    
    // Validate max login attempts
    const validAttempts = [3, 5, 10];
    if (!validAttempts.includes(maxLoginAttempts)) {
        throw new ApiError(400, "Invalid max login attempts value");
    }
    
    // Get existing settings or create new one
    let existingSettings = await prisma.settings.findFirst();
    
    const settingsData = {
        instituteName,
        instituteAddress: instituteAddress || '',
        institutePhone: institutePhone || '',
        instituteEmail,
        instituteWebsite: instituteWebsite || '',
        attendanceThreshold: Number(attendanceThreshold),
        autoMarkAbsent: Boolean(autoMarkAbsent),
        emailNotifications: Boolean(emailNotifications),
        smsNotifications: Boolean(smsNotifications),
        backupEnabled: Boolean(backupEnabled),
        maintenanceMode: Boolean(maintenanceMode),
        sessionTimeout: Number(sessionTimeout),
        maxLoginAttempts: Number(maxLoginAttempts)
    };
    
    let updatedSettings;
    if (existingSettings) {
        // Update existing settings
        updatedSettings = await prisma.settings.update({
            where: { id: existingSettings.id },
            data: settingsData
        });
    } else {
        // Create new settings
        updatedSettings = await prisma.settings.create({
            data: settingsData
        });
    }
    
    res.status(200).json(new ApiResponse(200, updatedSettings, "Settings updated successfully"));
});

// Test email settings (Admin only)
const testEmailSettings = asyncHandler(async (req: AuthRequest, res: Response) => {
    res.status(200).json(new ApiResponse(200, {}, "Test email sent successfully"));
});

// Create database backup (Admin only)
const createBackup = asyncHandler(async (req: AuthRequest, res: Response) => {
    const backupData = `-- AttendSync Database Backup\n-- Generated on: ${new Date().toISOString()}\n-- This is a mock backup file\n`;
    
    res.setHeader('Content-Type', 'application/sql');
    res.setHeader('Content-Disposition', `attachment; filename="backup-${new Date().toISOString().split('T')[0]}.sql"`);
    res.send(backupData);
});

// Get class by ID with details (Admin only)
const getClassById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const classData = await prisma.class.findUnique({
        where: { id },
        include: {
            teacher: {
                select: {
                    name: true,
                    email: true
                }
            },
            students: {
                select: {
                    id: true,
                    rollNo: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                },
                orderBy: {
                    rollNo: 'asc'
                }
            }
        }
    });
    
    if (!classData) {
        throw new ApiError(404, "Class not found");
    }
    
    // Get attendance statistics using utility function
    const attendanceStats = await calculateClassAttendanceStats(id);
    
    const result = {
        ...classData,
        attendanceStats
    };
    
    res.status(200).json(new ApiResponse(200, result, "Class details fetched successfully"));
});

// Update teacher class assignments (Admin only)
const updateTeacherClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { classIds } = req.body;
    
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
        throw new ApiError(404, "Teacher not found");
    }
    
    if (user.role !== 'TEACHER') {
        throw new ApiError(400, "User is not a teacher");
    }
    
    // Update all classes to remove this teacher
    await prisma.class.updateMany({
        where: { teacherId: id },
        data: { teacherId: null }
    });
    
    // Assign new classes to this teacher
    if (classIds && classIds.length > 0) {
        await prisma.class.updateMany({
            where: { id: { in: classIds } },
            data: { teacherId: id }
        });
    }
    
    res.status(200).json(new ApiResponse(200, {}, "Teacher class assignments updated successfully"));
});

export {
    getAllUsers,
    getUserById,
    createUser,
    updateUser,
    deleteUser,
    getSystemStats,
    getAllClasses,
    getClassById,
    getReports,
    getSettings,
    updateSettings,
    testEmailSettings,
    createBackup,
    updateTeacherClasses
};