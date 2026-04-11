# AttendSync

A role-driven, offline-first attendance platform for institutes that captures attendance anywhere, syncs automatically, and delivers real-time insights.

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution Overview](#solution-overview)
- [How It Works](#how-it-works)
- [Key Features](#key-features)
- [Technology Stack](#technology-stack)
- [Architecture Overview](#architecture-overview)
- [Database Schema](#database-schema)
- [API Reference](#api-reference)
- [User Roles & Workflows](#user-roles--workflows)
- [Offline-First & PWA](#offline-first--pwa)
- [Project Structure](#project-structure)
- [Local Setup Guide](#local-setup-guide)
- [Environment Variables](#environment-variables)

---

## Problem Statement

Traditional attendance management in coaching institutions faces recurring challenges:

| Challenge | Impact |
|-----------|--------|
| Paper-based registers | No digital trail; easy to lose or manipulate |
| No offline support for field staff | Attendance delayed or lost in low-connectivity areas |
| Manual reporting to parents | Slow, error-prone, no automation |
| No SLA or threshold enforcement | No accountability for low-attendance students |
| Limited transparency | Students and parents unaware of attendance status |

---

## Solution Overview

AttendSync solves these challenges with a full-stack, mobile-first digital platform that:

- 📋 Lets teachers mark attendance per class with a single tap — including bulk mark-all
- 📶 Works fully offline — attendance is saved to IndexedDB and auto-syncs when connectivity is restored
- 🔄 Enforces a 48-hour modification window — prevents retroactive manipulation
- 📧 Automatically emails credentials to new users on account creation
- 📊 Tracks attendance percentages and alerts when students fall below the configured threshold
- 🔐 Enforces role-based access — each role sees only what they need

---

## How It Works

### End-to-End Attendance Flow

```
Teacher                   Backend                    Student / Admin
  │                          │                              │
  │ 1. Select class + date   │                              │
  │ 2. Toggle student status │                              │
  │ 3. PUT /attendance/toggle┼──► Validate with Zod         │
  │                          │    Upsert attendance record  │
  │                          │    Return updated status ────┼──► Student dashboard
  │                          │                              │
  │ (offline)                │                              │
  │ 4. Saved to IndexedDB    │                              │
  │ 5. SW background sync ───┼──► POST /attendance/bulk-sync│
  │                          │    Batch upsert records      │
```

### Offline Flow

1. Teacher marks attendance with no internet — saved to `AttendSyncDB` (IndexedDB)
2. Service Worker registers a `sync-attendance` background sync task
3. SyncManager polls `http://localhost:5001/health` every 2 seconds to detect real connectivity
4. On reconnect, all pending records are bulk-synced via `POST /api/v1/attendance/bulk-sync`
5. OfflineIndicator component shows live sync status and pending count

---

## Key Features

### 📋 Attendance Management
- Per-student toggle (PRESENT / ABSENT) with instant UI feedback
- Bulk mark-all present or absent for a class
- 48-hour modification window enforced on both frontend and backend
- Existing attendance pre-loaded when a class + date is selected

### 📶 Offline-First
- Attendance marked offline is queued in IndexedDB (`AttendSyncDB`)
- Service Worker handles background sync via the Background Sync API
- SyncManager detects real connectivity via health-check polling (not just browser `online` events)
- Bulk sync endpoint batches all pending records in a single request

### 🔐 Role-Based Access Control
- Three roles: `ADMIN`, `TEACHER`, `STUDENT`
- JWT access + refresh token authentication
- Role middleware enforces endpoint-level restrictions
- Each role has a dedicated dashboard with scoped data

### 📧 Automated Email Notifications
- Credentials emailed to new users on account creation via Nodemailer
- Absent notifications sent to students/parents daily at 6 PM (IST) via node-cron
- Daily attendance summary reports sent to teachers at 7 PM (IST)
- Admin can manually trigger notifications via the API

### 📊 Attendance Analytics
- Per-student attendance percentage across any date range
- Class-level attendance report with date range filtering
- Monthly attendance summary per class
- Configurable attendance threshold alerts (default: 75%)

### 🏫 Class Management
- Admin creates and manages classes with subjects, section, academic year, and schedule
- Teachers are assigned to classes; students are enrolled per class
- Each class has a unique constraint on `(name, course, academicYear, section)`

### 🔑 Auth & Security
- JWT access tokens + refresh tokens (stored in `localStorage`)
- OTP-based password reset flow (6-digit, expiry-enforced)
- Rate limiting: general limiter + stricter login limiter
- Zod schema validation on all API inputs
- Helmet for HTTP security headers
- bcryptjs password hashing

---

## Technology Stack

### Frontend

| Technology | Version | Purpose |
|------------|---------|---------|
| Next.js | 16.x (App Router) | React framework, routing, SSR |
| React | 19.x | UI library |
| TypeScript | 5.x | Type safety |
| Tailwind CSS | 4.x | Utility-first CSS |
| Zustand | 4.x | Global state management |
| React Hook Form | 7.x | Form management |
| Zod | 3.x | Form validation |
| Axios | 1.x | HTTP client |
| react-hot-toast | 2.x | Toast notifications |
| js-cookie | 3.x | Cookie management |
| Service Worker (custom) | — | Offline caching + background sync |
| IndexedDB (native) | — | Offline attendance queue |

### Backend

| Technology | Version | Purpose |
|------------|---------|---------|
| Node.js | 20.x | JavaScript runtime |
| Express.js | 5.x | HTTP server framework |
| TypeScript | 5.x | Type-safe backend |
| Prisma ORM | 6.x | Schema, migrations, queries |
| PostgreSQL | 14+ | Primary relational database |
| Zod | 4.x | Request schema validation |
| jsonwebtoken | 9.x | JWT auth tokens |
| bcryptjs | 3.x | Password hashing |
| Nodemailer | 7.x | SMTP email delivery |
| node-cron | 4.x | Scheduled notification jobs |
| express-rate-limit | 8.x | API rate limiting |
| Helmet | 8.x | HTTP security headers |
| cookie-parser | 1.x | Cookie parsing |
| pdfkit | 0.17.x | PDF report generation |

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────┐
│                  FRONTEND (Next.js PWA)                  │
│                                                          │
│  ┌──────────┐  ┌─────────────┐  ┌──────────────────┐   │
│  │  Admin   │  │   Teacher   │  │     Student      │   │
│  └────┬─────┘  └──────┬──────┘  └────────┬─────────┘   │
│       │                │                  │             │
│  ┌────▼────────────────▼──────────────────▼──────────┐  │
│  │           Zustand Store (authStore, settingsStore) │  │
│  └──────────────────────────┬─────────────────────────┘  │
│                             │  Axios                     │
│  ┌──────────────────────────▼──────────────────────┐    │
│  │  Service Worker (sw.js)  │  IndexedDB (native)  │    │
│  │  • Cache-first assets    │  • Offline queue     │    │
│  │  • Background sync       │  • Pending records   │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────┬───────────────────────────┘
                               │ HTTPS / REST
┌──────────────────────────────▼───────────────────────────┐
│                   BACKEND (Express.js)                   │
│                                                          │
│  Rate Limiter → CORS → Helmet → Auth MW → Role MW       │
│                                                          │
│  ┌────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐  │
│  │ /auth  │  │/attendance│  │ /class  │  │  /admin  │  │
│  └───┬────┘  └─────┬─────┘  └────┬─────┘  └────┬─────┘  │
│      │              │             │              │        │
│  ┌───▼──────────────▼─────────────▼──────────────▼────┐  │
│  │                  Controller Layer                   │  │
│  └──────────────────────────┬──────────────────────────┘  │
│                             │                            │
│  ┌──────────────────────────▼──────────────────────┐    │
│  │                   Prisma ORM                    │    │
│  └──────────────────────────┬──────────────────────┘    │
└──────────────────────────────┼───────────────────────────┘
                               │
              ┌────────────────┴────────────────┐
              ▼                                 ▼
     ┌─────────────────┐             ┌──────────────────┐
     │   PostgreSQL    │             │  SMTP (Email)    │
     │  (Prisma ORM)   │             │  Nodemailer +    │
     │                 │             │  node-cron       │
     └─────────────────┘             └──────────────────┘
```

---

## Database Schema

### Core Models

| Model | Description |
|-------|-------------|
| `User` | All system users — Admin, Teacher, Student — with role, profile fields, and token versioning |
| `RefreshToken` | JWT refresh token store with expiry |
| `Class` | Class record with subjects array, academic year, section, schedule, and teacher assignment |
| `Student` | Student profile linked to a `User` and enrolled in a `Class` |
| `Attendance` | Per-student, per-class, per-date attendance record (PRESENT / ABSENT) |
| `Settings` | System-wide configuration (threshold, notifications, session timeout, etc.) |
| `PasswordReset` | OTP-based reset tokens with expiry and attempt tracking |

### Attendance Status

```
PRESENT | ABSENT
```

### User Roles

```
ADMIN | TEACHER | STUDENT
```

---

## API Reference

Base URL: `http://localhost:5001/api/v1`

All routes (except `/health`) require `Authorization: Bearer <token>`.

### Auth — `/auth`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | Admin | Register a new user |
| POST | `/auth/login` | All | Login with email + password |
| GET | `/auth/current-user` | All | Get authenticated user |
| POST | `/auth/logout` | All | Invalidate session |
| POST | `/auth/refresh-token` | All | Refresh access token |
| POST | `/auth/forgot-password` | All | Send OTP to registered email |
| POST | `/auth/verify-reset-otp` | All | Verify OTP |
| POST | `/auth/reset-password` | All | Reset password using OTP |
| POST | `/auth/change-password` | All | Change own password |
| GET | `/auth/settings` | All | Get public system settings |

### Attendance — `/attendance`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| POST | `/attendance` | Teacher | Mark attendance for a student |
| PUT | `/attendance/toggle` | Teacher | Toggle a student's attendance status |
| GET | `/attendance` | Teacher | Get attendance by class and date |
| GET | `/attendance/:classId` | Teacher | Get all attendance for a class |
| POST | `/attendance/bulk-sync` | Teacher | Bulk sync offline attendance records |

### Attendance Analytics — `/attendance-analytics`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/attendance-analytics/student/percentage` | All | Student attendance percentage |
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
| GET | `/student/class/:classId` | Teacher, Admin | List students in a class |
| GET | `/student/profile/:studentId` | Teacher, Admin | Get a student's full profile |
| GET | `/student/profile` | Student | Get own profile |
| PUT | `/student/profile` | Student | Update own profile |
| GET | `/student/attendance` | Student | View own attendance |
| GET | `/student/attendance/report` | Student | Download own attendance report |

### Teacher — `/teacher`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/teacher/profile` | Teacher | Get own teacher profile |
| PUT | `/teacher/profile` | Teacher | Update own teacher profile |

### Admin — `/admin`

| Method | Endpoint | Role | Description |
|--------|----------|------|-------------|
| GET | `/admin/users` | Admin | List all users (paginated) |
| GET | `/admin/users/:id` | Admin | Get user by ID |
| POST | `/admin/users` | Admin | Create user (emails credentials) |
| PUT | `/admin/users/:id` | Admin | Update user |
| PUT | `/admin/users/:id/classes` | Admin | Assign classes to a teacher |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| GET | `/admin/stats` | Admin | System-wide statistics |
| GET | `/admin/classes` | Admin | All classes |
| GET | `/admin/classes/available` | Admin | Classes without a teacher |
| GET | `/admin/classes/:id` | Admin | Class details |
| GET | `/admin/reports` | Admin | Attendance reports |
| GET | `/admin/reports/overall` | Admin | Overall attendance report |
| GET | `/admin/reports/class/:classId` | Admin | Class-level attendance details |
| GET | `/admin/settings` | Admin | Get system settings |
| PUT | `/admin/settings` | Admin | Update system settings |
| POST | `/admin/settings/test-email` | Admin | Test SMTP configuration |
| POST | `/admin/backup` | Admin | Create a data backup |

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

## User Roles & Workflows

### ⚙️ Admin
Scope: Full system access

- Create, update, and delete users (credentials auto-emailed on creation)
- Manage classes — create, assign teachers, enroll students
- View system-wide attendance stats and reports
- Configure system settings (threshold, notifications, session timeout)
- Manually trigger email notifications
- Create data backups

### 🧑‍🏫 Teacher
Scope: Assigned classes only

- View all classes assigned to them
- Mark and toggle attendance per student per date
- Bulk mark all students present or absent
- View student profiles and attendance history
- Modify attendance within the 48-hour window
- Works fully offline — attendance syncs automatically on reconnect

### 🎓 Student
Scope: Own data only

- View personal attendance records and percentage
- Download attendance report
- Update their own password

---

## Offline-First & PWA

AttendSync is built as an offline-first PWA to handle real-world low-connectivity environments.

### How Offline Works

| Layer | Technology | Role |
|-------|------------|------|
| App Shell Caching | Service Worker (cache-first) | Core UI assets cached on first load |
| Offline Attendance Queue | IndexedDB (`AttendSyncDB`) | Attendance records stored locally when offline |
| Background Sync | Service Worker Background Sync API | Auto-syncs queued records when back online |
| Connectivity Detection | SyncManager (health-check polling every 2s) | Detects real connectivity, not just browser events |
| Sync Status UI | `OfflineIndicator` component | Shows online/offline state and pending count |

### Offline Flow

1. Teacher marks attendance — saved to `AttendSyncDB` (IndexedDB) with `synced: 0`
2. Service Worker registers `sync-attendance` background sync task
3. SyncManager polls `/health` every 2 seconds to detect real connectivity
4. On reconnect, all pending records are grouped by auth token and bulk-synced via `POST /attendance/bulk-sync`
5. Successfully synced records are deleted from IndexedDB
6. `OfflineIndicator` updates to show sync complete

### PWA Installation

- Mobile (Android/iOS): Browser menu → "Add to Home Screen"
- Desktop (Chrome/Edge): Click ⊕ in address bar → "Install"

---

## Project Structure

```
AttendSync/
├── client/                          # Next.js frontend
│   ├── public/
│   │   ├── sw.js                    # Custom Service Worker
│   │   ├── manifest.json            # PWA manifest
│   │   └── icon-*.png/svg           # PWA icons
│   ├── scripts/
│   │   └── generate-icons.js        # PWA icon generator
│   └── src/
│       ├── app/
│       │   ├── dashboard/           # Role-based dashboard pages
│       │   │   ├── attendance/      # Teacher & student attendance views
│       │   │   ├── classes/         # Class management
│       │   │   ├── students/        # Student management
│       │   │   └── admin/           # Admin panel
│       │   ├── forgot-password/
│       │   ├── reset-password/
│       │   ├── layout.tsx
│       │   └── page.tsx             # Login / landing
│       ├── components/              # Shared UI components
│       ├── hooks/
│       │   ├── useOfflineAttendance.ts  # Offline-first attendance logic
│       │   └── useRoleAccess.ts         # Role-based access control
│       ├── lib/
│       │   ├── api.ts               # Axios instance
│       │   ├── offlineDB.ts         # IndexedDB wrapper (AttendSyncDB)
│       │   ├── syncManager.ts       # Background sync + connectivity detection
│       │   ├── pwa.ts               # PWA utilities
│       │   └── permissions.ts       # Role permission map
│       └── store/
│           ├── authStore.ts         # Auth state (Zustand)
│           └── settingsStore.ts     # App settings (Zustand)
│
├── server/                          # Express.js backend
│   ├── prisma/
│   │   ├── schema.prisma            # Database schema & models
│   │   └── migrations/              # Prisma migration history
│   └── src/
│       ├── controllers/             # Route handlers
│       ├── middlewares/             # Auth, RBAC, validation, rate limiting, error handling
│       ├── routes/                  # Express routers
│       ├── services/
│       │   ├── auth.service.ts      # Token management
│       │   ├── email.service.ts     # Nodemailer + HTML templates
│       │   ├── notification.service.ts  # Absent alerts + daily reports
│       │   └── scheduler.service.ts     # node-cron jobs (6 PM + 7 PM IST)
│       ├── schemas/                 # Zod validation schemas
│       ├── utils/                   # apiError, apiResponse, asyncHandler, attendanceUtils
│       ├── db/                      # Prisma client singleton
│       ├── app.ts                   # Express app setup
│       └── index.ts                 # Server entry point
│
└── README.md
```

---

## Local Setup Guide

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | 18+ |
| PostgreSQL | 14+ |
| Git | any |

### 1. Clone the Repository

```bash
git clone <repo-url>
cd AttendSync
```

### 2. Backend Setup

```bash
cd server
npm install
cp .env.sample .env
# Edit .env with your values
npx prisma generate
npx prisma db push
npm run dev
```

Backend runs at `http://localhost:5001`.

### 3. Frontend Setup

```bash
cd client
npm install --legacy-peer-deps
# Create .env.local if needed (see Environment Variables)
npm run dev
```

Frontend runs at `http://localhost:3000`.

---

## Environment Variables

### Backend (`server/.env`)

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

### Frontend (`client/.env.local`)

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```

---

## License

MIT License

---

## Author

Aryan Singh ❤️

Built using Next.js, Node.js, PostgreSQL, and Prisma.