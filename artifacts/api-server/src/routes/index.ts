import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serverRouter from "./server";
import buildsRouter from "./builds";
import botRouter from "./botroute";
import authRouter from "./auth";
import adminUsersRouter from "./adminusers";
import itemsRouter from "./items";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serverRouter);
router.use(buildsRouter);
router.use(botRouter);
router.use(authRouter);
router.use(adminUsersRouter);
router.use(itemsRouter);

export default router;
