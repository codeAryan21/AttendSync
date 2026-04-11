# AttendSync — Client

Next.js 16 frontend with PWA support and offline-first attendance marking.

## Table of Contents

- [Tech Stack](#tech-stack)
- [Setup](#setup)
- [Scripts](#scripts)
- [Project Structure](#project-structure)
- [Offline-First & PWA](#offline-first--pwa)
- [State Management](#state-management)
- [Role-Based Pages](#role-based-pages)
- [Environment Variables](#environment-variables)

---

## Tech Stack

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

---

## Setup

```bash
npm install --legacy-peer-deps
```

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:5001/api/v1
```

```bash
npm run dev   # http://localhost:3000
```

---

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (Turbopack) |
| `npm run build` | Production build |
| `npm start` | Production server |
| `npm run lint` | ESLint |
| `npm run setup-pwa` | Generate PWA icons |

---

## Project Structure

```
src/
├── app/
│   ├── dashboard/
│   │   ├── attendance/
│   │   │   ├── teacher/page.tsx     # Teacher attendance marking
│   │   │   └── student/page.tsx     # Student attendance view
│   │   ├── classes/                 # Class management
│   │   ├── students/                # Student management
│   │   └── admin/                   # Admin panel
│   ├── forgot-password/
│   ├── reset-password/
│   ├── layout.tsx                   # Root layout with providers
│   └── page.tsx                     # Login / landing
├── components/
│   ├── auth/                        # Auth-related components
│   ├── AttendanceFormExample.tsx
│   ├── DeleteModal.tsx
│   ├── LoadingSpinner.tsx
│   ├── OfflineIndicator.tsx         # Sync status + pending count
│   ├── PageHeader.tsx
│   ├── PWAInitializer.tsx           # Service Worker registration
│   ├── RoleDashboard.tsx            # Role-aware dashboard router
│   ├── Sidebar.tsx
│   └── TeacherClassAssignment.tsx
├── hooks/
│   ├── useOfflineAttendance.ts      # Offline-first attendance logic
│   └── useRoleAccess.ts             # Role-based access control
├── lib/
│   ├── api.ts                       # Axios instance with interceptors
│   ├── offlineDB.ts                 # IndexedDB wrapper (AttendSyncDB)
│   ├── syncManager.ts               # Connectivity detection + background sync
│   ├── pwa.ts                       # PWA utilities
│   └── permissions.ts               # Role permission map
└── store/
    ├── authStore.ts                 # Auth state (Zustand)
    └── settingsStore.ts             # App settings (Zustand)
```

---

## Offline-First & PWA

AttendSync works offline for attendance marking in low-connectivity environments.

### How It Works

| Layer | File | Role |
|-------|------|------|
| App Shell Caching | `public/sw.js` | Caches static assets on install; cache-first strategy |
| Offline Queue | `lib/offlineDB.ts` | Stores pending attendance in `AttendSyncDB` (IndexedDB) |
| Sync Manager | `lib/syncManager.ts` | Polls `/health` every 2s; triggers bulk sync on reconnect |
| Background Sync | `public/sw.js` (`sync` event) | Service Worker syncs queued records via Background Sync API |
| Status UI | `components/OfflineIndicator.tsx` | Shows online/offline state and pending record count |

### Offline Attendance Flow

1. `useOfflineAttendance` hook calls `syncManager.markAttendanceOffline()`
2. Record saved to IndexedDB with `synced: 0`
3. If online → `syncManager.syncNow()` fires immediately
4. If offline → Service Worker registers `sync-attendance` background sync
5. On reconnect → all pending records bulk-synced to `POST /attendance/bulk-sync`
6. Synced records deleted from IndexedDB; `OfflineIndicator` updates

### PWA Installation

- Mobile: Browser menu → "Add to Home Screen"
- Desktop (Chrome/Edge): Click ⊕ in address bar → "Install"

```bash
npm run setup-pwa   # generate PWA icons (192x192, 512x512)
```

---

## State Management

### `authStore` (Zustand)
- Stores `user`, `accessToken`
- Handles login, logout, token refresh
- Persisted across page reloads via `localStorage`

### `settingsStore` (Zustand)
- Stores system settings fetched from `GET /auth/settings`
- Used for attendance threshold display and notification config

---

## Role-Based Pages

| Role | Dashboard Access |
|------|-----------------|
| Admin | User management, system stats, all classes, settings, reports |
| Teacher | Assigned classes, attendance marking, student profiles |
| Student | Personal attendance, own profile |

Access is enforced by the `useRoleAccess` hook and `permissions.ts` map. Unauthorized routes redirect to the appropriate dashboard.

---

## Environment Variables

## License

MIT License

---

## Author

Aryan Singh

Built using Next.js, React, TypeScript, and Tailwind CSS.
