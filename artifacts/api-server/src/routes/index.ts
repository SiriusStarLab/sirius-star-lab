import { Router, type IRouter } from "express";
import healthRouter from "./health";
import openaiRouter from "./openai";
import subscriptionRouter from "./subscription";
import stripeRouter from "./stripe";

const router: IRouter = Router();

router.use(healthRouter);
router.use(openaiRouter);
router.use(subscriptionRouter);
router.use(stripeRouter);

export default router;
