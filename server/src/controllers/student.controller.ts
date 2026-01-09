import PDFDocument from 'pdfkit';
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
                    phone: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true,
                    section: true,
                    subjects: true,
                    schedule: true,
                    course: true,
                    academicYear: true,
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

// Update student profile (for students to update their own profile)
const updateStudentProfile = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    const { name, email, phone, dateOfBirth, gender, address, parentName, parentPhone } = req.body;
    
    if (req.user?.role !== Role.STUDENT) {
        throw new ApiError(403, "Only students can access this endpoint");
    }
    
    const student = await prisma.student.findUnique({
        where: { userId }
    });
    
    if (!student) {
        throw new ApiError(404, "Student profile not found");
    }
    
    // Update user information
    const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: {
            name,
            email,
            phone
        }
    });
    
    // Update student-specific information
    const updatedStudent = await prisma.student.update({
        where: { id: student.id },
        data: {
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
            gender,
            address,
            parentName,
            parentPhone
        },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true,
                    section: true,
                    subjects: true,
                    schedule: true,
                    course: true,
                    academicYear: true,
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
    
    res.status(200).json(new ApiResponse(200, updatedStudent, "Student profile updated successfully"));
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

// Get student by ID (for teachers to view student profiles)
const getStudentById = asyncHandler(async (req: AuthRequest, res: Response) => {
    const { studentId } = req.params;
    
    if (!studentId) {
        throw new ApiError(400, "Student ID is required");
    }
    
    const student = await prisma.student.findUnique({
        where: { id: studentId },
        include: {
            user: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true
                }
            },
            class: {
                select: {
                    id: true,
                    name: true,
                    section: true,
                    subjects: true,
                    teacherId: true,
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
    
    if (!student) {
        throw new ApiError(404, "Student not found");
    }
    
    // Check if teacher has access to this student's class
    if (req.user?.role === Role.TEACHER && student.class.teacher && student.class.teacherId !== req.user?.id) {
        throw new ApiError(403, "You can only view students from your classes");
    }
    
    // Calculate attendance stats
    const attendanceStats = await prisma.attendance.aggregate({
        where: { studentId },
        _count: { id: true },
    });
    
    const presentCount = await prisma.attendance.count({
        where: { studentId, status: 'PRESENT' }
    });
    
    const totalClasses = attendanceStats._count.id;
    const attendancePercentage = totalClasses > 0 ? Math.round((presentCount / totalClasses) * 100) : 0;
    
    const studentWithStats = {
        ...student,
        attendanceStats: {
            totalClasses,
            totalPresent: presentCount,
            totalAbsent: totalClasses - presentCount,
            attendancePercentage
        }
    };
    
    res.status(200).json(new ApiResponse(200, studentWithStats, "Student profile fetched successfully"));
});

// Get student attendance report (for students to download their attendance report)
const getStudentAttendanceReport = asyncHandler(async (req: AuthRequest, res: Response) => {
    const userId = req.user?.id;
    
    if (req.user?.role !== Role.STUDENT) {
        throw new ApiError(403, "Only students can access this endpoint");
    }
    
    const student = await prisma.student.findUnique({
        where: { userId },
        include: {
            user: {
                select: {
                    name: true,
                    email: true
                }
            },
            class: {
                select: {
                    name: true,
                    section: true,
                    course: true
                }
            }
        }
    });
    
    if (!student) {
        throw new ApiError(404, "Student profile not found");
    }
    
    const attendance = await prisma.attendance.findMany({
        where: { studentId: student.id },
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
    });
    
    // Calculate statistics
    const totalClasses = attendance.length;
    const totalPresent = attendance.filter(record => record.status === 'PRESENT').length;
    const totalAbsent = totalClasses - totalPresent;
    const attendancePercentage = totalClasses > 0 ? Math.round((totalPresent / totalClasses) * 100) : 0;
    
    // Create PDF
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="attendance-report-${student.rollNo}.pdf"`);
    
    doc.pipe(res);
    
    // Header with logo placeholder and institution info
    doc.fontSize(18).font('Helvetica-Bold').text('ATTENDSYNC INSTITUTE', { align: 'center' });
    doc.fontSize(14).font('Helvetica').text('Student Attendance Report', { align: 'center' });
    doc.moveTo(50, doc.y + 10).lineTo(545, doc.y + 10).stroke();
    doc.moveDown(2);
    
    // Report Info Section
    const reportY = doc.y;
    doc.fontSize(10).font('Helvetica')
       .text(`Report Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, 50, reportY)
       .text(`Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}`, 350, reportY);
    doc.moveDown(2);
    
    // Student Information Box
    const boxY = doc.y;
    doc.rect(50, boxY, 495, 80).stroke();
    doc.fontSize(12).font('Helvetica-Bold').text('STUDENT INFORMATION', 60, boxY + 10);
    
    const infoY = boxY + 30;
    doc.fontSize(10).font('Helvetica')
       .text(`Name: ${student.user?.name || 'N/A'}`, 60, infoY)
       .text(`Roll Number: ${student.rollNo}`, 300, infoY)
       .text(`Class: ${student.class.name}`, 60, infoY + 15)
       .text(`Section: ${student.class.section}`, 300, infoY + 15)
       .text(`Course: ${student.class.course}`, 60, infoY + 30)
       .text(`Email: ${student.user?.email || 'N/A'}`, 300, infoY + 30);
    
    doc.y = boxY + 90;
    doc.moveDown();
    
    // Attendance Summary Box
    const summaryY = doc.y;
    doc.rect(50, summaryY, 495, 100).stroke();
    doc.fontSize(12).font('Helvetica-Bold').text('ATTENDANCE SUMMARY', 60, summaryY + 10);
    
    // Summary stats in grid
    const statsY = summaryY + 35;
    doc.fontSize(11).font('Helvetica-Bold')
       .text('Total Classes:', 70, statsY)
       .text('Classes Attended:', 270, statsY)
       .text('Classes Missed:', 70, statsY + 20)
       .text('Attendance Rate:', 270, statsY + 20);
    
    doc.fontSize(11).font('Helvetica')
       .text(totalClasses.toString(), 160, statsY)
       .text(totalPresent.toString(), 380, statsY)
       .text(totalAbsent.toString(), 160, statsY + 20);
    
    // Attendance percentage with color coding
    const percentageColor = attendancePercentage >= 75 ? 'green' : attendancePercentage >= 60 ? 'orange' : 'red';
    doc.fillColor(percentageColor).text(`${attendancePercentage}%`, 380, statsY + 20).fillColor('black');
    
    // Status indicator
    const status = attendancePercentage >= 75 ? 'SATISFACTORY' : attendancePercentage >= 60 ? 'NEEDS IMPROVEMENT' : 'CRITICAL';
    doc.fontSize(10).font('Helvetica-Bold').text(`Status: ${status}`, 70, statsY + 45);
    
    doc.y = summaryY + 110;
    doc.moveDown();
    
    // Attendance Records Table
    if (attendance.length > 0) {
        doc.fontSize(12).font('Helvetica-Bold').text('DETAILED ATTENDANCE RECORDS', 50);
        doc.moveDown(0.5);
        
        // Table header
        const tableY = doc.y;
        doc.rect(50, tableY, 495, 25).fillAndStroke('#f0f0f0', '#000000');
        
        doc.fillColor('black').fontSize(9).font('Helvetica-Bold')
           .text('S.No', 60, tableY + 8, { width: 40 })
           .text('Date', 100, tableY + 8, { width: 80 })
           .text('Day', 180, tableY + 8, { width: 60 })
           .text('Status', 240, tableY + 8, { width: 60 })
           .text('Class', 300, tableY + 8, { width: 100 })
           .text('Teacher', 400, tableY + 8, { width: 100 });
        
        let currentY = tableY + 25;
        
        // Table rows
        attendance.forEach((record, index) => {
            if (currentY > 700) { // New page if needed
                doc.addPage();
                currentY = 50;
            }
            
            const rowColor = index % 2 === 0 ? '#ffffff' : '#f9f9f9';
            doc.rect(50, currentY, 495, 20).fillAndStroke(rowColor, '#cccccc');
            
            const statusColor = record.status === 'PRESENT' ? 'green' : 'red';
            const dayName = new Date(record.date).toLocaleDateString('en-US', { weekday: 'short' });
            
            doc.fillColor('black').fontSize(8).font('Helvetica')
               .text((index + 1).toString(), 60, currentY + 6, { width: 40 })
               .text(record.date.toLocaleDateString('en-US'), 100, currentY + 6, { width: 80 })
               .text(dayName, 180, currentY + 6, { width: 60 })
               .fillColor(statusColor).text(record.status, 240, currentY + 6, { width: 60 })
               .fillColor('black').text(record.class.name, 300, currentY + 6, { width: 100 })
               .text(record.teacher.name, 400, currentY + 6, { width: 100 });
            
            currentY += 20;
        });
        
        doc.y = currentY + 10;
    }
    
    // Footer
    doc.fontSize(8).font('Helvetica')
       .text('This is a computer-generated report. No signature required.', { align: 'center' })
       .moveDown(0.5)
       .text(`Report ID: ATT-${student.rollNo}-${Date.now()}`, { align: 'center' });
    
    doc.end();
});

export {
    getStudentsByClass,
    getStudentProfile,
    updateStudentProfile,
    getStudentAttendance,
    getStudentById,
    getStudentAttendanceReport
};