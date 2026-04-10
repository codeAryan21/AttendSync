import { z } from 'zod';

// Common schemas
export const idSchema = z.object({
  id: z.string().uuid('Invalid ID format')
});

export const classIdSchema = z.object({
  classId: z.string().uuid('Invalid class ID format')
});

export const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10)
});

export const adminUsersQuerySchema = z.object({
  page: z.string().optional().transform(val => val ? parseInt(val) : 1),
  limit: z.string().optional().transform(val => val ? parseInt(val) : 10),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  search: z.string().optional()
});

// Auth schemas
export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  role: z.enum(['ADMIN', 'TEACHER']).default('TEACHER')
});

export const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  loginType: z.enum(['staff', 'student']).optional()
});

export const changePasswordSchema = z.object({
  oldPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
});

export const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address')
});

export const verifyResetOTPSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits')
});

export const resetPasswordSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  otp: z.string().length(6, 'OTP must be 6 digits'),
  newPassword: z.string()
    .min(8, 'Password must be at least 8 characters long')
    .max(100)
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])/, 
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
});

// Class schemas
export const createClassSchema = z.object({
  name: z.string().trim().min(1, 'Class name is required').max(100),
  course: z.string().trim().min(1, 'Course is required').max(100),
  section: z.string().trim().min(1, 'Section is required').max(10),
  subjects: z.array(z.string().trim().min(1)).min(1, 'At least one subject is required'),
  academicYear: z.string().trim().min(1, 'Academic year is required').max(20),
  schedule: z.string().trim().max(200).optional(),
  description: z.string().trim().max(500).optional(),
  teacherId: z.string().optional(),
  subjectTeachers: z.array(z.object({
    subject: z.string().trim().min(1),
    teacherId: z.string().trim().min(1),
  })).optional(),
});

export const updateClassSchema = createClassSchema.partial();

// Student schemas
export const createStudentSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  rollNo: z.string().trim().min(1, 'Roll number is required').max(20),
  classId: z.string().uuid('Invalid class ID format'),
  parentName: z.string().trim().max(100).optional(),
  parentPhone: z.string().trim().max(15).optional(),
  phone: z.string().trim().max(15).optional(),
  address: z.string().trim().max(500).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional()
});

export const updateStudentSchema = createStudentSchema.partial();

// Profile update schemas
export const updateProfileSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  phone: z.string().trim().max(15).optional(),
  address: z.string().trim().max(500).optional(),
  parentName: z.string().trim().max(100).optional(),
  parentPhone: z.string().trim().max(15).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional()
});

// Attendance schemas
export const markAttendanceSchema = z.object({
  studentId: z.string().uuid('Invalid student ID format'),
  classId: z.string().uuid('Invalid class ID format'),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'),
  status: z.enum(['PRESENT', 'ABSENT'])
});

export const bulkAttendanceSchema = z.object({
  records: z.array(markAttendanceSchema).min(1, 'At least one attendance record is required')
});

export const attendanceQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format').optional(),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format').optional()
});

// Admin schemas
export const createUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  email: z.string().trim().email('Invalid email address'),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']),
  password: z.string()
    .min(6, 'Password must be at least 6 characters long')
    .max(100)
    .optional(),
  phone: z.string().trim().max(15).optional(),
  address: z.string().trim().max(500).optional(),
  // Teacher fields
  employeeId: z.string().trim().max(50).optional(),
  designation: z.string().trim().max(100).optional(),
  qualification: z.string().trim().max(200).optional(),
  experience: z.number().min(0).max(50).optional(),
  specialization: z.string().trim().max(200).optional(),
  // Student fields
  rollNo: z.string().trim().min(1).max(20).optional(),
  classId: z.string().uuid().optional(),
  parentName: z.string().trim().max(100).optional(),
  parentPhone: z.string().trim().max(15).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional()
}).refine((data) => {
  if (data.role === 'STUDENT') {
    return data.rollNo && data.classId;
  }
  return true;
}, {
  message: 'Roll number and class are required for students',
  path: ['rollNo']
});

export const updateUserSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100).optional(),
  email: z.string().trim().email('Invalid email address').optional(),
  role: z.enum(['ADMIN', 'TEACHER', 'STUDENT']).optional(),
  phone: z.string().trim().max(15).optional(),
  address: z.string().trim().max(500).optional(),
  isActive: z.boolean().optional(),
  // Teacher fields
  employeeId: z.string().trim().max(50).optional(),
  designation: z.string().trim().max(100).optional(),
  qualification: z.string().trim().max(200).optional(),
  experience: z.number().min(0).max(50).optional(),
  specialization: z.string().trim().max(200).optional(),
  // Student fields
  rollNo: z.string().trim().min(1).max(20).optional(),
  classId: z.string().uuid().optional(),
  parentName: z.string().trim().max(100).optional(),
  parentPhone: z.string().trim().max(15).optional(),
  dateOfBirth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  gender: z.enum(['Male', 'Female', 'Other']).optional()
});