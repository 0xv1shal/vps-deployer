import { Router } from "express";
import {
  viewSettings,
  upsertEmail,
  sendTestEmail,
} from "./controllers/setting.controller.ts";
import { requireAuth } from "../../middleware/auth.middleware.ts";

const router = Router();

router.use(requireAuth);

router.get("/", viewSettings);
router.post("/email", upsertEmail);
router.post("/email/test", sendTestEmail);

export default router;