import { Router } from "express";
import { getMeetingByKey } from "../services/supabase.js";
import { logger } from "../utils/logger.js";

const router = Router();

router.get("/api/meeting/:meetInstanceKey", async (req, res) => {
  try {
    const { meetInstanceKey } = req.params;
    const data = await getMeetingByKey(meetInstanceKey!);
    res.json(data);
  } catch (err) {
    logger.error("Debug endpoint error", { error: err instanceof Error ? err.message : String(err) });
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
