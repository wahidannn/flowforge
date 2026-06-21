# Design Docs: FlowForge Project Delivery System

## 1. Overview

FlowForge adalah sistem manajemen delivery project untuk kolaborasi PM, tim internal, dan client. Fokus utama sistem bukan CRUD sederhana, melainkan memastikan aturan bisnis project delivery berjalan konsisten di backend dan frontend.

Prioritas desain:

- State-based permissions untuk membatasi aksi berdasarkan role, membership, dan status task.
- Dependency-aware task board agar task otomatis terblokir ketika dependency belum selesai.
- Optimistic locking untuk mencegah race condition saat banyak user mengubah task yang sama.
- Soft delete agar data historis tidak hilang permanen.
- Audit trail append-only untuk semua perubahan task.
- Data visibility yang aman untuk Client Guest.
- Daily Standup Summary sebagai fitur bonus untuk ringkasan progres dan blocker harian.

Tech stack:

- Backend: Bun, Hono, TypeScript, PostgreSQL, Prisma, JWT, Zod.
- Frontend: Next.js 16, React 19, TypeScript, Tailwind CSS, shadcn/ui, TanStack Query, Zustand, React Hook Form, Zod.
- Deployment: backend di Render, frontend di Vercel/Railway, database PostgreSQL di Supabase dengan Prisma Migration dan Seed.

## 2. Roles dan Permission Model

### 2.1 Role Global

Role disimpan pada user dan dipakai bersama project membership:

| Role | Deskripsi |
| --- | --- |
| `PM` | Pengelola project, task, assignment, dan dependency. |
| `INTERNAL` | Anggota tim internal seperti UI/UX, Frontend, Backend. |
| `CLIENT` | Guest dari client yang hanya melihat progres project miliknya. |

### 2.2 Project Membership

User harus memiliki relasi ke project melalui `ProjectMember` agar dapat mengakses project. Membership menentukan project mana yang boleh diakses user.

Untuk Client Guest:

- Hanya boleh melihat project tempat user menjadi member client.
- Hanya boleh melihat task dengan `clientVisible = true`.
- Tidak boleh menerima data internal team, internal comment, audit internal, atau field sensitif dari API.

### 2.3 Permission Matrix

| Aksi | PM | Internal Team | Client Guest |
| --- | --- | --- | --- |
| Melihat project | Project yang dimiliki/di-manage | Project tempat assigned task berada | Project miliknya |
| Melihat task | Semua task dalam project | Hanya task yang ditugaskan | Hanya task `clientVisible = true` |
| Membuat project | Ya | Tidak | Tidak |
| Mengubah project | Ya | Tidak | Tidak |
| Membuat task | Ya | Tidak | Tidak |
| Mengubah metadata task | Ya | Tidak | Tidak |
| Mengubah deskripsi task | Ya | Tidak | Tidak |
| Mengatur dependency | Ya | Tidak | Tidak |
| Mengubah status task | Ya, kecuali `IN_PROGRESS -> DONE` | Ya, hanya task assigned dan sesuai dependency | Tidak |
| Upload attachment | Ya | Ya, hanya task assigned | Tidak |
| Melihat attachment internal | Ya | Ya, hanya task assigned/authorized | Tidak |
| Melihat komentar internal | Ya | Ya, jika authorized | Tidak |
| Melihat audit trail | Ya | Ya, untuk task authorized | Tidak |
| Soft delete task | Ya | Tidak | Tidak |
| Restore task | Ya | Tidak | Tidak |

Aturan utama:

- PM dapat mengelola project, task, dan dependency, tetapi tidak dapat mengubah status task dari `IN_PROGRESS` ke `DONE`.
- Internal Team hanya bisa melihat task yang ditugaskan kepadanya.
- Internal Team hanya bisa mengubah status dan upload attachment pada task assigned.
- Internal Team tidak bisa mengubah title, deskripsi, priority, assignee, due date, dependency, atau visibility task.
- Task hanya bisa dimulai jika seluruh dependency sudah selesai.
- Client Guest hanya menerima DTO khusus client.

## 3. Domain Model

### 3.1 Enum

```ts
enum UserRole {
  PM = "PM",
  INTERNAL = "INTERNAL",
  CLIENT = "CLIENT",
}

enum TaskStatus {
  TODO = "TODO",
  BLOCKED = "BLOCKED",
  IN_PROGRESS = "IN_PROGRESS",
  REVIEW = "REVIEW",
  DONE = "DONE",
  CANCELLED = "CANCELLED",
}

enum AuditAction {
  CREATE = "CREATE",
  UPDATE = "UPDATE",
  STATUS_CHANGE = "STATUS_CHANGE",
  DEPENDENCY_ADD = "DEPENDENCY_ADD",
  DEPENDENCY_REMOVE = "DEPENDENCY_REMOVE",
  ATTACHMENT_ADD = "ATTACHMENT_ADD",
  ATTACHMENT_DELETE = "ATTACHMENT_DELETE",
  SOFT_DELETE = "SOFT_DELETE",
  RESTORE = "RESTORE",
}
```

### 3.2 Prisma Model Draft

```prisma
model User {
  id           String          @id @default(cuid())
  email        String          @unique
  name         String
  passwordHash String
  role         UserRole
  createdAt    DateTime        @default(now())
  updatedAt    DateTime        @updatedAt
  deletedAt    DateTime?

  memberships  ProjectMember[]
  assignedTasks Task[]         @relation("TaskAssignee")
  auditLogs     AuditLog[]
}

model Project {
  id          String          @id @default(cuid())
  name        String
  description String?
  clientName  String
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  deletedAt   DateTime?

  members     ProjectMember[]
  tasks       Task[]
  summaries   DailyStandupSummary[]
}

model ProjectMember {
  id        String   @id @default(cuid())
  projectId String
  userId    String
  role      UserRole
  createdAt DateTime @default(now())
  deletedAt DateTime?

  project Project @relation(fields: [projectId], references: [id])
  user    User    @relation(fields: [userId], references: [id])

  @@unique([projectId, userId])
  @@index([userId])
  @@index([projectId])
}

model Task {
  id            String       @id @default(cuid())
  projectId     String
  assigneeId    String?
  title         String
  description   String
  status        TaskStatus   @default(TODO)
  priority      String?
  dueDate       DateTime?
  clientVisible Boolean      @default(false)
  version       Int          @default(1)
  createdAt     DateTime     @default(now())
  updatedAt     DateTime     @updatedAt
  deletedAt     DateTime?

  project       Project      @relation(fields: [projectId], references: [id])
  assignee      User?        @relation("TaskAssignee", fields: [assigneeId], references: [id])
  dependencies  TaskDependency[] @relation("TaskDependencies")
  dependents    TaskDependency[] @relation("TaskDependents")
  attachments   Attachment[]
  comments      Comment[]
  auditLogs     AuditLog[]

  @@index([projectId, status])
  @@index([assigneeId])
  @@index([deletedAt])
}

model TaskDependency {
  id               String   @id @default(cuid())
  taskId           String
  dependsOnTaskId  String
  createdAt        DateTime @default(now())
  deletedAt        DateTime?

  task          Task @relation("TaskDependencies", fields: [taskId], references: [id])
  dependsOnTask Task @relation("TaskDependents", fields: [dependsOnTaskId], references: [id])

  @@unique([taskId, dependsOnTaskId])
  @@index([dependsOnTaskId])
}

model Attachment {
  id         String   @id @default(cuid())
  taskId     String
  uploaderId String
  fileName   String
  fileUrl    String
  mimeType   String
  sizeBytes  Int
  createdAt  DateTime @default(now())
  deletedAt  DateTime?

  task Task @relation(fields: [taskId], references: [id])
}

model Comment {
  id         String   @id @default(cuid())
  taskId     String
  authorId   String
  body       String
  internal   Boolean  @default(true)
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  deletedAt  DateTime?

  task Task @relation(fields: [taskId], references: [id])
}

model AuditLog {
  id          String      @id @default(cuid())
  taskId      String
  actorUserId String
  action      AuditAction
  field       String?
  oldValue    Json?
  newValue    Json?
  createdAt   DateTime    @default(now())

  task  Task @relation(fields: [taskId], references: [id])
  actor User @relation(fields: [actorUserId], references: [id])

  @@index([taskId, createdAt])
  @@index([actorUserId])
}

model DailyStandupSummary {
  id              String   @id @default(cuid())
  projectId       String
  summaryDate     DateTime
  completedCount  Int
  inProgressCount Int
  blockedCount    Int
  summaryText     String
  blockers        Json
  generatedAt     DateTime @default(now())
  deletedAt       DateTime?

  project Project @relation(fields: [projectId], references: [id])

  @@unique([projectId, summaryDate])
}
```

Catatan implementasi:

- Gunakan `deletedAt` pada entity utama.
- `AuditLog` tidak memiliki `deletedAt` karena append-only.
- Untuk enum Prisma, sesuaikan syntax final dengan Prisma schema aktual.
- `priority` dapat dibuat enum pada implementasi jika nilai sudah disepakati.

## 4. Task Lifecycle dan State Machine

### 4.1 Status

| Status | Makna |
| --- | --- |
| `TODO` | Task belum dikerjakan dan dependency sudah aman atau belum dicek. |
| `BLOCKED` | Task belum bisa dikerjakan karena dependency belum selesai. |
| `IN_PROGRESS` | Task sedang dikerjakan. |
| `REVIEW` | Task sudah selesai dikerjakan oleh internal dan menunggu review/approval. |
| `DONE` | Task selesai. |
| `CANCELLED` | Task dibatalkan. |

### 4.2 Transisi Status

| Dari | Ke | PM | Internal Team | Catatan |
| --- | --- | --- | --- | --- |
| `TODO` | `IN_PROGRESS` | Ya | Ya, jika assigned | Semua dependency harus `DONE`. |
| `TODO` | `BLOCKED` | Ya | Sistem | Dipakai saat dependency belum selesai. |
| `BLOCKED` | `TODO` | Ya | Sistem | Saat semua dependency selesai. |
| `IN_PROGRESS` | `REVIEW` | Ya | Ya, jika assigned | Jalur normal sebelum done. |
| `REVIEW` | `DONE` | Ya | Ya, jika assigned | Selesai setelah review. |
| `IN_PROGRESS` | `DONE` | Tidak | Ya, jika assigned dan aturan project mengizinkan | PM dilarang melakukan transisi ini. |
| `TODO` | `CANCELLED` | Ya | Tidak | PM only. |
| `IN_PROGRESS` | `CANCELLED` | Ya | Tidak | PM only. |
| `REVIEW` | `CANCELLED` | Ya | Tidak | PM only. |

Aturan dependency:

- Task dianggap blocked secara efektif jika memiliki dependency aktif yang statusnya bukan `DONE`.
- Backend harus menghitung blocking state dari dependency, bukan mempercayai field status saja.
- Jika user mencoba memulai task yang dependency-nya belum selesai, API mengembalikan `422 Unprocessable Entity`.
- Board boleh menampilkan status derived `isBlocked = true` dan `blockedBy`.

### 4.3 Derived Blocked State

`BLOCKED` dapat disimpan sebagai status untuk kebutuhan board, tetapi sumber kebenaran tetap dependency.

Saat dependency berubah atau dependency task selesai:

- Recompute task terkait.
- Jika dependency belum selesai, task ditampilkan sebagai blocked.
- Jika semua dependency selesai dan status task `BLOCKED`, sistem dapat mengembalikan status ke `TODO`.

## 5. Dependency-Aware Task Board

Board API harus mengembalikan task dengan informasi dependency yang cukup untuk UI:

```ts
type BoardTaskDto = {
  id: string;
  title: string;
  status: TaskStatus;
  assignee?: {
    id: string;
    name: string;
  };
  clientVisible: boolean;
  version: number;
  isBlocked: boolean;
  blockedBy: Array<{
    id: string;
    title: string;
    status: TaskStatus;
  }>;
  dependencyIds: string[];
};
```

Aturan board:

- PM melihat semua task non-deleted di project.
- Internal Team hanya melihat task non-deleted yang `assigneeId` sama dengan user login.
- Client Guest hanya melihat task non-deleted dengan `clientVisible = true`, memakai DTO khusus client.
- UI harus mencegah drag/drop atau status update ke `IN_PROGRESS` jika `isBlocked = true`.
- Backend tetap melakukan validasi ulang karena frontend bukan sumber keamanan.

## 6. Optimistic Locking dan Conflict Handling

### 6.1 Prinsip

Setiap task memiliki `version`. Semua operasi update task wajib mengirim `version` terakhir yang diketahui client.

Operasi yang wajib memakai optimistic locking:

- Update metadata task.
- Change status task.
- Soft delete task.
- Restore task.
- Add/remove dependency jika mempengaruhi task.
- Attachment add/delete jika ingin dicatat sebagai perubahan task.

### 6.2 Atomic Update

Backend harus melakukan update dengan filter `id` dan `version`.

Contoh pola Prisma:

```ts
const result = await prisma.task.updateMany({
  where: {
    id: taskId,
    version: input.version,
    deletedAt: null,
  },
  data: {
    status: input.status,
    version: { increment: 1 },
  },
});

if (result.count === 0) {
  throw new ConflictError("TASK_VERSION_CONFLICT");
}
```

Jika conflict terjadi:

- Ambil task terbaru dari database.
- Kembalikan HTTP `409 Conflict`.
- Sertakan `currentVersion`, `currentTask`, dan field yang kemungkinan berubah.

Response:

```json
{
  "error": {
    "code": "TASK_VERSION_CONFLICT",
    "message": "Task has been modified by another user.",
    "currentVersion": 4,
    "currentTask": {
      "id": "task_123",
      "status": "REVIEW",
      "version": 4,
      "updatedAt": "2026-06-19T10:20:30.000Z"
    }
  }
}
```

### 6.3 Frontend Conflict Recovery

Saat menerima `409`:

- TanStack Query invalidate task detail dan board query.
- Tampilkan dialog conflict.
- Beri aksi `Reload latest`.
- Untuk form metadata, tampilkan bahwa data telah berubah dan user harus review ulang sebelum submit.

## 7. Soft Delete Policy

Aturan:

- Data tidak pernah dihapus permanen dari operasi aplikasi normal.
- Entity utama memakai `deletedAt`.
- Query default selalu menambahkan `deletedAt: null`.
- Delete mengisi `deletedAt = now()`.
- Restore mengosongkan `deletedAt`.
- Delete dan restore wajib membuat audit log.

Entity soft-delete:

- User
- Project
- ProjectMember
- Task
- TaskDependency
- Attachment
- Comment
- DailyStandupSummary

Entity append-only:

- AuditLog

Hard delete hanya boleh dilakukan melalui maintenance script terpisah dengan approval eksplisit, bukan dari API aplikasi.

## 8. Audit Trail Policy

Audit trail wajib dibuat untuk semua perubahan task.

Data minimal:

- `taskId`
- `actorUserId`
- `createdAt`
- `action`
- `field`
- `oldValue`
- `newValue`

Event yang wajib dicatat:

- Task dibuat.
- Status berubah.
- Metadata task berubah, seperti title, description, assignee, dueDate, priority, clientVisible.
- Dependency ditambah/dihapus.
- Attachment ditambah/dihapus.
- Task soft delete.
- Task restore.

Audit harus dibuat dalam database transaction yang sama dengan perubahan task. Jika audit gagal, perubahan task juga gagal.

Contoh audit untuk status:

```json
{
  "taskId": "task_123",
  "actorUserId": "user_456",
  "action": "STATUS_CHANGE",
  "field": "status",
  "oldValue": "IN_PROGRESS",
  "newValue": "REVIEW"
}
```

## 9. Backend Architecture

### 9.1 Layering

Struktur backend yang disarankan:

```txt
apps/api/src
  app.ts
  routes
    auth.routes.ts
    projects.routes.ts
    tasks.routes.ts
    dependencies.routes.ts
    attachments.routes.ts
    audit.routes.ts
    standup.routes.ts
  modules
    auth
    projects
    tasks
    permissions
    audit
    dependencies
    attachments
    standup
  middleware
    auth.middleware.ts
    error.middleware.ts
  lib
    prisma.ts
    jwt.ts
    zod.ts
```

Tanggung jawab:

- Routes hanya parsing request dan response.
- Zod schema memvalidasi input.
- Service menjalankan aturan bisnis dan transaction.
- Permission module menjadi satu sumber aturan otorisasi.
- DTO mapper mengontrol field yang keluar dari API.

### 9.2 Authentication

JWT payload:

```ts
type JwtPayload = {
  sub: string;
  role: UserRole;
  email: string;
};
```

Middleware:

- Validasi Bearer token.
- Load user aktif dengan `deletedAt = null`.
- Simpan `ctx.user`.

Authorization tidak cukup dari JWT saja. Backend tetap harus cek membership project dari database.

## 10. API Design

Base path: `/api`

### 10.1 Auth

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `POST` | `/auth/login` | Public | Login dan menerima JWT. |
| `GET` | `/auth/me` | Authenticated | Mengambil profil user login. |

`POST /auth/login`

```json
{
  "email": "pm@flowforge.test",
  "password": "password123"
}
```

### 10.2 Projects

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/projects` | Authenticated | List project sesuai role/membership. |
| `POST` | `/projects` | PM | Buat project. |
| `GET` | `/projects/:projectId` | Project member | Detail project sesuai visibility role. |
| `PATCH` | `/projects/:projectId` | PM | Update project. |
| `DELETE` | `/projects/:projectId` | PM | Soft delete project. |

### 10.3 Tasks

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/tasks/board` | Project member | Board task sesuai role. |
| `POST` | `/projects/:projectId/tasks` | PM | Buat task. |
| `GET` | `/tasks/:taskId` | Authorized user | Detail task sesuai role. |
| `PATCH` | `/tasks/:taskId` | PM | Update metadata task dengan optimistic locking. |
| `PATCH` | `/tasks/:taskId/status` | PM/Internal | Update status dengan optimistic locking. |
| `DELETE` | `/tasks/:taskId` | PM | Soft delete task. |
| `POST` | `/tasks/:taskId/restore` | PM | Restore task. |

Update metadata:

```json
{
  "version": 3,
  "title": "Build project dashboard",
  "description": "Implement dashboard for PM and internal team.",
  "assigneeId": "user_internal_1",
  "priority": "HIGH",
  "dueDate": "2026-06-25T00:00:00.000Z",
  "clientVisible": true
}
```

Update status:

```json
{
  "version": 3,
  "status": "REVIEW"
}
```

### 10.4 Dependencies

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `POST` | `/tasks/:taskId/dependencies` | PM | Tambah dependency. |
| `DELETE` | `/tasks/:taskId/dependencies/:dependencyId` | PM | Soft delete dependency. |

Request tambah dependency:

```json
{
  "version": 2,
  "dependsOnTaskId": "task_backend_api"
}
```

Validasi:

- Task dan dependency harus dalam project yang sama.
- Tidak boleh dependency ke diri sendiri.
- Tidak boleh membuat circular dependency.
- Tidak boleh memakai task soft-deleted.

### 10.5 Attachments

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/tasks/:taskId/attachments` | Authorized user | List attachment task. |
| `POST` | `/tasks/:taskId/attachments` | PM/Internal assigned | Upload attachment. |
| `DELETE` | `/tasks/:taskId/attachments/:attachmentId` | PM/uploader | Soft delete attachment. |

Client Guest tidak menerima attachment internal kecuali pada masa depan ada field visibility eksplisit. Untuk v1, attachment tidak diekspos ke Client Guest.

### 10.6 Audit

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/tasks/:taskId/audit` | PM/Internal authorized | Audit task. |

Client Guest tidak boleh mengakses audit trail.

### 10.7 Daily Standup Summary

| Method | Path | Akses | Deskripsi |
| --- | --- | --- | --- |
| `GET` | `/projects/:projectId/standup/daily` | PM/Internal | Ambil summary harian. |
| `POST` | `/projects/:projectId/standup/generate` | PM | Generate summary hari ini. |

Summary berisi:

- Jumlah task selesai hari ini.
- Jumlah task in progress.
- Jumlah task blocked.
- Daftar blocker utama.
- Narasi singkat progress project.

## 11. DTO dan Data Visibility

### 11.1 Internal Task DTO

Dipakai PM dan Internal Team sesuai authorization.

```ts
type InternalTaskDto = {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority?: string;
  dueDate?: string;
  clientVisible: boolean;
  assignee?: {
    id: string;
    name: string;
    email: string;
  };
  version: number;
  isBlocked: boolean;
  blockedBy: BoardTaskDto["blockedBy"];
  createdAt: string;
  updatedAt: string;
};
```

### 11.2 Client Task DTO

Dipakai Client Guest.

```ts
type ClientTaskDto = {
  id: string;
  title: string;
  status: TaskStatus;
  isBlocked: boolean;
  dueDate?: string;
  updatedAt: string;
};
```

Client DTO tidak boleh berisi:

- `assignee`
- email/user internal
- komentar internal
- attachment internal
- audit log
- dependency detail yang membuka task internal non-visible
- deskripsi internal jika dianggap sensitif

Jika dependency task client-visible mengarah ke task internal non-visible, response cukup menampilkan `isBlocked = true` tanpa detail task internal.

## 12. Validation Rules

Gunakan Zod untuk semua request body, params, dan query.

Validasi umum:

- `projectId`, `taskId`, dan ID lain berupa string non-empty.
- `version` wajib number integer positif untuk update.
- `status` harus salah satu `TaskStatus`.
- `clientVisible` boolean.
- `dueDate` ISO datetime jika dikirim.
- `title` wajib non-empty dan memiliki batas panjang.
- `description` wajib pada create task.

Validasi bisnis dilakukan di service setelah Zod:

- User memiliki membership project.
- User memiliki role yang benar.
- Task tidak soft-deleted.
- Dependency selesai sebelum start.
- Transisi status legal.
- Version cocok.

## 13. Frontend Architecture

### 13.1 Struktur

Struktur frontend yang disarankan:

```txt
apps/web/src
  app
    login
    projects
    projects/[projectId]
  components
    task-board
    task-card
    task-detail
    status-select
    conflict-dialog
  features
    auth
    projects
    tasks
    standup
  lib
    api-client.ts
    query-client.ts
    auth-store.ts
```

### 13.2 State Management

TanStack Query:

- Server state untuk auth profile, project list, board tasks, task detail, audit, summary.
- Mutations untuk status update, metadata update, dependency update, attachment upload.
- Invalidate board dan task detail setelah mutation sukses.
- Pada `409`, invalidate query dan tampilkan conflict dialog.

Zustand:

- `selectedProjectId`
- filter board
- mode board
- selected task drawer/modal
- UI state non-server.

React Hook Form + Zod:

- Login form.
- Project form.
- Task create/edit form.
- Dependency form.

### 13.3 UI Behavior

Task board:

- Kolom berdasarkan status.
- Task blocked diberi indikator visual dan tidak bisa dipindah ke `IN_PROGRESS`.
- Card menampilkan title, assignee untuk internal view, due date, status, dan blocked reason.
- Client view tidak menampilkan assignee/internal metadata.

Conflict dialog:

- Muncul saat API mengembalikan `409`.
- Menampilkan pesan bahwa task berubah di tempat lain.
- Aksi utama: reload latest.
- Form edit harus menutup atau reset ke data terbaru setelah user memilih reload.

Permission-aware UI:

- PM melihat kontrol create/edit/dependency/delete.
- Internal Team hanya melihat status control dan upload attachment pada assigned task.
- Client Guest hanya melihat progress read-only.

Backend tetap menjadi sumber otorisasi. UI gating hanya untuk UX.

## 14. Security

Aturan keamanan:

- Password disimpan sebagai hash, bukan plain text.
- JWT secret wajib dari environment variable.
- Token expiration wajib aktif.
- Semua route selain login menggunakan auth middleware.
- Semua akses project/task harus cek membership database.
- Client Guest wajib memakai DTO khusus.
- Jangan pernah mengirim komentar internal, audit, atau data internal team ke client.
- Validasi file upload: mime type, ukuran maksimum, dan storage path.
- Error response tidak boleh membocorkan stack trace di production.

Environment variable minimal:

```txt
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1d
APP_ENV=development
FRONTEND_URL=http://localhost:3000
FILE_STORAGE_DRIVER=local
```

## 15. Deployment, Supabase Database, Migration, dan Seed

### 15.1 Deployment Backend

Target backend: Render.

Langkah deployment:

- Buat Web Service di Render dari repository project.
- Set environment variables, termasuk `DATABASE_URL` dari Supabase dan `JWT_SECRET`.
- Gunakan build command yang menjalankan install dependency dan Prisma generate.
- Jalankan `prisma migrate deploy` saat deployment atau melalui Render job/manual command.
- Jalankan seed untuk akun demo jika environment mengizinkan.
- Start Hono app dengan Bun.

Catatan Render:

- Pastikan service memakai runtime yang mendukung Bun, atau gunakan Dockerfile jika konfigurasi Bun native tidak tersedia.
- Health check endpoint disarankan, misalnya `GET /health`.
- CORS backend harus mengizinkan domain frontend production.

### 15.2 Deployment Frontend

Target: Vercel atau Railway.

Langkah:

- Set `NEXT_PUBLIC_API_URL`.
- Build Next.js.
- Set domain backend Render sebagai API URL production.
- Pastikan CORS backend Render mengizinkan domain frontend.

### 15.3 Supabase Database

Target database: Supabase PostgreSQL.

Langkah setup:

- Buat project Supabase baru.
- Ambil PostgreSQL connection string dari Supabase dashboard.
- Set connection string tersebut sebagai `DATABASE_URL` di Render.
- Untuk Prisma migration dari local atau CI, gunakan connection string yang mendukung direct database access.
- Jalankan `prisma migrate deploy` ke database Supabase sebelum aplikasi menerima traffic production.
- Pastikan SSL requirement Supabase terpenuhi pada connection string jika dibutuhkan.

Catatan:

- Supabase digunakan sebagai managed PostgreSQL, bukan sebagai auth utama. Auth aplikasi tetap memakai JWT backend.
- Row Level Security Supabase tidak menjadi sumber authorization aplikasi untuk v1; permission tetap ditegakkan di backend.
- Backup dan restore mengikuti fitur Supabase sesuai plan yang dipakai.

### 15.4 Seed Accounts

Akun seed siap pakai:

| Role | Email | Password |
| --- | --- | --- |
| PM | `pm@flowforge.test` | `password123` |
| Internal UI/UX | `uiux@flowforge.test` | `password123` |
| Internal Frontend | `frontend@flowforge.test` | `password123` |
| Internal Backend | `backend@flowforge.test` | `password123` |
| Client Guest | `client@flowforge.test` | `password123` |

Seed data:

- Satu project demo.
- Beberapa task lintas tim.
- Minimal satu dependency chain.
- Minimal satu blocked task.
- Minimal satu task client-visible.
- Minimal satu task internal-only.
- Audit awal untuk task yang dibuat.

## 16. Error Handling

Format error standar:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request body.",
    "details": []
  }
}
```

Kode penting:

| HTTP | Code | Kondisi |
| --- | --- | --- |
| `400` | `BAD_REQUEST` | Request tidak valid secara umum. |
| `401` | `UNAUTHORIZED` | Token tidak ada/tidak valid. |
| `403` | `FORBIDDEN` | User tidak punya akses. |
| `404` | `NOT_FOUND` | Resource tidak ada atau soft-deleted. |
| `409` | `TASK_VERSION_CONFLICT` | Optimistic locking gagal. |
| `422` | `INVALID_TASK_TRANSITION` | Transisi status tidak legal. |
| `422` | `TASK_BLOCKED_BY_DEPENDENCY` | Task tidak bisa dimulai karena dependency. |
| `422` | `CIRCULAR_DEPENDENCY` | Dependency membentuk cycle. |

## 17. Testing Strategy

### 17.1 Unit Test

Permission rules:

- PM dapat create/update task metadata.
- PM tidak dapat `IN_PROGRESS -> DONE`.
- Internal hanya bisa melihat assigned task.
- Internal tidak bisa edit description.
- Client hanya bisa melihat task client-visible.

State machine:

- Transisi legal berhasil.
- Transisi illegal mengembalikan error.
- Task blocked tidak bisa start.
- Task bisa start setelah semua dependency `DONE`.

Audit:

- Perubahan status membuat audit log.
- Perubahan metadata membuat audit per field.
- Soft delete dan restore membuat audit log.

### 17.2 Integration Test

API dan database:

- Dua update paralel ke task yang sama menghasilkan satu sukses dan satu `409 Conflict`.
- Soft delete task membuat task hilang dari list normal tetapi row tetap ada.
- Client Guest response tidak mengandung `assignee`, email internal, komentar internal, atau audit.
- Add dependency menolak circular dependency.
- Upload attachment oleh internal hanya berhasil pada assigned task.

### 17.3 Frontend Test

Board:

- Task blocked tampil dengan indikator blocked.
- Internal tidak melihat task yang bukan assigned.
- Client hanya melihat task client-visible.
- Status update sukses memperbarui board.
- Conflict `409` menampilkan conflict dialog dan reload latest.

### 17.4 Acceptance Criteria

Sistem dianggap siap v1 jika:

- Semua role hanya dapat melihat dan melakukan aksi yang diizinkan.
- Task dependency selalu mencegah start sebelum dependency selesai.
- Race condition update task menghasilkan `409 Conflict`.
- Semua perubahan task tercatat di audit trail.
- Soft-deleted data tidak muncul di query aplikasi normal.
- Client Guest API tidak membocorkan data internal.
- Seed menyediakan akun PM, Internal Team, dan Client yang bisa langsung dipakai.

## 18. Implementation Notes

Urutan implementasi yang disarankan:

1. Setup monorepo/backend/frontend dan dependency dasar.
2. Definisikan Prisma schema, migration, dan seed.
3. Implement auth JWT dan middleware user context.
4. Implement permission module dan unit test.
5. Implement project dan task service.
6. Implement dependency-aware status rules.
7. Implement optimistic locking untuk update task.
8. Implement audit trail transaction.
9. Implement DTO mapper untuk internal dan client.
10. Implement frontend auth, project list, dan task board.
11. Implement conflict handling di frontend.
12. Tambahkan daily standup summary.
13. Lengkapi integration dan frontend tests.

Keputusan penting:

- Backend adalah sumber kebenaran untuk permission dan state transition.
- Frontend permission gating hanya untuk UX.
- Audit trail harus dalam transaction yang sama dengan perubahan task.
- `version` wajib di semua endpoint yang mengubah task.
- Data client harus selalu keluar lewat DTO khusus, bukan reuse DTO internal.
