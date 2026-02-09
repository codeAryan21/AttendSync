import nodemailer from 'nodemailer';
import prisma from '../db/db';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
};

// Verify SMTP connection
export const verifyEmailConnection = async () => {
  try {
    const transporter = createTransporter();
    await transporter.verify();
    console.log('Email service ready');
    return true;
  } catch (error) {
    console.error('Email service connection failed:', error);
    return false;
  }
};

// Check if email notifications are enabled
const areEmailNotificationsEnabled = async (): Promise<boolean> => {
  try {
    const settings = await prisma.settings.findFirst();
    return settings?.emailNotifications ?? true;
  } catch (error) {
    console.error('Error checking email notification settings:', error);
    return false;
  }
};

export const sendPasswordResetOTP = async (email: string, otp: string, name: string) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Password Reset OTP - AttendSync',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Request</h2>
        <p>Hello ${name},</p>
        <p>You have requested to reset your password. Please use the following OTP to reset your password:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; margin: 20px 0;">
          <h1 style="color: #007bff; font-size: 32px; margin: 0;">${otp}</h1>
        </div>
        <p><strong>This OTP will expire in 10 minutes.</strong></p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email from AttendSync. Please do not reply.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendLoginCredentials = async (email: string, name: string, password: string) => {
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: 'Your AttendSync Login Credentials',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to AttendSync</h2>
        <p>Hello ${name},</p>
        <p>Your account has been created successfully. Here are your login credentials:</p>
        <div style="background-color: #f4f4f4; padding: 20px; margin: 20px 0;">
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Password:</strong> ${password}</p>
        </div>
        <p><strong>Important:</strong> Please change your password after your first login for security purposes.</p>
        <p>You can login at: <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}">AttendSync Portal</a></p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email from AttendSync. Please do not reply.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendAbsentNotification = async (email: string, studentName: string, className: string, date: string, teacherName: string, teacherEmail: string) => {
  const enabled = await areEmailNotificationsEnabled();
  if (!enabled) return;

  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Attendance Alert - ${studentName} was absent on ${date}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #fee; border-left: 4px solid #dc3545; padding: 20px; margin-bottom: 20px;">
          <h2 style="color: #dc3545; margin: 0;">⚠️ Attendance Alert</h2>
        </div>
        <p>Dear ${studentName},</p>
        <p>This is to inform you that you were marked <strong style="color: #dc3545;">ABSENT</strong> for the following class:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <p><strong>Class:</strong> ${className}</p>
          <p><strong>Date:</strong> ${date}</p>
          <p><strong>Teacher:</strong> ${teacherName}</p>
        </div>
        <p>If you believe this is an error or if you have a valid reason for your absence, please contact your teacher immediately.</p>
        <div style="background-color: #e7f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Teacher Contact:</strong> ${teacherEmail}</p>
        </div>
        <p style="color: #666;">Regular attendance is important for your academic progress. Please ensure you attend all classes.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email from AttendSync. Please contact your teacher for any queries.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};

export const sendDailyAttendanceReport = async (email: string, teacherName: string, className: string, date: string, presentCount: number, absentCount: number, totalStudents: number) => {
  const enabled = await areEmailNotificationsEnabled();
  if (!enabled) return;

  const attendancePercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  
  const transporter = createTransporter();
  const mailOptions = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to: email,
    subject: `Daily Attendance Report - ${className} (${date})`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #e7f3ff; padding: 20px; text-align: center; margin-bottom: 20px;">
          <h2 style="color: #0066cc; margin: 0;">📊 Daily Attendance Report</h2>
        </div>
        <p>Dear ${teacherName},</p>
        <p>Here's the attendance summary for <strong>${className}</strong> on <strong>${date}</strong>:</p>
        <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span><strong>Total Students:</strong></span>
            <span>${totalStudents}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #28a745;">
            <span><strong>Present:</strong></span>
            <span>${presentCount}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px; color: #dc3545;">
            <span><strong>Absent:</strong></span>
            <span>${absentCount}</span>
          </div>
          <hr style="margin: 15px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 18px;">
            <span><strong>Attendance Rate:</strong></span>
            <span style="color: ${attendancePercentage >= 75 ? '#28a745' : '#dc3545'};"><strong>${attendancePercentage}%</strong></span>
          </div>
        </div>
        <p>You can view detailed attendance records in the AttendSync portal.</p>
        <p><a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/dashboard" style="background-color: #0066cc; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">View Dashboard</a></p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">This is an automated email from AttendSync. Please do not reply.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};