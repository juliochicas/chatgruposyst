import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";

import * as CompanyController from "../controllers/CompanyController";

const companyRoutes = express.Router();

companyRoutes.get("/companies/list", isAuth, isSuper, CompanyController.list);
companyRoutes.get("/companies", isAuth, isSuper, CompanyController.index);
companyRoutes.get("/companies/:id", isAuth, CompanyController.show);
companyRoutes.post("/companies", isAuth, isSuper, CompanyController.store);
companyRoutes.put("/companies/:id", isAuth, isSuper, CompanyController.update);
companyRoutes.put("/companies/:id/schedules",isAuth,CompanyController.updateSchedules);
companyRoutes.delete("/companies/:id", isAuth, isSuper, CompanyController.remove);
companyRoutes.post("/companies/cadastro", CompanyController.store);

// Rota para listar o plano da empresa
companyRoutes.get("/companies/listPlan/:id", isAuth, CompanyController.listPlan);
companyRoutes.get("/companiesPlan", isAuth, CompanyController.indexPlan);

// Plan usage (real-time limits & features)
companyRoutes.get("/companies/:id/plan-usage", isAuth, CompanyController.planUsage);

// Admin backup and delete
companyRoutes.post("/companies/:id/backup", isAuth, isSuper, CompanyController.backup);
companyRoutes.get("/companies/:id/backup/download", isAuth, isSuper, CompanyController.downloadBackup);
companyRoutes.delete("/companies/:id/full", isAuth, isSuper, CompanyController.removeWithBackup);

export default companyRoutes;
