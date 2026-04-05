import type { Request, Response } from "express";
import { getDB } from "../../../db/db.ts";

export const viewPathSettings = (_req: Request, res: Response) => {
  const db = getDB();
  const paths = db
    .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
    .all();
  return res.render("settings/views/path_settings", {
    paths,
    active: "path_settings",
    error: null,
    success: null,
  });
};

export const createPath = (req: Request, res: Response) => {
  const { path } = req.body;
  if (!path || !path.trim()) {
    const db = getDB();
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: "Path is required",
      success: null,
    });
  }
  const db = getDB();
  try {
    const maxSeq = db
      .prepare(
        "SELECT COALESCE(MAX(sequence), -1) as max_seq FROM path_settings",
      )
      .get() as any;
    const nextSeq = maxSeq.max_seq + 1;
    db.prepare(
      "INSERT INTO path_settings (id, path, sequence) VALUES (?, ?, ?)",
    ).run(crypto.randomUUID(), path.trim(), nextSeq);
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: null,
      success: "Path added successfully",
    });
  } catch (error: any) {
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: error.message || "Failed to add path",
      success: null,
    });
  }
};
export const updatePath = (req: Request, res: Response) => {
  const { id, path } = req.body;
  if (!id || !path || !path.trim()) {
    const db = getDB();
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: "ID and path are required",
      success: null,
    });
  }
  const db = getDB();
  try {
    db.prepare("UPDATE path_settings SET path = ? WHERE id = ?").run(
      path.trim(),
      id,
    );
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: null,
      success: "Path updated successfully",
    });
  } catch (error: any) {
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: error.message || "Failed to update path",
      success: null,
    });
  }
};
export const deletePath = (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) {
    const db = getDB();
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: "Path ID is required",
      success: null,
    });
  }
  const db = getDB();
  try {
    const deleted = db
      .prepare("SELECT sequence FROM path_settings WHERE id = ?")
      .get(id) as any;
    if (!deleted) {
      const paths = db
        .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
        .all();
      return res.render("settings/views/path_settings", {
        paths,
        active: "path_settings",
        error: "Path not found",
        success: null,
      });
    }
    const deletedSeq = deleted.sequence;
    db.prepare("DELETE FROM path_settings WHERE id = ?").run(id);
    db.prepare(
      "UPDATE path_settings SET sequence = sequence - 1 WHERE sequence > ?",
    ).run(deletedSeq);
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: null,
      success: "Path deleted successfully",
    });
  } catch (error: any) {
    const paths = db
      .prepare("SELECT * FROM path_settings ORDER BY sequence ASC")
      .all();
    return res.render("settings/views/path_settings", {
      paths,
      active: "path_settings",
      error: error.message || "Failed to delete path",
      success: null,
    });
  }
};
