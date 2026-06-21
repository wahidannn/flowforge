FROM oven/bun:1.1

WORKDIR /app
COPY package.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY packages/shared/package.json ./packages/shared/package.json
RUN bun install

COPY . .
WORKDIR /app/apps/api
RUN bunx prisma generate

EXPOSE 3001
CMD ["bun", "run", "src/index.ts"]
