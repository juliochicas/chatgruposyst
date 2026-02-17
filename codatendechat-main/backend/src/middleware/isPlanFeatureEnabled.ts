import { Request, Response, NextFunction } from "express";
import Company from "../models/Company";
import Plan from "../models/Plan";
import AppError from "../errors/AppError";

/**
 * Middleware factory that checks if a specific plan feature is enabled
 * for the company making the request.
 *
 * Usage:
 *   router.post("/schedules", isAuth, isPlanFeatureEnabled("useSchedules"), controller.store);
 */
const isPlanFeatureEnabled = (featureFlag: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user || !req.user.companyId) {
      return next();
    }

    try {
      const company = await Company.findByPk(req.user.companyId, {
        include: [{ model: Plan, as: "plan" }]
      });

      if (!company || !company.plan) {
        return next();
      }

      const plan = company.plan as any;

      if (plan[featureFlag] === false) {
        const featureNames: Record<string, string> = {
          useSchedules: "Agendamientos",
          useCampaigns: "Campañas",
          useInternalChat: "Chat Interno",
          useExternalApi: "API Externa",
          useKanban: "Kanban",
          useOpenAi: "Inteligencia Artificial",
          useIntegrations: "Integraciones"
        };

        const name = featureNames[featureFlag] || featureFlag;
        throw new AppError(
          `La función "${name}" no está disponible en tu plan actual. Actualiza tu plan para acceder a esta función.`,
          403
        );
      }
    } catch (err) {
      if (err instanceof AppError) {
        throw err;
      }
      // If DB error, let through
    }

    return next();
  };
};

export default isPlanFeatureEnabled;
