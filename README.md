# ComplaintSync

*A full-stack Complaint Management System for registering, assigning, tracking, and resolving organizational and campus grievances in real time.*

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-C5F74F?style=for-the-badge&logo=drizzle&logoColor=black)
![Express.js](https://img.shields.io/badge/Express_5-404D59?style=for-the-badge&logo=express&logoColor=white)
![React](https://img.shields.io/badge/React_18-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![Firebase Auth](https://img.shields.io/badge/Firebase_Auth-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white)

---

## About The Project

**ComplaintSync** provides a centralized platform for students, staff, and administrators to manage complaints from submission through final resolution. Built on **PostgreSQL** with **Drizzle ORM**, **Express 5**, **Socket.IO**, and a **React + Vite** single-page application, it delivers relational data integrity, role-based access control, real-time notifications, and exportable reporting.

---

## Key Features

- **Role-Based Portals (`user`, `staff`, `admin`)**
  - **Students**: Submit complaints with priority, category, location, and image attachments; track live statuses and notifications; manage profile details.
  - **Staff**: View assigned tickets, update progress (`in-progress`, `resolved`, `rejected` with reasons), and track personal workload metrics.
  - **Admins**: Monitor organization-wide analytics, assign/reassign complaints to category staff, manage students (suspend/reactivate/delete) and staff accounts, customize complaint categories, toggle maintenance mode, and export PDF reports.
- **Dual Authentication & Security**
  - Local email/password authentication with bcrypt hashing, short-lived JWT access tokens + refresh tokens, lockout protection, and optional 6-digit OTP email verification.
  - **Firebase Authentication** (Google Sign-In) with concurrency-safe user provisioning in PostgreSQL.
  - Helmet security headers, rate limiting, input sanitization, and strict server-side authorization checks.
- **PostgreSQL + Drizzle ORM Persistence**
  - Relational schema with foreign keys (`CASCADE` / `SET NULL`), composite indexes, JSONB attachments/categories, and atomic yearly complaint IDs (`CMP-YYYY-NNNN`).
- **Real-Time Updates**
  - Authenticated **Socket.IO** rooms (`user:<id>`, `role:<role>`) deliver instant notifications on complaint submission, assignment, reassignment, status updates, and resolution.
- **Optional Integrations**
  - **Brevo**: Transactional emails for verification OTPs, password resets, and complaint lifecycle alerts (falls back cleanly to instant registration when unconfigured).
  - **Cloudinary**: Cloud image storage for profile avatars and complaint attachments.

---

## Technology Stack

| Layer | Technologies |
| --- | --- |
| **Frontend** | React 18, Vite 6, React Router 7, Redux Toolkit, Axios, Recharts, Framer Motion, Three.js / React Three Fiber, jsPDF, Socket.IO Client |
| **Backend** | Node.js, Express 5, TypeScript (`tsx` runtime), Socket.IO, Express Validator, Helmet, Multer, BcryptJS, JSON Web Tokens |
| **Database** | PostgreSQL (`pg`), Drizzle ORM, Drizzle Kit |
| **Auth & Services** | Firebase Authentication (`firebase` + `firebase-admin`), Brevo Email API, Cloudinary |
| **Testing** | Vitest + React Testing Library (client), `node:test` (server unit tests) |

---

## Project Structure

```text
.
├── src/
│   ├── db/
│   │   ├── schema.ts           # PostgreSQL tables, indexes, and Drizzle relations
│   │   ├── index.ts            # pg.Pool + Drizzle database instance
│   │   ├── drizzle.config.ts   # Drizzle Kit schema push configuration
│   │   ├── users.ts            # User & Firebase auth repository helpers
│   │   ├── complaints.ts       # Complaint CRUD, analytics, and CMP-YYYY-NNNN counter
│   │   ├── notifications.ts    # Notification queries and cleanup helpers
│   │   └── settings.ts         # Singleton system settings repository
│   └── lib/
│       └── firebase-admin.ts   # Firebase Admin Auth initialization
├── server/
│   ├── app.js                  # Express middleware, API routes, and SPA static serving
│   ├── server.js               # HTTP + Socket.IO server entrypoint (port 3000)
│   ├── config/                 # Cloudinary and Firebase Admin bindings
│   ├── controllers/            # Route handlers (auth, complaints, admin, notifications, settings, users)
│   ├── middlewares/            # Auth, RBAC, maintenance mode, rate limiters, sanitization, uploads
│   ├── routes/                 # REST API routers mounted under /api
│   ├── services/               # Brevo email, Cloudinary upload, and notification services
│   └── utils/                  # Token signing, OTP helpers, pagination, socket emitter, validators
├── client/
│   └── src/
│       ├── pages/              # Home, Auth flows, Student, Staff, and Admin dashboards
│       ├── components/         # Shared UI, 3D spatial scene, modals, tables, charts
│       ├── context/            # AuthContext & ThemeContext
│       ├── redux/              # Complaints & Notifications state slices
│       ├── routes/             # Lazy-loaded routes & role-protected route guards
│       └── services/           # Axios API client, Socket.IO client, feature services
├── .env.example                # Non-secret environment variable placeholders
└── package.json                # Root build, start, dev, and lint scripts
```

---

## Database Schema

All application data is stored in PostgreSQL across five tables defined in `src/db/schema.ts`:

- **`users`**: Local and Firebase-authenticated accounts (`uid`, `email`, `phone`, `role`, suspension/lockout state, verification/reset OTP metadata).
- **`complaints`**: Grievance records (`complaint_id`, `title`, `description`, `category`, `priority`, `status`, `location`, `attachments` JSONB) linked to `users` via `student_id` and `assigned_to_id`.
- **`complaint_counters`**: Atomic yearly sequence counter generating human-readable `CMP-YYYY-NNNN` IDs.
- **`notifications`**: Per-user in-app notifications linked to recipient, sender, and complaint.
- **`settings`**: Singleton configuration row storing site metadata, maintenance mode, password/OTP policies, email toggles, and complaint categories.

---

## Environment Variables

See `.env.example` for the server configuration template. Never commit real secrets to the repository.

- **PostgreSQL Connection** (provided automatically in Cloud SQL environments):
  `SQL_HOST`, `SQL_USER`, `SQL_PASSWORD`, `SQL_DB_NAME` (and `SQL_ADMIN_USER` / `SQL_ADMIN_PASSWORD` for schema pushes)
- **Email Service (Brevo — Optional)**:
  `BREVO_API_KEY`, `EMAIL_FROM`, `EMAIL_SENDER_NAME`, `EMAIL_TEST_TO`
- **Image Uploads (Cloudinary — Optional)**:
  `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **Security & Runtime (Optional)**:
  `JWT_SECRET`, `JWT_REFRESH_SECRET` *(fall back to secure in-memory random keys if unset)*, `BCRYPT_ROUNDS` *(default: `12`)*, `CORS_ORIGIN`, `FRONTEND_URL`

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **PostgreSQL** database (e.g., Cloud SQL for PostgreSQL)

### Installation & Running

```bash
# 1. Install root, server, and client dependencies
npm install

# 2. Push the Drizzle schema to PostgreSQL
npx drizzle-kit push --config=src/db/drizzle.config.ts

# 3. Build the React frontend
npm run build

# 4. Start the unified Express + Socket.IO + SPA server on port 3000
npm run dev
```

For production startup:

```bash
npm start
```

### Frontend Development Server (Optional)

If developing the frontend separately with Vite:

```bash
npm run client
```

---

## Testing & Verification

```bash
# Server syntax lint
npm run lint

# Client unit tests (Vitest)
npm --prefix client run test -- --run

# Server security & logic unit tests
./node_modules/.bin/tsx --test server/__tests__/unit.security-and-logic.test.js
```

---

## API Overview

| Prefix | Purpose |
| --- | --- |
| `GET /api/health` | Public server health check |
| `/api/auth/*` | Registration, login, Firebase social login, token refresh, OTP verification, password reset, profile |
| `/api/complaints/*` | Submit, list, filter, update status, and view complaint analytics |
| `/api/admin/*` | Student & staff management, staff assignment, role promotion, complaint deletion |
| `/api/notifications/*` | Paginated notifications, unread counts, mark read, clear notifications |
| `/api/settings/*` | Admin system settings, category management, test email, system stats |
| `/api/users/*` | Profile updates, password changes, avatar uploads |
