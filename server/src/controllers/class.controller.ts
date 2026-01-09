import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";
import { Role } from "@prisma/client";

interface createClassBody {
    name: string;
    course: string;
    subjects: string[];
    academicYear: string;
    section: string;
    schedule?: string;
    description?: string;
    teacherId?: string;
    subjectTeachers?: Array<{
        subject: string;
        teacherId: string;
    }>;
}

interface updateClassBody {
    name: string;
    course: string;
    subjects: string[];
    academicYear: string;
    section: string;
    schedule?: string;
    description?: string;
    teacherId?: string;
    subjectTeachers?: Array<{
        subject: string;
        teacherId: string;
    }>;
}

// create class
const createClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { name, course, subjects, academicYear, section, schedule, description, teacherId, subjectTeachers }: createClassBody = req.body;
    
    // Enhanced validation
    if (!name?.trim()) throw new ApiError(400, "Class name is required");
    if (!course?.trim()) throw new ApiError(400, "Course is required");
    if (!subjects || !Array.isArray(subjects) || subjects.length === 0) {
        throw new ApiError(400, "At least one subject is required");
    }
    if (!academicYear?.trim()) throw new ApiError(400, "Academic year is required");
    if (!section?.trim()) throw new ApiError(400, "Section is required");

    if (req.user?.role !== Role.ADMIN) {
        throw new ApiError(403, "Only admins can create classes");
    }

    const validSubjects = subjects.filter(s => s?.trim());
    if (validSubjects.length === 0) {
        throw new ApiError(400, "All subjects must have valid names");
    }

    // Validate subject-teacher assignments
    if (subjectTeachers && Array.isArray(subjectTeachers)) {
        for (const assignment of subjectTeachers) {
            if (assignment.subject?.trim() && assignment.teacherId?.trim()) {
                const teacher = await prisma.user.findUnique({
                    where: { id: assignment.teacherId, role: Role.TEACHER }
                });
                if (!teacher) {
                    throw new ApiError(400, `Teacher not found for subject: ${assignment.subject}`);
                }
            }
        }
    }

    if (teacherId?.trim()) {
        const teacher = await prisma.user.findUnique({
            where: { id: teacherId, role: Role.TEACHER }
        });
        if (!teacher) {
            throw new ApiError(404, "Main teacher not found");
        }
    }

    const classExists = await prisma.class.findFirst({
        where: {
            name: name.trim(),
            course: course.trim(),
            academicYear: academicYear.trim(),
            section: section.trim()
        }
    });
    if (classExists) {
        throw new ApiError(400, "Class with same name, course, academic year and section already exists");
    }

    const createData: any = {
        name: name.trim(),
        course: course.trim(),
        subjects: validSubjects,
        academicYear: academicYear.trim(),
        section: section.trim(),
        schedule: schedule?.trim() || null,
        description: description?.trim() || null
    };
    
    if (teacherId?.trim()) {
        createData.teacherId = teacherId;
    }

    // Store subject teachers in metadata
    if (subjectTeachers && Array.isArray(subjectTeachers) && subjectTeachers.length > 0) {
        const validAssignments = subjectTeachers.filter(st => st.subject?.trim() && st.teacherId?.trim());
        if (validAssignments.length > 0) {
            createData.metadata = { subjectTeachers: validAssignments };
        }
    }

    const newClass = await prisma.class.create({
        data: createData,
        include: {
            teacher: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            _count: {
                select: { students: true }
            }
        }
    });
    
    res.status(201).json(new ApiResponse(201, newClass, "Class created successfully"));
})

// get all classes
const getAllClasses = asyncHandler(async (req: AuthRequest, res: Response) => {
    const teacherId = req.user?.id;
    const userRole = req.user?.role;
    
    let whereClause = {};
    if (userRole === Role.TEACHER) {
        whereClause = { teacherId };
    }
    
    const classes = await prisma.class.findMany({
        where: whereClause,
        include: { 
            teacher: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            },
            _count: {
                select: { students: true }
            }
        }
    });
    res.status(200).json(new ApiResponse(200, classes, "Classes fetched successfully"));
})

// update class
const updateClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    const { name, course, subjects, academicYear, section, schedule, description, teacherId: newTeacherId, subjectTeachers }: updateClassBody = req.body;
    const currentUserId = req.user?.id;
    
    if (!name || !course || !subjects || !academicYear || !section) {
        throw new ApiError(400, "Name, course, subjects, academic year and section are required");
    }
    
    const existingClass = await prisma.class.findUnique({
        where: { id }
    });
    
    if (!existingClass) {
        throw new ApiError(404, "Class not found");
    }
    
    if (existingClass.teacherId !== currentUserId && req.user?.role !== Role.ADMIN) {
        throw new ApiError(403, "Not authorized to update this class");
    }
    
    const updateData: any = { 
        name,
        course,
        subjects,
        academicYear,
        section,
        schedule,
        description,
        ...(newTeacherId !== undefined && { teacherId: newTeacherId })
    };
    
    // Update subject teachers in metadata
    if (subjectTeachers && Array.isArray(subjectTeachers)) {
        const validAssignments = subjectTeachers.filter(st => st.subject?.trim() && st.teacherId?.trim());
        updateData.metadata = validAssignments.length > 0 ? { subjectTeachers: validAssignments } : null;
    }
    
    const updatedClass = await prisma.class.update({
        where: { id },
        data: updateData,
        include: {
            teacher: {
                select: {
                    id: true,
                    name: true,
                    email: true
                }
            }
        }
    });
    
    res.status(200).json(new ApiResponse(200, updatedClass, "Class updated successfully"));
})

// delete class
const deleteClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    const existingClass = await prisma.class.findUnique({
        where: { id },
        include: {
            students: true,
            attendance: true
        }
    });
    
    if (!existingClass) {
        throw new ApiError(404, "Class not found");
    }
    
    // Check if class has students or attendance records
    if (existingClass.students.length > 0) {
        throw new ApiError(400, "Cannot delete class with enrolled students. Please reassign students first.");
    }
    
    if (existingClass.attendance.length > 0) {
        throw new ApiError(400, "Cannot delete class with attendance records.");
    }
    
    await prisma.class.delete({
        where: { id }
    });
    
    res.status(200).json(new ApiResponse(200, {}, "Class deleted successfully"));
})

// Get class by ID (for teachers to view class details)
const getClassById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { id } = req.params;
    
    if (!id) {
        throw new ApiError(400, "Class ID is required");
    }
    
    const classData = await prisma.class.findUnique({
        where: { id },
        include: {
            teacher: {
                select: {
                    id: true,
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
                            id: true,
                            name: true,
                            email: true
                        }
                    }
                },
                orderBy: { rollNo: 'asc' }
            },
            _count: {
                select: { students: true }
            }
        }
    });
    
    if (!classData) {
        throw new ApiError(404, "Class not found");
    }
    
    // Check if teacher has access to this class
    if (req.user?.role === Role.TEACHER && classData.teacherId !== req.user?.id) {
        throw new ApiError(403, "You can only view your own classes");
    }
    
    // Calculate attendance stats
    const totalAttendance = await prisma.attendance.count({
        where: { classId: id }
    });
    
    const presentCount = await prisma.attendance.count({
        where: { classId: id, status: 'PRESENT' }
    });
    
    const uniqueDates = await prisma.attendance.findMany({
        where: { classId: id },
        select: { date: true },
        distinct: ['date']
    });
    
    const totalClasses = uniqueDates.length;
    const totalStudents = classData._count.students;
    const averageAttendance = totalClasses > 0 && totalStudents > 0 
        ? Math.round((presentCount / (totalStudents * totalClasses)) * 100) 
        : 0;
    
    const classWithStats = {
        ...classData,
        attendanceStats: {
            totalClasses,
            averageAttendance,
            totalStudents
        }
    };
    
    res.status(200).json(new ApiResponse(200, classWithStats, "Class details fetched successfully"));
});

export {
    createClass, 
    getAllClasses,
    updateClass,
    deleteClass,
    getClassById
}