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

- `pm@flowforge.test`
- `uiux@flowforge.test`
- `frontend@flowforge.test`
- `backend@flowforge.test`
- `client@flowforge.test`

## Deployment

- Database: Supabase PostgreSQL.
- Backend: Render Web Service memakai `apps/api/Dockerfile`.
- Frontend: Vercel atau Railway dengan `NEXT_PUBLIC_API_URL` mengarah ke backend Render.
