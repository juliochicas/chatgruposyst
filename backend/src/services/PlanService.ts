// Archivo: backend/src/services/PlanService.ts
// Servicio para gestionar planes y límites

import Plan from "../models/Plan";
import Company from "../models/Company";
import AppError from "../errors/AppError";
import Stripe from "stripe";
import { getIO } from "../libs/socket";

const io = getIO();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

class PlanService {
  // Verificar si una empresa puede usar una característica
  static async canUseFeature(companyId: number, feature: string): Promise<boolean> {
    const company = await Company.findByPk(companyId, {
      include: [Plan]
    });

    if (!company || !company.plan) {
      throw new AppError("Empresa o plan no encontrado", 404);
    }

    // Verificar si el plan incluye la característica
    return company.plan.features[feature] === true;
  }

  // Verificar límites
  static async checkLimit(companyId: number, limitType: string): Promise<{
    allowed: boolean;
    current: number;
    limit: number;
    percentage: number;
  }> {
    const company = await Company.findByPk(companyId, {
      include: [Plan]
    });

    if (!company || !company.plan) {
      throw new AppError("Empresa o plan no encontrado", 404);
    }

    const currentUsage = company.usage[`current${limitType.charAt(0).toUpperCase() + limitType.slice(1)}`];
    const planLimit = company.customLimits?.[limitType] || company.plan.limits[limitType];

    return {
      allowed: currentUsage < planLimit,
      current: currentUsage,
      limit: planLimit,
      percentage: (currentUsage / planLimit) * 100
    };
  }

  // Incrementar uso
  static async incrementUsage(companyId: number, usageType: string, amount: number = 1): Promise<void> {
    const company = await Company.findByPk(companyId);
    
    if (!company) {
      throw new AppError("Empresa no encontrada", 404);
    }

    const currentUsage = company.usage;
    currentUsage[usageType] = (currentUsage[usageType] || 0) + amount;

    await company.update({ usage: currentUsage });

    // Verificar si se excedió el límite
    const limit = await this.checkLimit(companyId, usageType.replace('current', '').toLowerCase());
    
    if (!limit.allowed) {
      // Notificar al administrador
      await this.notifyLimitExceeded(company, usageType, limit);
    }
  }

  // Cambiar plan
  static async upgradePlan(companyI
  # ===============================
# 9. PLAN SERVICE (continuación)
# ===============================
cat >> backend/src/services/PlanService.ts << 'EOF'
d: number, newPlanId: number): Promise<void> {
    const company = await Company.findByPk(companyId);
    const newPlan = await Plan.findByPk(newPlanId);

    if (!company || !newPlan) {
      throw new AppError("Empresa o plan no encontrado", 404);
    }

    // Actualizar en Stripe
    if (company.stripeSubscriptionId) {
      await stripe.subscriptions.update(company.stripeSubscriptionId, {
        items: [{
          id: company.stripeSubscriptionId,
          price: newPlan.stripeProductId
        }]
      });
    }

    // Actualizar en la base de datos
    await company.update({ planId: newPlanId });

    // Registrar el cambio
    await this.logPlanChange(company, newPlan);
  }

  // Configuración inicial para nueva empresa
  static async setupNewCompany(companyData: any, planId: number): Promise<Company> {
    const plan = await Plan.findByPk(planId);
    
    if (!plan) {
      throw new AppError("Plan no encontrado", 404);
    }

    // Crear cliente en Stripe
    const stripeCustomer = await stripe.customers.create({
      email: companyData.email,
      name: companyData.name,
      metadata: {
        companyId: companyData.id
      }
    });

    // Crear suscripción con trial
    const subscription = await stripe.subscriptions.create({
      customer: stripeCustomer.id,
      items: [{ price: plan.stripeProductId }],
      trial_period_days: 14,
      metadata: {
        companyId: companyData.id
      }
    });

    // Crear empresa con configuración inicial
    const company = await Company.create({
      ...companyData,
      planId: planId,
      stripeCustomerId: stripeCustomer.id,
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: "trialing",
      trialEndsAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      usage: {
        currentUsers: 0,
        currentChannels: 0,
        currentContacts: 0,
        messagesThisMonth: 0,
        aiCreditsUsed: 0,
        storageUsed: 0,
        automationsCreated: 0
      },
      settings: {
        companyLogo: "",
        primaryColor: "#1976d2",
        secondaryColor: "#dc004e",
        customDomain: "",
        channelDefaults: {
          greetingMessage: "¡Hola! ¿En qué puedo ayudarte?",
          farewellMessage: "¡Gracias por contactarnos!",
          businessHours: {
            monday: { open: "09:00", close: "18:00" },
            tuesday: { open: "09:00", close: "18:00" },
            wednesday: { open: "09:00", close: "18:00" },
            thursday: { open: "09:00", close: "18:00" },
            friday: { open: "09:00", close: "18:00" },
            saturday: { open: "09:00", close: "13:00" },
            sunday: { open: "closed", close: "closed" }
          },
          autoReply: true
        },
        aiSettings: {
          model: "gpt-3.5",
          temperature: 0.7,
          customPrompt: "",
          autoSuggest: true
        },
        notifications: {
          email: true,
          webhook: "",
          slackWebhook: ""
        }
      }
    });

    // Crear recursos iniciales
    await this.createInitialResources(company);

    return company;
  }

  // Middleware para verificar límites antes de cualquier acción
  static async checkBeforeAction(req: any, res: any, next: any): Promise<void> {
    const { companyId } = req.user;
    const action = req.route.path;

    // Mapear acciones a límites
    const limitMap: { [key: string]: string } = {
      "/users": "users",
      "/channels": "channels",
      "/contacts": "contacts",
      "/messages": "messagesPerMonth"
    };

    const limitType = limitMap[action];
    
    if (limitType) {
      const limit = await this.checkLimit(companyId, limitType);
      
      if (!limit.allowed) {
        throw new AppError(
          `Has alcanzado el límite de ${limitType} (${limit.current}/${limit.limit}). 
          Por favor, actualiza tu plan para continuar.`,
          403
        );
      }
    }

    next();
  }

  private static async notifyLimitExceeded(company: Company, usageType: string, limit: any): Promise<void> {
    // Enviar email
    // Enviar notificación in-app
    // Webhook si está configurado
    console.log(`Límite excedido: ${company.name} - ${usageType} - ${limit.percentage}%`);
  }

  private static async logPlanChange(company: Company, newPlan: Plan): Promise<void> {
    // Registrar cambio de plan en logs
    console.log(`Plan cambiado: ${company.name} -> ${newPlan.name}`);
  }

  private static async createInitialResources(company: Company): Promise<void> {
    // Crear usuario admin
    // Crear cola por defecto
    // Crear mensajes de bienvenida
    console.log(`Recursos iniciales creados para: ${company.name}`);
  }
}

// Configuración de planes predefinidos
export const DEFAULT_PLANS = [
  {
    name: "Starter",
    monthlyPrice: 29,
    yearlyPrice: 290,
    limits: {
      users: 3,
      channels: 2,
      contacts: 1000,
      messagesPerMonth: 3000,
      aiCredits: 100,
      storage: 5,
      automations: 10,
      integrations: ["whatsapp", "facebook"]
    },
    features: {
      whatsapp: true,
      facebook: true,
      instagram: false,
      tiktok: false,
      aiAssistant: true,
      aiAutomation: false,
      shopifyIntegration: false,
      stripeIntegration: true,
      advancedAnalytics: false,
      customReports: false,
      apiAccess: false,
      whitelabel: false,
      supportLevel: "email",
      sla: 48
    }
  },
  {
    name: "Professional",
    monthlyPrice: 99,
    yearlyPrice: 990,
    limits: {
      users: 10,
      channels: 5,
      contacts: 10000,
      messagesPerMonth: 20000,
      aiCredits: 1000,
      storage: 25,
      automations: 50,
      integrations: ["whatsapp", "facebook", "instagram", "shopify", "ai"]
    },
    features: {
      whatsapp: true,
      facebook: true,
      instagram: true,
      tiktok: true,
      aiAssistant: true,
      aiAutomation: true,
      shopifyIntegration: true,
      stripeIntegration: true,
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      whitelabel: false,
      supportLevel: "priority",
      sla: 12
    }
  },
  {
    name: "Enterprise",
    monthlyPrice: 299,
    yearlyPrice: 2990,
    limits: {
      users: -1, // Ilimitado
      channels: -1,
      contacts: -1,
      messagesPerMonth: -1,
      aiCredits: -1,
      storage: 100,
      automations: -1,
      integrations: ["all"]
    },
    features: {
      whatsapp: true,
      facebook: true,
      instagram: true,
      tiktok: true,
      aiAssistant: true,
      aiAutomation: true,
      shopifyIntegration: true,
      stripeIntegration: true,
      advancedAnalytics: true,
      customReports: true,
      apiAccess: true,
      whitelabel: true,
      supportLevel: "dedicated",
      sla: 2
    }
  }
];

export default PlanService;
