import { Router } from "express";
import { createDeployment, getDeploymentDetails, getDeploymentDetailsView, getDeploymentView } from "./controllers/deployer.controller.ts";
import { requireAuth } from "../../middleware/auth.middleware.ts";

const router = Router();

router.use(requireAuth)
// API (used by frontend JS)
router.post("/deploy", createDeployment);
router.get("/deploy/:deployId", getDeploymentDetails);

// Views (page navigation only)
router.get("/deployments", getDeploymentView);
router.get("/deployment/:deployId", getDeploymentDetailsView);

export default router;