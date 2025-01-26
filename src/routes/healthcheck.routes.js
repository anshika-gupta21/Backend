import { Router } from "express";
import { verifyJWT } from "../middlewares/auth.middlewares.js";
import { healthCheck } from "../controllers/healthcheck.controller.js";

const router = Router();

router.route("/").get(verifyJWT, healthCheck);

export default router;
