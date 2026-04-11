# AttendSync - Client

This folder contains the frontend code for AttendSync, an offline-first attendance platform built with Next.js 16, React 19, TypeScript, and Tailwind CSS.

## Features

### For Admins
- Manage users (create, update, assign, and deactivate)
- Manage classes and teacher assignments
- View attendance reports and analytics dashboards
- Configure system settings such as threshold and notification behavior

### For Teachers
- Mark attendance by class and date
- Toggle individual student attendance status instantly
- Bulk mark students as present or absent
- Work offline with automatic sync when internet is restored

### For Students
- View personal attendance history and percentage
- Download attendance reports
- Update own profile details

### General Frontend Features
- Role-based dashboard experience (Admin, Teacher, Student)
- JWT-based authentication flow with access and refresh token support
- OTP-based password reset flow
- Offline attendance queue using IndexedDB
- Service Worker background sync for pending records
- Real-time sync status indicator for online/offline visibility
- Responsive UI for desktop and mobile screens

## Tech Stack

- Next.js 16 (App Router)
- React 19
- TypeScript 5
- Tailwind CSS 4
- Zustand
- React Hook Form
- Zod
- Axios
- react-hot-toast
- IndexedDB (native browser API)
- Service Worker (custom)

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Installation

1. Navigate to the client directory:

```bash
cd client
```

2. Install dependencies:

```bash
npm install --legacy-peer-deps
```

3. Create `.env.local` in the client root and set backend API URL:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```

4. Start the development server:

```bash
npm run dev
```

Application URL (development): `http://localhost:3000`

### Build and Preview

```bash
npm run build
npm start
```

## Project Structure

```text
client/
├── public/
│   ├── manifest.json
│   └── sw.js
├── scripts/
│   └── generate-icons.js
├── src/
│   ├── app/
│   │   ├── dashboard/
│   │   │   ├── attendance/
│   │   │   ├── classes/
│   │   │   └── ...
│   │   ├── forgot-password/
│   │   ├── reset-password/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── auth/
│   │   ├── OfflineIndicator.tsx
│   │   ├── PWAInitializer.tsx
│   │   └── ...
│   ├── hooks/
│   │   ├── useOfflineAttendance.ts
│   │   └── useRoleAccess.ts
│   ├── lib/
│   │   ├── api.ts
│   │   ├── offlineDB.ts
│   │   ├── pwa.ts
│   │   ├── permissions.ts
│   │   └── syncManager.ts
│   └── store/
│       ├── authStore.ts
│       └── settingsStore.ts
├── package.json
└── README.md
```

## Key Modules

- `useOfflineAttendance`: Handles offline queue writes and sync triggers
- `syncManager`: Monitors connectivity and pushes pending attendance records
- `offlineDB`: IndexedDB wrapper for local persistence
- `OfflineIndicator`: Displays connection and sync state to users
- `authStore`: Global authentication state and role context

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint checks
- `npm run setup-pwa` - Generate PWA icon set

## Offline and PWA Notes

- Attendance can be marked without internet access
- Pending records are stored locally in IndexedDB (`AttendSyncDB`)
- Service Worker registers background sync jobs
- Pending records are bulk synced to the backend on reconnect

## Deployment

The client is a Next.js application and can be deployed on Vercel or any Node.js-compatible hosting platform.

## License

MIT License

## Author

Aryan Singh

Built using Next.js, React, TypeScript, and Tailwind CSS.