import { Router, type IRouter } from "express";
import healthRouter from "./health";
import serverRouter from "./server";
import buildsRouter from "./builds";
import botRouter from "./botroute";

const router: IRouter = Router();

router.use(healthRouter);
router.use(serverRouter);
router.use(buildsRouter);
router.use(botRouter);

export default router;
