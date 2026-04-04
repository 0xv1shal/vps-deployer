import { Router } from "express";
import { createDeployment, getDeploymentDetails, getDeploymentDetailsView, getDeploymentView } from "./controllers/deployer.controller.ts";
import { requireAuth } from "../../middleware/auth.middleware.ts";

const router = Router();


// API (used by frontend JS)
router.post("/deploy",requireAuth, createDeployment);
router.get("/deploy/:deployId", requireAuth,getDeploymentDetails);

// Views (page navigation only)
router.get("/deployments", requireAuth,getDeploymentView);
router.get("/deployment/:deployId", requireAuth,getDeploymentDetailsView);

export default router;