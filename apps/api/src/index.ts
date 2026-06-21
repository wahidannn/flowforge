import { app } from "./app";

const port = Number(process.env.PORT ?? 3001);

Bun.serve({
  fetch: app.fetch,
  port,
});

console.log(`FlowForge API listening on http://localhost:${port}`);
