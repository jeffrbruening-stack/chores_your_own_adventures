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
// Spec-aligned routes (match the OpenAPI paths the generated client uses)
import questAssignmentsRouter from "./quest-assignments.js";
import characterRouter from "./character.js";
import openQuestsRouter from "./open-quests.js";
import quickQuestsRouter from "./quick-quests.js";
import partyRecapRouter from "./party-recap.js";

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
// Spec-aligned mounts — these match the OpenAPI spec paths the generated client calls
router.use("/quest-assignments", questAssignmentsRouter);
router.use("/character", characterRouter);
router.use("/open-quests", openQuestsRouter);
router.use("/quick-quests", quickQuestsRouter);
router.use("/party-recap", partyRecapRouter);

export default router;
