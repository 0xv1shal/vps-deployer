import type { Request, Response } from "express";
import crypto from "crypto";
import { getDB } from "../../../db/db.ts";
import {
  cloneRepo,
  createEnvFile,
  createProjDir,
  deleteProjDir,
  removeEnvKeyFromFile,
  upsertEnvFile,
} from "../helper/project_file_sys.helper.ts";
import { writeToLogFile } from "../../../helpers/logging.helper.ts";
import { normalizeRepoUrl } from "../../../helpers/common.helper.ts";

// LIST PROJECTS
export const listProjects = (_req: Request, res: Response) => {
  const db = getDB();

  const projects = db.prepare("SELECT * FROM project").all();

  return res.render("project/views/index", { active: "project", projects });
};

// VIEW CREATE PAGE
export const viewCreateProject = (_req: Request, res: Response) => {
  return res.render("project/views/create", { active: "project" });
};

// CREATE PROJECT
export const createProject = async (req: Request, res: Response) => {
  const { name, github_url, branch_name, receive_email_notf, auto_deploy } =
    req.body;

  const receiveEmail = receive_email_notf ? 1 : 0;
  const autoDeploy = auto_deploy ? 1 : 0;

  if (!name || !github_url || !branch_name) {
    return res.render("project/views/create", {
      error: "All fields are required",
      active: "project",
    });
  }

  const db = getDB();

  try {
    // Validate email config
    if (receiveEmail === 1) {
      const emailConfig: any = db.prepare("SELECT * FROM email LIMIT 1").get();

      if (!emailConfig) {
        return res.render("project/views/create", {
          error: "Email settings not configured",
          active: "project",
        });
      }
    }

    const secret = crypto.randomBytes(32).toString("hex");
    const projectId = crypto.randomUUID();

    // 1. Insert into DB
    db.prepare(
      `
      INSERT INTO project (
        id, name, github_url, branch_name, receive_email_notf, auto_deploy, webhook_secret
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    ).run(
      projectId,
      name.trim(),
      github_url.trim(),
      branch_name.trim(),
      receiveEmail,
      autoDeploy,
      secret,
    );

    // 2. Create FS resources
    try {
      await createProjDir(projectId);
      const repoUrl = normalizeRepoUrl(github_url.trim());
      await cloneRepo(repoUrl, projectId,branch_name.trim());
      await createEnvFile(projectId)
    } catch (err:any) {
      // rollback DB
      db.prepare("DELETE FROM project WHERE id = ?").run(projectId);
      deleteProjDir(projectId).catch(() => {});
      return res.render("project/views/create", {
        error: err.message || "Failed to setup project",
        active: "project",
      });
    }

    return res.redirect("/projects");
  } catch (error: any) {
    return res.render("project/views/create", {
      error: error.message || "Something went wrong",
      active: "project",
    });
  }
};

// DELETE PROJECT
export const deleteProject = async (req: Request, res: Response) => {
  const { id } = req.params;

  const db = getDB();
  try {
    db.prepare("DELETE FROM project WHERE id = ?").run(id);

    if (typeof id !== "string") {
      return res.render("project/views/index", {
        error: "Id must be string",
        active: "project",
      });
    }
    // best effort cleanup
    deleteProjDir(id).catch((err) => {
      writeToLogFile("FS cleanup failed", {
        level: "ERROR",
        source: "FS",
        meta: { projectId: id, error: err.message },
      });
    });

    return res.redirect("/projects");
  } catch (error: any) {
    writeToLogFile("Project deletion failed", {
      level: "ERROR",
      source: "DB",
      meta: { projectId: id, error: error.message },
    });
    return res.render("project/views/index", {
      error: error.message || "Failed to delete project",
      active: "project",
    });
  }
};

// VIEW DETAILS
export const viewProjectDetails = (req: Request, res: Response) => {
  const { id } = req.params;
  const db = getDB();

  const project = db.prepare("SELECT * FROM project WHERE id = ?").get(id);

  if(!project){
    return res.status(404).render("common/views/404");
  }

  const commands = db
    .prepare(
      "SELECT * FROM project_commands WHERE proj_id = ? ORDER BY seq_no ASC",
    )
    .all(id);

  const envs = db
    .prepare("SELECT * FROM project_env WHERE proj_id = ?")
    .all(id);

  return res.render("project/views/details", {
    project,
    commands,
    envs,
    active: "project",
  });
};

export const addEnv = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { key, value } = req.body;

  if (!key || !value) {
    return res.redirect(`/projects/${id}`);
  }

  const db = getDB();
  const cleanKey = key.trim();
  const cleanValue = value.trim();

  try {
    // Try insert first
    db.prepare(`
      INSERT INTO project_env (id, proj_id, key, value)
      VALUES (?, ?, ?, ?)
    `).run(crypto.randomUUID(), id, cleanKey, cleanValue);

  } catch (err: any) {
    // If duplicate → update instead
    if (err.code === "SQLITE_CONSTRAINT_UNIQUE") {
      db.prepare(`
        UPDATE project_env
        SET value = ?
        WHERE proj_id = ? AND key = ?
      `).run(cleanValue, id, cleanKey);
    } else {
      writeToLogFile("Env DB operation failed", {
        level: "ERROR",
        source: "DB",
        meta: { projectId: id, key: cleanKey, error: err.message },
      });

      return res.redirect(`/projects/${id}`);
    }
  }

  // Sync with .env file (important)
  try {
    await upsertEnvFile(id!.toString(), cleanKey, cleanValue);
  } catch (err: any) {
    writeToLogFile("Env file sync failed", {
      level: "ERROR",
      source: "FS",
      meta: { projectId: id, key: cleanKey, error: err.message },
    });
  }

  return res.redirect(`/projects/${id}`);
};

export const deleteEnv = async (req: Request, res: Response) => {
  const { id, envId } = req.params;
  const db = getDB();

  let key: string | null = null;

  try {
    // 1. get key before deleting (important)
    const row: any = db
      .prepare("SELECT key FROM project_env WHERE id = ?")
      .get(envId);

    if (!row) {
      return res.redirect(`/projects/${id}`);
    }

    key = row.key;

    // 2. delete from DB
    db.prepare("DELETE FROM project_env WHERE id = ?").run(envId);

  } catch (err: any) {
    writeToLogFile("Env delete DB failed", {
      level: "ERROR",
      source: "DB",
      meta: { projectId: id, envId, error: err.message },
    });

    return res.redirect(`/projects/${id}`);
  }

  // 3. sync .env file
  try {
    await removeEnvKeyFromFile(id!.toString(), key??'key');
  } catch (err: any) {
    writeToLogFile("Env file delete sync failed", {
      level: "ERROR",
      source: "FS",
      meta: { projectId: id, key, error: err.message },
    });
  }

  return res.redirect(`/projects/${id}`);
};

// ADD COMMAND
export const addCommand = (req: Request, res: Response) => {
  const { id } = req.params;
  const { cmd } = req.body;

  if (!cmd) {
    return res.redirect(`/projects/${id}`);
  }

  const db = getDB();

  const seq: any = db
    .prepare("SELECT COUNT(*) as count FROM project_commands WHERE proj_id = ?")
    .get(id);

  db.prepare(
    `
    INSERT INTO project_commands (id, proj_id, seq_no, cmd)
    VALUES (?, ?, ?, ?)
  `,
  ).run(crypto.randomUUID(), id, seq.count + 1, cmd);

  return res.redirect(`/projects/${id}`);
};

// DELETE COMMAND
export const deleteCommand = (req: Request, res: Response) => {
  const { id, cmdId } = req.params;

  const db = getDB();
  db.prepare("DELETE FROM project_commands WHERE id = ?").run(cmdId);

  return res.redirect(`/projects/${id}`);
};

// UPDATE PROJECT
export const updateProject = (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, github_url, branch_name, receive_email_notf, auto_deploy } =
    req.body;

  const receiveEmail = receive_email_notf ? 1 : 0;
  const autoDeploy = auto_deploy ? 1 : 0;

  const db = getDB();

  try {
    // Validate email config if enabled
    if (receiveEmail === 1) {
      const emailConfig: any = db.prepare("SELECT * FROM email LIMIT 1").get();

      if (!emailConfig) {
        return res.redirect(`/projects/${id}`);
      }
    }

    db.prepare(
      `
      UPDATE project 
      SET 
        name = ?, 
        github_url = ?, 
        branch_name = ?, 
        receive_email_notf = ?, 
        auto_deploy = ?
      WHERE id = ?
    `,
    ).run(
      name.trim(),
      github_url.trim(),
      branch_name.trim(),
      receiveEmail,
      autoDeploy,
      id,
    );

    return res.redirect(`/projects/${id}`);
  } catch (error) {
    return res.redirect(`/projects/${id}`);
  }
};
