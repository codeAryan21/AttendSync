import { asyncHandler } from "../utils/asyncHandler";
import { ApiResponse } from "../utils/apiResponse";
import { ApiError } from "../utils/apiError";
import prisma from "../db/db";
import { Request, Response } from "express";
import { AuthRequest } from "../middlewares/auth.middleware";

// Get attendance percentage for a student [ Attendance Percentage (Per Student) ]
const getStudentAttendancePercentage = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { studentId } = req.query;
    if (!studentId ) {
        throw new ApiError(400, "StudentId and are required");
    }

    const totalClasses = await prisma.attendance.count({
        where: { 
            studentId: studentId as string
        }
    })
    if(totalClasses == 0){
        return res.status(200).json(new ApiResponse(200, { studentId, percentage: 0 }, "Attendance percentage fetched successfully"));
    }

    const presentCount = await prisma.attendance.count({
        where: {
            studentId: studentId as string,
            status: "PRESENT"
        }
    })

    const percentage = ((presentCount / totalClasses) * 100).toFixed(2);
    res.status(200).json(new ApiResponse(200, { studentId, totalClasses, percentage: Number(percentage) }, "Attendance percentage fetched successfully"));
})

// get class attendance report within date range [ Class Attendance Report (Date Range) ]
const getClassAttendanceReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { classId, startDate, endDate } = req.query;
    if (!classId || !startDate || !endDate) {
        throw new ApiError(400, "ClassId, start date and end date are required");
    }

    const attendanceReport = await prisma.attendance.findMany({
        where: {
            classId: classId as string,
            date: {
                gte: new Date(startDate as string),
                lte: new Date(endDate as string)
            }
        },
        include: {
            student: true
        }
    })

    res.status(200).json(
        new ApiResponse(200, 
        {classId, from: startDate, to: endDate, records: attendanceReport}, 
        "Attendance report fetched successfully")
    );
})

//  monthly attendance summary for a class [ Monthly Attendance Summary (Per Class) ]
const getMonthlyClassAttendanceSummary = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { classId, month, year } = req.query;
    if (!classId || !month || !year) {
        throw new ApiError(400, "ClassId, month and year are required");
    }

    const startDate = new Date(Number(year), Number(month) - 1, 1);
    const endDate = new Date(Number(year), Number(month), 0);

    const attendanceSummary = await prisma.attendance.findMany({
        where: {
            classId: classId as string,
            date: {
                gte: startDate,
                lte: endDate
            }
        },
        include: {
            student: true
        }
    })

    const summary = attendanceSummary.reduce<Record<string, any>>((acc, record) => {
    const studentId = record.studentId;

    if (!acc[studentId]) {
      acc[studentId] = {
        student: record.student,
        present: 0,
        absent: 0
      };
    }

    if (record.status === "PRESENT") acc[studentId].present++;
    else acc[studentId].absent++;

    return acc;
  }, {});

    res.status(200).json(
        new ApiResponse(200,
        {classId, month, year, summary: Object.values(summary)},
        "Attendance summary fetched successfully")
    );
})

export {
    getStudentAttendancePercentage,
    getClassAttendanceReport,
    getMonthlyClassAttendanceSummary
}