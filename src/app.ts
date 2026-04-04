import express, {
  type NextFunction,
  type Request,
  type Response,
} from "express";
import helmet from "helmet";
import path from "path";
import session from "express-session";
import authRouter from "./modules/auth/auth.route.ts";
import dashboardRouter from "./modules/dashboard/dashboard.route.ts";
import projectRouter from "./modules/project/project.route.ts";
import settingsRouter from "./modules/settings/settings.route.ts";
import deployRouter from "./modules/deployer/deployer.route.ts";
import webhookRouter from "./modules/webhook/webhook.route.ts";
import { getBaseUrl, getSessKey, setBaseUrl } from "./helpers/arg.helper.ts";

const app = express();
const basePath = import.meta.dirname;

app.set("view engine", "pug");
app.set("views", path.join(basePath, "modules"));
app.use(express.static(path.join(basePath, "..", "public")));
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.set('trust proxy', true);
export default app;

export const initSessionAndRoutes = (app: any) => {
  app.use((req: Request, _res: Response, next: NextFunction) => {
    try {
      getBaseUrl();
    } catch (error) {
      setBaseUrl(`${req.protocol}://${req.get("host")}`);
    } finally {
      next();
    }
  });
  const sessionKey = getSessKey();

  app.use(
    session({
      secret: sessionKey,
      resave: false,
      saveUninitialized: false,
      cookie: { secure: "auto" },
    }),
  );

  app.use(dashboardRouter);

  app.use(authRouter);

  app.use("/projects", projectRouter);

  app.use("/settings", settingsRouter);

  app.use(deployRouter);

  app.use("/webhook", webhookRouter);

  app.use((_req: Request, res: Response) => {
    res.status(404).render("common/views/404");
  });
};
