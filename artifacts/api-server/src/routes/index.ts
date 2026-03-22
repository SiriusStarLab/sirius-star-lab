import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intelligenceRouter from "./intelligence";
import openaiRouter from "./openai";
import subscriptionRouter from "./subscription";
import stripeRouter from "./stripe";
import labRouter from "./lab";
import intelligenceFeedRouter from "./intelligence-feed";
import outreachRouter from "./outreach";
import learnRouter from "./learn";
import revenueRouter from "./revenue";
import agencyRouter from "./agency";
import publicRouter from "./public";

const router: IRouter = Router();

router.use(publicRouter);
router.use(healthRouter);
router.use(openaiRouter);
router.use(intelligenceRouter);
router.use(subscriptionRouter);
router.use(stripeRouter);
router.use(labRouter);
router.use(intelligenceFeedRouter);
router.use(outreachRouter);
router.use(learnRouter);
router.use(revenueRouter);
router.use(agencyRouter);

export default router;
