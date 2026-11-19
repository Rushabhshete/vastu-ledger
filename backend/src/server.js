import "./config/loadEnv.js";
import app from "./app.js";
import { checkConnection } from "./config/db.js";
import { initCronJobs, stopCronJobs } from "./services/cronService.js";

const PORT = Number(process.env.PORT) || 5000;

async function start() {
  await checkConnection();

  // Initialize automated billing & late-fee cron jobs
  initCronJobs();

  const server = app.listen(PORT, () => {
    console.log(`[VastuLedger] API running on http://localhost:${PORT}`);
  });

  // Graceful shutdown
  const shutdown = (signal) => {
    console.log(`\n[VastuLedger] ${signal} received — shutting down`);
    stopCronJobs();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((err) => {
  console.error("[VastuLedger] Fatal startup error:", err);
  process.exit(1);
});
