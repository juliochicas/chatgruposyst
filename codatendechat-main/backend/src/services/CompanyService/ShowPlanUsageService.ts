import Company from "../../models/Company";
import Plan from "../../models/Plan";
import User from "../../models/User";
import Whatsapp from "../../models/Whatsapp";
import Queue from "../../models/Queue";
import AppError from "../../errors/AppError";

interface PlanUsage {
  plan: {
    id: number;
    name: string;
  };
  limits: {
    users: { used: number; max: number; available: number };
    connections: { used: number; max: number; available: number };
    queues: { used: number; max: number; available: number };
  };
  features: {
    useSchedules: boolean;
    useCampaigns: boolean;
    useInternalChat: boolean;
    useExternalApi: boolean;
    useKanban: boolean;
    useOpenAi: boolean;
    useIntegrations: boolean;
  };
}

const ShowPlanUsageService = async (companyId: number): Promise<PlanUsage> => {
  const company = await Company.findByPk(companyId, {
    include: [{ model: Plan, as: "plan" }]
  });

  if (!company || !company.plan) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  const [usersCount, connectionsCount, queuesCount] = await Promise.all([
    User.count({ where: { companyId } }),
    Whatsapp.count({ where: { companyId } }),
    Queue.count({ where: { companyId } })
  ]);

  const plan = company.plan;

  return {
    plan: {
      id: plan.id,
      name: plan.name
    },
    limits: {
      users: {
        used: usersCount,
        max: plan.users,
        available: Math.max(0, plan.users - usersCount)
      },
      connections: {
        used: connectionsCount,
        max: plan.connections,
        available: Math.max(0, plan.connections - connectionsCount)
      },
      queues: {
        used: queuesCount,
        max: plan.queues,
        available: Math.max(0, plan.queues - queuesCount)
      }
    },
    features: {
      useSchedules: plan.useSchedules ?? false,
      useCampaigns: plan.useCampaigns ?? false,
      useInternalChat: plan.useInternalChat ?? false,
      useExternalApi: plan.useExternalApi ?? false,
      useKanban: plan.useKanban ?? false,
      useOpenAi: plan.useOpenAi ?? false,
      useIntegrations: plan.useIntegrations ?? false
    }
  };
};

export default ShowPlanUsageService;
