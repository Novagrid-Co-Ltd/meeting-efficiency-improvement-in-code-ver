import express from "express";
import { getConfig } from "./config.js";
import { logger } from "./utils/logger.js";
import healthRouter from "./routes/health.js";
import debugRouter from "./routes/debug.js";
import processMeetingRouter from "./routes/processMeeting.js";

const app = express();
app.use(express.json());

// Routes
app.use(healthRouter);
app.use(debugRouter);
app.use(processMeetingRouter);

// Global error handler
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error("Unhandled error", { error: err.message, stack: err.stack });
  res.status(500).json({ ok: false, error: { code: "INTERNAL_ERROR", message: "Internal server error", step: "unknown" } });
});

const config = getConfig();
const server = app.listen(config.port, () => {
  logger.info(`Server started on port ${config.port}`);
});

// Graceful shutdown
function shutdown(signal: string) {
  logger.info(`Received ${signal}, shutting down gracefully`);
  server.close(() => {
    logger.info("Server closed");
    process.exit(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
