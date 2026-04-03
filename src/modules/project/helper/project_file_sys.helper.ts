import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { getWorkDirPath } from "../../../helpers/arg.helper.ts";
import { writeToLogFile } from "../../../helpers/logging.helper.ts";

export const createProjDir = async (projectId: string) => {
  const workDir = getWorkDirPath();
  const projPath = path.join(workDir, projectId);

  await fs.mkdir(projPath, { recursive: true });
  
};

export const createEnvFile = async (projectId: string) => {
  const workDir = getWorkDirPath();
  const filePath = path.join(workDir, projectId, ".env");

  await fs.writeFile(filePath, "");
};


export const cloneRepo = (repoUrl: string, projId: string,branch:string) => {
  const cwd = path.join(getWorkDirPath(),projId)
  return new Promise<void>((resolve, reject) => {
    let stderr = "";
    let stdout = "";

    const child = spawn("git", ["clone", "-b", branch, repoUrl, "."], { cwd });

    child.stdout.on("data", (data) => {
      const msg = data.toString();
      stdout += msg;
      writeToLogFile(msg, { source: "GIT" });
    });

    child.stderr.on("data", (data) => {
      const msg = data.toString();
      stderr += msg;
      writeToLogFile(msg, { level: "ERROR", source: "GIT" });
    });

    child.on("error", (err) => {
      // process spawn failed (git not found, etc.)
      reject(new Error(`Failed to start git process: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) {
        return resolve();
      }

      // extract meaningful error
      const errorMsg =
        stderr.trim() ||
        stdout.trim() ||
        `git clone failed with exit code ${code}`;

      reject(new Error(errorMsg));
    });
  });
};

export const deleteProjDir = async (projectId: string) => {
  const workDir = getWorkDirPath();
  const projPath = path.join(workDir, projectId);

  await fs.rm(projPath, {recursive:true,force:true});
};

export const upsertEnvFile = async (
  projId: string,
  key: string,
  value: string
) => {
  const workDir = getWorkDirPath();
  const filePath = path.join(workDir, projId, ".env");

  let content = "";

  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    // file may not exist → fine
  }

  const lines = content.split("\n").filter(Boolean);

  let found = false;

  const updated = lines.map((line) => {
    if (line.startsWith(`${key}=`)) {
      found = true;
      return `${key}=${value}`;
    }
    return line;
  });

  if (!found) {
    updated.push(`${key}=${value}`);
  }

  await fs.writeFile(filePath, updated.join("\n") + "\n");
};

export const removeEnvKeyFromFile = async (
  projId: string,
  key: string
) => {
  const workDir = getWorkDirPath();
  const filePath = path.join(workDir, projId, ".env");

  let content = "";

  try {
    content = await fs.readFile(filePath, "utf-8");
  } catch {
    return; // file may not exist → fine
  }

  const updated = content
    .split("\n")
    .filter((line) => line && !line.startsWith(`${key}=`))
    .join("\n");

  await fs.writeFile(filePath, updated + (updated ? "\n" : ""));
};