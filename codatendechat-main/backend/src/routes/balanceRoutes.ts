import express from "express";
import isAuth from "../middleware/isAuth";
import isSuper from "../middleware/isSuper";
import * as BalanceController from "../controllers/BalanceController";

const balanceRoutes = express.Router();

// Company: view own balance
balanceRoutes.get("/balance", isAuth, BalanceController.getBalance);

// Super admin: manage any company's balance
balanceRoutes.get("/balance/company/:companyId", isAuth, isSuper, BalanceController.getCompanyBalance);
balanceRoutes.post("/balance/company/:companyId/credit", isAuth, isSuper, BalanceController.addCredit);
balanceRoutes.post("/balance/company/:companyId/debit", isAuth, isSuper, BalanceController.addDebit);
balanceRoutes.post("/balance/company/:companyId/refund", isAuth, isSuper, BalanceController.processRefund);
balanceRoutes.get("/balance/company/:companyId/stripe-charges", isAuth, isSuper, BalanceController.listStripeCharges);

export default balanceRoutes;
