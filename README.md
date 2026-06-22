# FlowForge

FlowForge adalah sistem delivery project berbasis permission, dependency task, optimistic locking, soft delete, dan audit trail.

## Local Setup With Docker PostgreSQL

1. Install dependency:

```bash
bun install
```

2. Copy env untuk development lokal:

```bash
cp apps/api/.env.docker.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
```

3. Start PostgreSQL lokal:

```bash
bun run db:up
```

4. Generate Prisma client, deploy migration, dan seed demo data:

```bash
bun --cwd apps/api run prisma:generate
bun run db:migrate
bun run db:seed
```

5. Jalankan backend dan frontend:

```bash
bun run dev:api
bun run dev:web
```

6. Cek API health:

```txt
http://localhost:3001/health
```

Jika Next.js memakai port selain `3000`, tambahkan origin tersebut ke `FRONTEND_URL` di `apps/api/.env` dengan format comma-separated, misalnya:

```txt
FRONTEND_URL="http://localhost:3000,http://localhost:3002"
```

## Database Development Commands

```bash
bun run db:up
bun run db:down
bun run db:logs
bun run db:migrate
bun run db:seed
```

PostgreSQL lokal berjalan di:

```txt
postgresql://flowforge:flowforge_dev_password@localhost:5432/flowforge_dev?schema=public
```

## Supabase Setup

Untuk staging atau production, ganti `DATABASE_URL` dengan Supabase PostgreSQL connection string.

## Demo Accounts

Semua akun seed memakai password `password123`.

| Role | Nama | Email | Password |
| --- | --- | --- | --- |
| PM | Project Manager | `pm@flowforge.test` | `password123` |
| INTERNAL | UI/UX Designer | `uiux@flowforge.test` | `password123` |
| INTERNAL | Frontend Engineer | `frontend@flowforge.test` | `password123` |
| INTERNAL | Backend Engineer | `backend@flowforge.test` | `password123` |
| CLIENT | Client Guest | `client@flowforge.test` | `password123` |

## Deployment

- Database: Supabase PostgreSQL.
- Backend: Render Web Service memakai `apps/api/Dockerfile`.
- Frontend: Vercel atau Railway dengan `NEXT_PUBLIC_API_URL` mengarah ke backend Render.

### Production Environment

Backend wajib memiliki:

```txt
DATABASE_URL=
JWT_SECRET=
JWT_EXPIRES_IN=1d
APP_ENV=production
FRONTEND_URL=https://your-frontend-domain.example.com
PORT=3001
```

`FRONTEND_URL` boleh berisi beberapa origin dipisahkan koma untuk staging dan production.

Frontend wajib memiliki:

```txt
NEXT_PUBLIC_API_URL=https://your-backend-domain.example.com/api
```

Sebelum traffic production diarahkan ke backend, jalankan migration ke database production:

```bash
bun run --cwd apps/api prisma:deploy
```

Seed demo data hanya dijalankan di environment demo/staging yang memang membutuhkan akun contoh:

```bash
bun run --cwd apps/api seed
```

Health check backend:

```txt
https://your-backend-domain.example.com/health
```
