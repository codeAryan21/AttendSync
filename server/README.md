# AttendSync — Server

Express.js + TypeScript REST API with Prisma ORM, PostgreSQL, and automated email notifications.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Scheduled Jobs](#scheduled-jobs)
- [Middleware Pipeline](#middleware-pipeline)
- [Environment Variables](#environment-variables)

---

## Tech Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | JavaScript runtime |
| Express.js | 5.x | HTTP server framework |
| TypeScript | 5.x | Type-safe backend |
| Prisma ORM | 6.x | Schema, migrations, queries |
| PostgreSQL | 14+ | Primary relational database |
| Zod | 4.x | Request schema validation |
| jsonwebtoken | 9.x | JWT access + refresh tokens |
| bcryptjs | 3.x | Password hashing |
| Nodemailer | 7.x | SMTP email delivery |
| node-cron | 4.x | Scheduled notification jobs |
| express-rate-limit | 8.x | API rate limiting |
| Helmet | 8.x | HTTP security headers |
| cookie-parser | 1.x | Cookie parsing |
| pdfkit | 0.17.x | PDF report generation |

---

## Setup

```bash
npm install
cp .env.sample .env
# Fill in .env values
npx prisma generate
npx prisma db push
npm run dev
```

Server runs at `http://localhost:5001`.

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development with nodemon + ts-node |
| `npm run build` | Compile TypeScript |
| `npm start` | Production start |

---

## Project Structure

```
src/
├── controllers/
│   ├── admin.controller.ts              # User mgmt, stats, reports, settings, backup
│   ├── attendance.controller.ts         # Mark, toggle, fetch, bulk-sync
│   ├── attendance.analytics.controller.ts  # Percentage, class report, monthly summary
│   ├── auth.controller.ts               # Login, logout, OTP reset, refresh token
│   ├── class.controller.ts              # CRUD for classes
│   ├── notification.controller.ts       # Manual notification triggers
│   ├── student.controller.ts            # Student profiles, attendance
│   └── teacher.controller.ts            # Teacher profile
├── middlewares/
│   ├── auth.middleware.ts               # JWT verification
│   ├── role.middleware.ts               # RBAC (requireAdmin, requireTeacher, requireStudent)
│   ├── validate.middleware.ts           # Zod body/params/query validation
│   ├── rateLimit.middleware.ts          # General + login rate limiters
│   └── errorHandler.middleware.ts       # Global error handler
├── routes/
│   ├── auth.routes.ts
│   ├── attendance.route.ts
│   ├── attendance.analytics.route.ts
│   ├── class.routes.ts
│   ├── student.routes.ts
│   ├── teacher.routes.ts
│   ├── admin.routes.ts
│   └── notification.routes.ts
├── services/
│   ├── auth.service.ts                  # Token sign/verify helpers
│   ├── email.service.ts                 # Nodemailer + HTML email templates
│   ├── notification.service.ts          # Absent alerts + daily report logic
│   └── scheduler.service.ts             # node-cron job registration
├── schemas/
│   └── index.ts                         # All Zod schemas
├── utils/
│   ├── apiError.ts                      # Structured error class
│   ├── apiResponse.ts                   # Structured response wrapper
│   ├── asyncHandler.ts                  # Express async error wrapper
│   ├── attendanceUtils.ts               # Attendance calculation helpers
│   └── validationUtils.ts               # Shared validation helpers
├── db/
│   └── db.ts                            # Prisma client singleton
├── app.ts                               # Express app setup, middleware, routes
└── index.ts                             # Server entry point
prisma/
├── schema.prisma                        # Database schema
└── migrations/                          # Migration history
```

---

## API Reference

Base URL: `http://localhost:5001/api/v1`

All routes (except `/health`) require `Authorization: Bearer <token>`.

### Auth — `/auth`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Admin | Register a new user |
| POST | `/auth/login` | All | Login (rate-limited) |
| GET | `/auth/current-user` | All | Get authenticated user |
| POST | `/auth/logout` | All | Invalidate session |
| POST | `/auth/refresh-token` | All | Refresh access token |
| POST | `/auth/forgot-password` | All | Send OTP to email |
| POST | `/auth/verify-reset-otp` | All | Verify OTP |
| POST | `/auth/reset-password` | All | Reset password with OTP |
| POST | `/auth/change-password` | All | Change own password |
| GET | `/auth/settings` | All | Get public system settings |

### Attendance — `/attendance`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/attendance` | Teacher | Mark attendance |
| PUT | `/attendance/toggle` | Teacher | Toggle student status |
| GET | `/attendance` | Teacher | Get by class + date |
| GET | `/attendance/:classId` | Teacher | Get all for a class |
| POST | `/attendance/bulk-sync` | Teacher | Bulk sync offline records |

### Attendance Analytics — `/attendance-analytics`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/attendance-analytics/student/percentage` | All | Student attendance % |
| GET | `/attendance-analytics/class/report` | Teacher, Admin | Class report by date range |
| GET | `/attendance-analytics/class/monthly-summary` | Teacher, Admin | Monthly class summary |

### Classes — `/class`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/class` | Admin | Create a class |
| GET | `/class` | All | List classes (role-filtered) |
| GET | `/class/:id` | Teacher, Admin | Get class details |
| PUT | `/class/:id` | Admin | Update a class |
| DELETE | `/class/:id` | Admin | Delete a class |

### Students — `/student`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/student/class/:classId` | Teacher, Admin | Students in a class |
| GET | `/student/profile/:studentId` | Teacher, Admin | Student full profile |
| GET | `/student/profile` | Student | Own profile |
| PUT | `/student/profile` | Student | Update own profile |
| GET | `/student/attendance` | Student | Own attendance records |
| GET | `/student/attendance/report` | Student | Own attendance report |

### Teacher — `/teacher`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/teacher/profile` | Teacher | Get own profile |
| PUT | `/teacher/profile` | Teacher | Update own profile |

### Admin — `/admin`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | List all users (paginated) |
| GET | `/admin/users/:id` | Admin | Get user by ID |
| POST | `/admin/users` | Admin | Create user (emails credentials) |
| PUT | `/admin/users/:id` | Admin | Update user |
| PUT | `/admin/users/:id/classes` | Admin | Assign classes to teacher |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| GET | `/admin/stats` | Admin | System-wide statistics |
| GET | `/admin/classes` | Admin | All classes |
| GET | `/admin/classes/available` | Admin | Classes without a teacher |
| GET | `/admin/classes/:id` | Admin | Class details |
| GET | `/admin/reports` | Admin | Attendance reports |
| GET | `/admin/reports/overall` | Admin | Overall report |
| GET | `/admin/reports/class/:classId` | Admin | Class-level details |
| GET | `/admin/settings` | Admin | Get system settings |
| PUT | `/admin/settings` | Admin | Update system settings |
| POST | `/admin/settings/test-email` | Admin | Test SMTP config |
| POST | `/admin/backup` | Admin | Create data backup |

### Notifications — `/notifications`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/notifications/send-absent-notifications` | Admin | Manually trigger absent alerts |
| POST | `/notifications/send-daily-reports` | Admin | Manually trigger daily reports |

### System

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Server health check |

---

## Database Schema

### Models

| Model | Key Fields |
|-------|-----------|
| `User` | `id`, `name`, `email`, `password`, `role`, `phone`, `address`, `employeeId`, `designation`, `qualification`, `experience`, `isActive`, `tokenVersion` |
| `RefreshToken` | `id`, `token`, `userId`, `expiresAt` |
| `Class` | `id`, `name`, `course`, `subjects[]`, `academicYear`, `section`, `teacherId`, `schedule`, `metadata`, `isActive` |
| `Student` | `id`, `userId`, `rollNo`, `classId`, `parentName`, `parentPhone`, `dateOfBirth`, `gender`, `admissionDate` |
| `Attendance` | `id`, `studentId`, `teacherId`, `classId`, `date`, `status` — unique on `(studentId, classId, date)` |
| `Settings` | `attendanceThreshold`, `autoMarkAbsent`, `emailNotifications`, `sessionTimeout`, `maxLoginAttempts` |
| `PasswordReset` | `email`, `otp`, `expiresAt`, `used` |

### Enums

```
Role:             ADMIN | TEACHER | STUDENT
AttendanceStatus: PRESENT | ABSENT
```

### Useful Prisma Commands

```bash
npx prisma studio          # Visual DB browser
npx prisma migrate reset   # Reset DB (dev only)
npx prisma db push         # Push schema without migration
npx prisma generate        # Regenerate Prisma client
```

---

## Scheduled Jobs

Managed by `node-cron` in `services/scheduler.service.ts`. Jobs only start if the SMTP connection is verified on startup.

| Job | Schedule | Description |
|-----|----------|-------------|
| Absent notifications | `0 18 * * *` (6 PM IST) | Emails absent students/parents for the day |
| Daily reports | `0 19 * * *` (7 PM IST) | Emails attendance summary to teachers |

---

## Middleware Pipeline

```
Request
  → generalLimiter (1000 req / 15 min per IP)
  → CORS (localhost:3000, localhost:3001)
  → Helmet (security headers)
  → express.json (16mb limit)
  → authMiddleware (JWT verification)
  → requireRole / requireTeacher / requireStudent (RBAC)
  → validateBody / validateParams / validateQuery (Zod)
  → Controller
  → errorHandler (global error formatter)
```

---

## Environment Variables

```env
# Database
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/attendsync"

# Server
PORT=5001
NODE_ENV=development

# JWT
JWT_SECRET=<your-secret-min-32-chars>
JWT_EXPIRES_IN=15m

# Email (SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-email>
SMTP_PASS=<your-app-password>
EMAIL_FROM="AttendSync <noreply@attendsync.com>"
```

---

## License

MIT License

---

## Author

Aryan Singh

Built using Node.js, Express.js, TypeScript, Prisma, and PostgreSQL.
