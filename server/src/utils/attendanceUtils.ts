import prisma from "../db/db";

// Calculate attendance statistics for a class
export const calculateClassAttendanceStats = async (classId: string) => {
    const totalStudents = await prisma.student.count({
        where: { classId, isActive: true }
    });
    
    const uniqueDates = await prisma.attendance.groupBy({
        by: ['date'],
        where: { classId }
    });
    const totalClasses = uniqueDates.length;
    
    const presentCount = await prisma.attendance.count({
        where: {
            classId,
            status: 'PRESENT'
        }
    });
    
    const averageAttendance = totalClasses > 0 && totalStudents > 0 
        ? Math.round((presentCount / (totalStudents * totalClasses)) * 100) 
        : 0;
    
    return {
        totalStudents,
        totalClasses,
        averageAttendance,
        presentCount
    };
};

// Get today's date range
export const getTodayDateRange = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    return { today, tomorrow };
};

// Calculate today's attendance for a class
export const getTodayAttendance = async (classId: string) => {
    const { today, tomorrow } = getTodayDateRange();
    
    const [presentToday, absentToday] = await Promise.all([
        prisma.attendance.count({
            where: {
                classId,
                status: 'PRESENT',
                date: { gte: today, lt: tomorrow }
            }
        }),
        prisma.attendance.count({
            where: {
                classId,
                status: 'ABSENT',
                date: { gte: today, lt: tomorrow }
            }
        })
    ]);
    
    return { presentToday, absentToday };
};

// Get low attendance students
export const getLowAttendanceStudents = async (threshold: number = 75) => {
    const students = await prisma.student.findMany({
        include: {
            user: {
                select: {
                    name: true
                }
            },
            class: {
                select: {
                    name: true,
                    section: true
                }
            }
        }
    });
    
    const lowAttendanceStudents = [];
    
    for (const student of students) {
        const totalAttendance = await prisma.attendance.count({
            where: { studentId: student.id }
        });
        const presentCount = await prisma.attendance.count({
            where: { studentId: student.id, status: 'PRESENT' }
        });
        
        const attendancePercentage = totalAttendance > 0 ? Math.round((presentCount / totalAttendance) * 100) : 0;
        
        if (attendancePercentage < threshold) {
            lowAttendanceStudents.push({
                id: student.userId || student.id,
                name: student.user?.name || 'Unknown',
                rollNo: student.rollNo,
                className: `${student.class.name} - ${student.class.section}`,
                attendancePercentage
            });
        }
    }
    
    return lowAttendanceStudents;
};