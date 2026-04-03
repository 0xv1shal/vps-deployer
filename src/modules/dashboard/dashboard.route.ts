import { Router, type Request, type Response } from "express";
import { getDB } from "../../db/db.ts";

const router = Router();

router.get("/", (req: Request, res: Response) => {
  if (!req.session || !req.session.user) {
    return res.redirect("/login");
  }

  const db = getDB();

  const stats = {
  projects: (db.prepare(`SELECT COUNT(*) as count FROM project`).get() as { count: number }).count,

  deployments: (db.prepare(`SELECT COUNT(*) as count FROM deployment`).get() as { count: number }).count,

  running: (db.prepare(`SELECT COUNT(*) as count FROM deployment WHERE status='running'`).get() as { count: number }).count,

  failed: (db.prepare(`SELECT COUNT(*) as count FROM deployment WHERE status='failed'`).get() as { count: number }).count,
};

  const recentDeployments = db.prepare(`
    SELECT d.id, d.status, d.started_at, p.name
    FROM deployment d
    JOIN project p ON d.proj_id = p.id
    ORDER BY d.started_at DESC
    LIMIT 5
  `).all();

  return res.render("dashboard/views/dash", {
    active: "home",
    stats,
    recentDeployments,
  });
});

export default router;
