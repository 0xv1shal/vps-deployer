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

router.get("/", listProjects);
router.get("/create", viewCreateProject);
router.post("/create", createProject);

router.post("/:id/delete", deleteProject);

router.get("/:id", viewProjectDetails);
router.post("/:id/update", updateProject);

router.post("/:id/env", addEnv);
router.post("/:id/env/:envId/delete", deleteEnv);

router.post("/:id/commands", addCommand);
router.post("/:id/commands/:cmdId/delete", deleteCommand);

export default router;
