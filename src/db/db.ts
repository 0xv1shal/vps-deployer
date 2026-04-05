import Database from "better-sqlite3";
import path from "path";
import { type Database as dbType } from "better-sqlite3";
import { getWorkDirPath } from "../helpers/arg.helper.ts";

let DB: dbType | null = null;

const createTables = () => {
  if (!DB) throw new Error("DB not initialized");

  DB.exec(`
    CREATE TABLE IF NOT EXISTS user (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      password TEXT NOT NULL,
      email TEXT NOT NULL,
      last_logged_in TEXT DEFAULT (datetime('now')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS email (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT,
      password TEXT,
      smtp TEXT,
      smtp_port INTEGER,
      "from" TEXT
    );

    CREATE TABLE IF NOT EXISTS project (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      github_url TEXT NOT NULL,
      branch_name TEXT NOT NULL,
      receive_email_notf INTEGER DEFAULT 0 CHECK (receive_email_notf IN (0,1)),
      auto_deploy INTEGER DEFAULT 0 CHECK (auto_deploy IN (0,1)),
      webhook_secret TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS project_commands (
      id TEXT PRIMARY KEY,
      proj_id TEXT NOT NULL,
      seq_no INTEGER NOT NULL,
      cmd TEXT NOT NULL,
      FOREIGN KEY (proj_id) REFERENCES project(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS project_env (
  id TEXT PRIMARY KEY,
  proj_id TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  FOREIGN KEY (proj_id) REFERENCES project(id) ON DELETE CASCADE,
  UNIQUE (proj_id, key)
);

    CREATE TABLE IF NOT EXISTS deployment (
      id TEXT PRIMARY KEY,
      proj_id TEXT NOT NULL,
      started_at TEXT NOT NULL DEFAULT (datetime('now')),
      finished_at TEXT,
      status TEXT CHECK (status IN ('running','success','failed')) NOT NULL DEFAULT 'running',
      FOREIGN KEY (proj_id) REFERENCES project(id) ON DELETE CASCADE
    );

      CREATE TABLE IF NOT EXISTS deployment_logs (
  id TEXT PRIMARY KEY,
  deploy_id TEXT NOT NULL,
  cmd TEXT NOT NULL,
  log TEXT,
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  finished_at TEXT,
  status TEXT CHECK (status IN ('running','success','failed')) NOT NULL DEFAULT 'running',
  FOREIGN KEY (deploy_id) REFERENCES deployment(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS path_settings (
  id TEXT PRIMARY KEY,
  path TEXT NOT NULL,
  sequence INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

    CREATE INDEX IF NOT EXISTS idx_project_commands_proj_id 
      ON project_commands(proj_id);

    CREATE INDEX IF NOT EXISTS idx_deployment_proj_id 
      ON deployment(proj_id);

    CREATE INDEX IF NOT EXISTS idx_deployment_logs_deploy_id 
      ON deployment_logs(deploy_id);
  `);
};

export const initalizeDB = () => {
  const workingDir = getWorkDirPath();
  const dbPath = path.join(workingDir, "vps-deployer.db");
  DB = new Database(dbPath);
  DB.pragma("journal_mode = WAL");
  createTables();
};

export const getDB = (): dbType => {
  if (DB === null) throw new Error("DB not initalized");

  return DB;
};

export const closeDB = () => {
  DB?.close();
};
