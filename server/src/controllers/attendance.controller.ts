import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/apiError";
import { ApiResponse } from "../utils/apiResponse";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";
import prisma from "../db/db";
import { AttendanceStatus } from "@prisma/client";

interface markAttendanceBody {
    studentId: string;
    classId: string;
    date: string;
    status: AttendanceStatus;
}

interface toggleAttendanceBody {
    studentId: string;
    classId: string;
    date: string;
}

interface bulkSyncBody {
    records: {
        studentId: string;
        classId: string;
        date: string;
        status: AttendanceStatus;
    }[];
}

// mark attendance
const markAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { studentId, classId, date, status }: markAttendanceBody = req.body;
    const teacherId = req.user!.id;
    if (!studentId || !classId || !date || !status) {
        throw new ApiError(400, "Student ID, class ID, date and status are required");
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
    }

    // Validate student exists
    const student = await prisma.student.findUnique({
        where: { id: studentId }
    });
    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    // Validate class exists
    const classExists = await prisma.class.findUnique({
        where: { id: classId }
    });
    if (!classExists) {
        throw new ApiError(404, "Class not found");
    }

    const attendance = await prisma.attendance.upsert({
        where: {
            studentId_classId_date: {
                studentId,
                classId,
                date: parsedDate
            }
        },
        update: {
            status
        },
        create: {
            studentId,
            teacherId,
            classId,
            date: parsedDate,
            status
        }
    });
    res.status(201).json(new ApiResponse(201, attendance, "Attendance marked successfully"));
})

// toggle attendance
const toggleAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { studentId, classId, date }: toggleAttendanceBody = req.body;
    const teacherId = req.user!.id;
    if (!studentId || !classId || !date) {
        throw new ApiError(400, "Student ID, class ID, and date are required");
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
        throw new ApiError(400, "Invalid date format. Use YYYY-MM-DD");
    }

    // Validate student exists
    const student = await prisma.student.findUnique({
        where: { id: studentId }
    });
    if (!student) {
        throw new ApiError(404, "Student not found");
    }

    // Validate class exists
    const classExists = await prisma.class.findUnique({
        where: { id: classId }
    });
    if (!classExists) {
        throw new ApiError(404, "Class not found");
    }

    const attendanceExist = await prisma.attendance.findUnique({
        where: {
            studentId_classId_date: {
                studentId,
                classId,
                date: parsedDate
            }
        }
    })

    // If attendance exists → toggle
    if (attendanceExist) {
        const updateAttendance = await prisma.attendance.update({
            where: {
                id: attendanceExist.id
            },
            data: {
                status: attendanceExist.status === AttendanceStatus.PRESENT ? AttendanceStatus.ABSENT : AttendanceStatus.PRESENT,
                teacherId
            }
        })
        return res.status(201).json(new ApiResponse(201, updateAttendance, "Attendance marked successfully"));
    }

    // If attendance does not exist → create as PRESENT
    const createAttendance = await prisma.attendance.create({
        data: {
            studentId,
            teacherId,
            classId,
            date: parsedDate,
            status: AttendanceStatus.PRESENT
        }
    })
    res.status(201).json(new ApiResponse(201, createAttendance, "Attendance marked successfully"));
})

// get attendance by class & date
const getAttendanceByClassAndDate = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { classId, date } = req.query;
    if (!classId || !date) {
        throw new ApiError(400, "Class ID and date are required");
    }
    const attendance = await prisma.attendance.findMany({
        where: {
            classId: classId as string,
            date: new Date(date as string)
        },
        include: {
            student: true
        }
    });
    if (!attendance) {
        throw new ApiError(404, "Attendance not found");
    }

    res.status(200).json(new ApiResponse(200, attendance, "Attendance fetched successfully"));
});

// offline bulk Sync attendance
const bulkSyncAttendance = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { records }: bulkSyncBody = req.body;
    const teacherId = req.user!.id;
    if (!records || !Array.isArray(records) || records.length === 0) {
        throw new ApiError(400, "Attendance records are required");
    }

    const operations = records.map((record: any) => prisma.attendance.upsert({
        where: {
            studentId_classId_date: {
                studentId: record.studentId,
                classId: record.classId,
                date: new Date(record.date)
            }
        },
        update: {
            status: record.status,
            teacherId
        },
        create: {
            studentId: record.studentId,
            teacherId,
            classId: record.classId,
            date: new Date(record.date),
            status: record.status,
        }
    }));

    await prisma.$transaction(operations);
    const syncedCount = await prisma.attendance.count({
        where: {
            teacherId,
            date: {
                in: records.map((record: any) => new Date(record.date))
            }
        }
    });
    if (syncedCount === 0) {
        throw new ApiError(500, "Attendance not synced");
    }

    res.status(201).json(new ApiResponse(201, syncedCount, "Attendance synced successfully"));
});

// get attendance by class ID (for admin)
const getAttendanceByClass = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { classId } = req.params;
    if (!classId) {
        throw new ApiError(400, "Class ID is required");
    }

    const classData = await prisma.class.findUnique({
        where: { id: classId },
        include: {
            teacher: {
                select: {
                    name: true
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
                }
            }
        }
    });

    if (!classData) {
        throw new ApiError(404, "Class not found");
    }

    const attendance = await prisma.attendance.findMany({
        where: {
            classId
        },
        include: {
            student: {
                select: {
                    id: true,
                    rollNo: true,
                    user: {
                        select: {
                            name: true
                        }
                    }
                }
            }
        },
        orderBy: {
            date: 'desc'
        }
    });

    const totalStudents = classData.students.length;
    const totalClasses = await prisma.attendance.groupBy({
        by: ['date'],
        where: { classId }
    }).then(dates => dates.length);

    const presentCount = attendance.filter(a => a.status === 'PRESENT').length;
    const averageAttendance = totalClasses > 0 ? Math.round((presentCount / (totalStudents * totalClasses)) * 100) : 0;

    const result = {
        class: {
            id: classData.id,
            name: classData.name,
            section: classData.section,
            teacher: classData.teacher
        },
        attendance,
        stats: {
            totalStudents,
            totalClasses,
            averageAttendance
        }
    };

    res.status(200).json(new ApiResponse(200, result, "Class attendance fetched successfully"));
});

export {
    markAttendance,
    toggleAttendance,
    getAttendanceByClassAndDate,
    getAttendanceByClass,
    bulkSyncAttendance
};