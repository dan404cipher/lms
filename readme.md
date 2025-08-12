Learning Management System (LMS) Specification

Purpose:
This document describes the product requirements, roles, features, architecture notes, data model sketches, and an implementation roadmap for building a modern LMS for Axess Upskill. The frontend will be built with Vite + React + TypeScript and the backend with TypeScript (recommended frameworks and libraries are noted). Aim is a scalable, secure, and UX-focused platform supporting Learner, Instructor, Admin, and Super Admin roles.

1. High-level goals

Provide a clean, responsive learning experience (web-first, mobile-friendly).

Fast content delivery and rich media support (video, docs, SCORM / xAPI-ready).

Integrate calendar & Zoom for scheduling and live sessions.

Track attendance, credits, and learner progress.

Real-time chat, announcements, and notifications (email/push/in-app).

Role-based access control (RBAC) for Learner, Instructor, Admin, Super Admin.

Modular backend in TypeScript, easily testable and deployable.

2. Roles & Permissions (summary)

Learner: browse/enroll courses, view content, attend live classes (Zoom), take quizzes, view progress, chat in course groups, receive notifications, download certificates.

Instructor: create/manage courses and lessons, schedule Zoom sessions, view attendance/analytics for their courses, grade assignments/quizzes, moderate course chat.

Admin: manage users (except Super Admin-only actions), approve instructors, manage site-wide content (catalog, categories), billing overview, moderate chats, view platform analytics.

Super Admin: full system control, tenant/branding settings, global feature toggles, system audits, manage admins.

Permissions design note: Use a combination of Roles + Fine-Grained Permissions. Example permission primitives: course.create, course.publish, session.schedule, user.manage, reports.view.

3. Key Features (maximised list)

Core Learning

Course catalog with categories, tags, search, and filters.

Course pages: syllabus, instructor bios, curriculum (modules → lessons), prerequisites, reviews & ratings.

Content types: video (MP4/HLS), PDF, slides, SCORM/xAPI packages, downloadable assets, embedded HTML.

Lesson-level progress and bookmarking.

Enrollment & Credits

Free / paid courses; coupon codes and promotions.

Credits system: allocate credits to learners; courses cost credits; convertible to certificates or badges.

Purchase history & invoices.

Live Sessions & Calendar

Zoom integration (OAuth + API): schedule meetings, generate join links, sync recordings and attendance.

Calendar sync: Google Calendar / Outlook (OAuth ICS), export ICS for events.

In-app calendar view (course calendar + personal schedule).

Attendance & Assessment

Attendance capture options:

Zoom-based attendance via Zoom reports/API.

Manual roll-call by instructor.

Quiz/assignment completion as attendance heuristics.

Quizzes: multiple choice, true/false, short answer; auto/ manual grading.

Assignments: upload submissions, grade rubrics, feedback comments.

Certificates generation (PDF) on course completion.

Communication

Real-time chat per course (group chat) and 1:1 messaging between users.

Discussion forums threaded per course/module.

Announcements: course-level and platform-level.

Notifications: in-app, email, optional push (web push / mobile push). Template-based for consistency.

Admin Tools & Reporting

Course analytics (completion rates, engagement, time spent per lesson).

User analytics, cohort reports, revenue dashboards.

Audit logs for key actions (user creation, role changes, payments).

Security & Compliance

OAuth2 / JWT for authentication.

RBAC and audit trails.

Rate-limiting, input validation, and content sanitization.

GDPR-ready features: data export, delete requests, consent logs (if applicable).

4. MVP vs Phase 2 (recommended)

MVP (deliver in 6–10 weeks for a small team):

User auth (signup, login, roles), basic RBAC.

Course CRUD (instructors), lesson content upload (video, PDF), course enrollment.

Zoom scheduling + join link (basic integration), simple calendar view, ICS export.

In-app notifications + email for key events.

Simple attendance via Zoom report/manual marking.

Basic chat (course-level) and announcements.

Phase 2 (enhancements):

Credits & payments, coupons, invoices.

SCORM/xAPI support, advanced media streaming (HLS/CDN).

Advanced analytics, cohort management, certificate designer.

1:1 messaging, forums, threaded comments, push notifications.

Multi-tenancy / Super Admin advanced controls.

5. UX / Pages & Flows (quick list)

Landing / Marketing pages (public catalog).

Dashboard (Learner / Instructor / Admin variations).

Course detail page + syllabus.

Lesson player page with resources, progress bar, comments.

Create/Edit course wizard (modules → lessons → assets → publish settings).

Calendar & scheduled sessions page.

Chat/Discussions panel (sidebar or dedicated page).

Admin console: users, courses, payments, reports, settings.

6. Data Model (simplified)

Users: id, name, email, passwordHash, role, profile, credits, createdAt, status

Courses: id, title, description, categoryId, instructorId, priceCredits/priceAmount, published, thumbnail, tags, createdAt

Modules: id, courseId, title, order

Lessons: id, moduleId, title, contentType (video/pdf/scorm), mediaUrl, duration, order

Enrollments: id, userId, courseId, status (in-progress/completed), progress, creditsPaid, enrolledAt

Sessions: id, courseId, zoomMeetingId, scheduledAt, duration, recordingUrl

Attendance: id, sessionId, userId, present(Boolean), joinedAt, leftAt

Chats: id, courseId|null, fromUserId, toUserId|null, message, createdAt

Notifications: id, userId, type, payload(json), readAt

Certificates: id, userId, courseId, issuedAt, certUrl

Note: Use a relational DB (Postgres) for strong relationships; consider Redis for caching and pub/sub (real-time chat) and object storage (S3) for media.

7. API Surface (examples, REST/GraphQL)

Auth

POST /api/auth/register — register

POST /api/auth/login — returns JWT

POST /api/auth/refresh — refresh token

Courses

GET /api/courses — list & search

GET /api/courses/:id — details

POST /api/courses — create (instructor)

PUT /api/courses/:id — update

POST /api/courses/:id/publish — publish

Lessons / Media

POST /api/courses/:id/media — upload asset (multipart, store in S3)

GET /api/lessons/:id/stream — streaming URL (signed)

Sessions & Zoom

POST /api/courses/:id/sessions — schedule Zoom (backend calls Zoom API)

GET /api/sessions/:id/attendance — fetch attendance

Enrollment

POST /api/courses/:id/enroll — enroll user

GET /api/users/:id/enrollments — list

Chat/Notifications

Websocket endpoint /ws for real-time events (chat, presence)

GET /api/notifications — fetch

POST /api/notifications/mark-read — mark

Implementation hint: Keep API small and consistent. For complex queries (analytics), consider GraphQL or REST endpoints with query params.

8. Integrations & Technical Notes

Zoom

Use OAuth app for production (so instructors can schedule on behalf of the Zoom account) or a single service account if sessions are hosted from a central account.

Backend stores zoomUserId, accessToken, refreshToken for instructor accounts that connect.

Use Zoom Meetings API to create meetings and Zoom Reports API to get attendance data.

Calendar

Support export to .ics and optional Google Calendar / Outlook sync via OAuth.

Show combined calendar (course sessions + personal events).

Media & Storage

Use S3-compatible storage for uploaded media and thumbnails.

Use signed URLs for secure streaming and downloads.

Consider using a CDN and HLS packaging for large video courses.

Real-time

Use WebSockets (socket.io or native ws) or a managed real-time service for chat and live session presence.

Use Redis for socket session store and pub/sub across instances.

Payments & Credits

Integrate with Stripe/Razorpay for payments, webhooks for payment confirmations.

Keep credit transactions immutable (ledger table) for auditability.

9. Security & Compliance (concise)

Passwords: strong hashing (argon2 / bcrypt). Use secure session or JWT with short lifetimes + refresh tokens.

Rate limit important endpoints (auth, chat message send).

Sanitize uploads and user-generated content to prevent XSS.

Enforce CORS, CSP headers, and HTTPS everywhere.

Data retention policy and GDPR export/delete endpoints if serving EU users.

10. Suggested Tech Stack (TypeScript-centered)

Frontend: Vite + React + TypeScript, React Router, React Query or SWR, Zustand/Redux (if needed), Tailwind CSS (or design system). Use component library for faster UI (Radix + shadcn, Chakra, or MUI).

Backend: Node.js with TypeScript — options:

NestJS (recommended for larger apps because of modularity, guards, DI, built-in testing structure).

Express / Fastify + TypeScript for lighter-weight approach.

DB: PostgreSQL (Prisma or TypeORM)

Realtime: Socket.IO or WebSocket server, Redis for scaling

Storage: AWS S3 (or Wasabi/MinIO)

Auth: JWT + refresh tokens and optional OAuth providers (Google, Zoom)

Background jobs: BullMQ / Redis + worker processes for email, Zoom sync, report generation

CI/CD: GitHub Actions → Docker images → deploy to your server or use managed containers