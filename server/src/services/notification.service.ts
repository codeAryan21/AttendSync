import prisma from '../db/db';
import { sendAbsentNotification, sendDailyAttendanceReport } from './email.service';
import { AttendanceStatus } from '@prisma/client';

export const sendAbsentNotifications = async (date: Date) => {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings?.emailNotifications) return;

    const absentRecords = await prisma.attendance.findMany({
      where: {
        date: date,
        status: AttendanceStatus.ABSENT
      },
      include: {
        student: {
          include: {
            user: true,
            class: {
              include: {
                teacher: true
              }
            }
          }
        }
      }
    });

    for (const record of absentRecords) {
      if (!record.student.user || !record.student.class.teacher) continue;
      
      try {
        await sendAbsentNotification(
          record.student.user.email,
          record.student.user.name,
          `${record.student.class.name} - ${record.student.class.section}`,
          date.toDateString(),
          record.student.class.teacher.name,
          record.student.class.teacher.email
        );
      } catch (error) {
        console.error('Failed to send notification:', error);
      }
    }
  } catch (error) {
    console.error('Error sending absent notifications:', error);
  }
};

export const sendDailyReports = async (date: Date) => {
  try {
    const settings = await prisma.settings.findFirst();
    if (!settings?.emailNotifications) return;

    const classes = await prisma.class.findMany({
      where: { isActive: true },
      include: {
        teacher: true,
        students: true,
        attendance: {
          where: {
            date: date
          }
        }
      }
    });

    for (const classData of classes) {
      if (classData.attendance.length === 0 || !classData.teacher) continue;

      const totalStudents = classData.students.length;
      const presentCount = classData.attendance.filter(a => a.status === AttendanceStatus.PRESENT).length;
      const absentCount = classData.attendance.filter(a => a.status === AttendanceStatus.ABSENT).length;

      try {
        await sendDailyAttendanceReport(
          classData.teacher.email,
          classData.teacher.name,
          `${classData.name} - ${classData.section}`,
          date.toDateString(),
          presentCount,
          absentCount,
          totalStudents
        );
      } catch (error) {
        console.error('Failed to send daily report:', error);
      }
    }
  } catch (error) {
    console.error('Error sending daily reports:', error);
  }
};