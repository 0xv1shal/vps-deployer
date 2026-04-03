import { Router } from "express";
import { githubWebhook } from "./controllers/webhook.controller.ts";

const router = Router()

router.post("/webhook/:projectId", githubWebhook);

export default router