import { Router } from "express";
import {
  viewSettings,
  upsertEmail,
  sendTestEmail,
} from "./controllers/setting.controller.ts";
import { requireAuth } from "../../middleware/auth.middleware.ts";

const router = Router();

router.use(requireAuth);

router.get("/settings", viewSettings);
router.post("/settings/email", upsertEmail);
router.post("/settings/email/test", sendTestEmail);

export default router;