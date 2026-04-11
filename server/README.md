# AttendSync - Server

This folder contains the backend API for AttendSync, a role-based attendance platform built with Node.js, Express, TypeScript, Prisma, and PostgreSQL.

## Features

### Authentication and Account Security
- JWT-based authentication with access and refresh token flow
- Role-based authorization for Admin, Teacher, and Student users
- OTP-based password reset with expiry and usage checks
- Password hashing with bcryptjs
- Login and API rate limiting for abuse protection

### Attendance Management
- Mark and toggle attendance by class and date
- Enforced attendance modification window to prevent late tampering
- Bulk sync endpoint for offline attendance uploads from client
- Per-student and per-class attendance retrieval

### Analytics and Reporting
- Student attendance percentage endpoints
- Class report by date range
- Monthly attendance summary endpoints
- PDF report generation support

### Notifications and Automation
- Email delivery via SMTP using Nodemailer
- Scheduled absent notifications
- Scheduled daily teacher report emails
- Manual admin-triggered notification endpoints

### Administrative Controls
- User lifecycle management (create, update, delete)
- Teacher-class assignment support
- Class and settings management APIs
- Backup trigger endpoint for admin workflows

## Tech Stack

- Node.js 20
- Express.js 5
- TypeScript 5
- Prisma ORM 6
- PostgreSQL 14+
- Zod
- jsonwebtoken
- bcryptjs
- Nodemailer
- node-cron
- express-rate-limit
- Helmet
- cookie-parser
- pdfkit

## Getting Started

### Prerequisites

- Node.js 18+
- PostgreSQL 14+
- npm

### Installation

1. Navigate to the server directory:

```bash
cd server
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables:

```bash
cp .env.sample .env
```

4. Update `.env` values as needed.

5. Generate Prisma client and apply schema:

```bash
npx prisma generate
npx prisma db push
```

6. Start development server:

```bash
npm run dev
```

Server URL (development): `http://localhost:5001`

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

## Project Structure

```text
server/
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── src/
│   ├── controllers/
│   ├── db/
│   ├── middlewares/
│   ├── routes/
│   ├── schemas/
│   ├── services/
│   ├── utils/
│   ├── app.ts
│   └── index.ts
├── package.json
└── README.md
```

## API Modules

- `/auth` - login, register, refresh, forgot/reset password, current user
- `/attendance` - attendance mark/toggle/fetch and offline bulk sync
- `/attendance-analytics` - percentage, reports, and monthly summaries
- `/class` - class CRUD and listing
- `/student` - student profile and attendance endpoints
- `/teacher` - teacher profile endpoints
- `/admin` - admin operations, settings, and reports
- `/notifications` - manual notification triggers
- `/health` - service health check

## Available Scripts

- `npm run dev` - Start development server with nodemon and ts-node
- `npm run build` - Compile TypeScript to JavaScript
- `npm start` - Start server using ts-node (`src/index.ts`)

## Scheduler Jobs

- Absent notifications job at 6 PM IST
- Daily report job at 7 PM IST

## Security and Validation

- Request validation using Zod schemas
- Security headers via Helmet
- Route-level role guards using middleware
- Global error handling middleware for consistent API responses

## License

MIT License

## Author

Aryan Singh

Built using Node.js, Express.js, TypeScript, Prisma, and PostgreSQL.