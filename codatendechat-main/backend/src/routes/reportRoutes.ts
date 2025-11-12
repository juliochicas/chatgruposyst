import { Router } from "express";

import isAuth from "../middleware/isAuth";
import { exportMetrics } from "../controllers/ReportController";

const reportRoutes = Router();

reportRoutes.get("/reports/export", isAuth, exportMetrics);

export default reportRoutes;

