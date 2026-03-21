import { Router, type IRouter } from "express";
import healthRouter from "./health";
import intelligenceRouter from "./intelligence";
import openaiRouter from "./openai";
import subscriptionRouter from "./subscription";
import stripeRouter from "./stripe";
import labRouter from "./lab";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(intelligenceRouter);
router.use(subscriptionRouter);
router.use(stripeRouter);
router.use(labRouter);

export default router;
