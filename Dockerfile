FROM oven/bun:1.3

WORKDIR /app
COPY package.json ./
COPY bun.lock ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install --frozen-lockfile

COPY . .
WORKDIR /app/apps/api
RUN bunx prisma generate

EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
