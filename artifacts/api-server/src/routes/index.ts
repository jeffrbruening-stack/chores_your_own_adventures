import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "./auth.js";
import homeRouter from "./home.js";
import partiesRouter from "./parties.js";
import questsRouter from "./quests.js";
import shopRouter from "./shop.js";
import partyGoalsRouter from "./party-goals.js";
import projectsRouter from "./projects.js";
import charactersRouter from "./characters.js";
import aiRouter from "./ai.js";
import schoolCalendarsRouter from "./school-calendars.js";
import adminRouter from "./admin.js";
import catFoleyRouter from "./cat-foley.js";
import inventoryRouter from "./inventory.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/home", homeRouter);
router.use("/parties", partiesRouter);
router.use("/quests", questsRouter);
router.use("/shop", shopRouter);
router.use("/party-goals", partyGoalsRouter);
router.use("/projects", projectsRouter);
router.use("/characters", charactersRouter);
router.use("/ai", aiRouter);
router.use("/school-calendars", schoolCalendarsRouter);
router.use("/admin", adminRouter);
router.use("/cat-foley", catFoleyRouter);
router.use("/inventory", inventoryRouter);

export default router;
