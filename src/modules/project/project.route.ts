import { Router } from "express";
import {
  addCommand,
  addEnv,
  createProject,
  deleteCommand,
  deleteEnv,
  deleteProject,
  listProjects,
  updateProject,
  viewCreateProject,
  viewProjectDetails,
} from "./controllers/projects.controller.ts";
import { requireAuth } from "../../middleware/auth.middleware.ts";

const router = Router();
router.use(requireAuth)
router.get("/projects", listProjects);
router.get("/projects/create", viewCreateProject);
router.post("/projects/create", createProject);

router.post("/projects/:id/delete", deleteProject);

router.get("/projects/:id", viewProjectDetails);
router.post("/projects/:id/update", updateProject);

router.post("/projects/:id/env", addEnv);
router.post("/projects/:id/env/:envId/delete", deleteEnv);

router.post("/projects/:id/commands", addCommand);
router.post("/projects/:id/commands/:cmdId/delete", deleteCommand);

export default router;
