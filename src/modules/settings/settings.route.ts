import { Router } from "express";

import { requireAuth } from "../../middleware/auth.middleware.ts";
import {
  sendTestEmail,
  upsertEmail,
  viewEmailSettings,
  viewMainSettings,
} from "./controllers/email_setting.controller.ts";
import {
  createPath,
  deletePath,
  updatePath,
  viewPathSettings,
} from "./controllers/path_setting.controller.ts";

const router = Router();

router.use(requireAuth);

router.get("/", viewMainSettings);
router.get("/email", viewEmailSettings);
router.post("/email", upsertEmail);
router.post("/email/test", sendTestEmail);
router.get("/path", viewPathSettings);
router.post("/path", createPath);
router.post("/path/update", updatePath);
router.post("/path/delete/:id", deletePath);

export default router;
