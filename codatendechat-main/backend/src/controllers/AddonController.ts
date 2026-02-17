import { Request, Response } from "express";
import Stripe from "stripe";
import AppError from "../errors/AppError";
import Addon from "../models/Addon";
import CompanyAddon from "../models/CompanyAddon";
import Company from "../models/Company";
import { logger } from "../utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any
});

// ---------------------------------------------------------------------------
// Admin CRUD for Addons catalog
// ---------------------------------------------------------------------------

/**
 * GET /addons
 * List all available addons (public for clients, full list for admin).
 */
export const index = async (req: Request, res: Response): Promise<Response> => {
  const addons = await Addon.findAll({
    where: { isActive: true },
    order: [["name", "ASC"]]
  });
  return res.json(addons);
};

/**
 * GET /addons/all  (super admin only)
 * List all addons including inactive.
 */
export const indexAll = async (_req: Request, res: Response): Promise<Response> => {
  const addons = await Addon.findAll({ order: [["id", "ASC"]] });
  return res.json(addons);
};

/**
 * POST /addons  (super admin only)
 * Create a new addon in the catalog.
 */
export const store = async (req: Request, res: Response): Promise<Response> => {
  const { name, description, monthlyPrice, oneTimePrice, billingType, featureKey, isActive } = req.body;

  if (!name || !featureKey) {
    throw new AppError("Nombre y featureKey son requeridos.", 400);
  }

  const addon = await Addon.create({
    name,
    description,
    monthlyPrice: monthlyPrice || 0,
    oneTimePrice: oneTimePrice || null,
    billingType: billingType || "monthly",
    featureKey,
    isActive: isActive !== false
  });

  return res.status(201).json(addon);
};

/**
 * PUT /addons/:id  (super admin only)
 * Update an addon.
 */
export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const addon = await Addon.findByPk(id);

  if (!addon) {
    throw new AppError("Add-on no encontrado.", 404);
  }

  const { name, description, monthlyPrice, oneTimePrice, billingType, featureKey, isActive } = req.body;

  await addon.update({
    name: name ?? addon.name,
    description: description ?? addon.description,
    monthlyPrice: monthlyPrice ?? addon.monthlyPrice,
    oneTimePrice: oneTimePrice !== undefined ? oneTimePrice : addon.oneTimePrice,
    billingType: billingType ?? addon.billingType,
    featureKey: featureKey ?? addon.featureKey,
    isActive: isActive !== undefined ? isActive : addon.isActive
  });

  return res.json(addon);
};

/**
 * DELETE /addons/:id  (super admin only)
 */
export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const addon = await Addon.findByPk(id);

  if (!addon) {
    throw new AppError("Add-on no encontrado.", 404);
  }

  await addon.destroy();
  return res.json({ message: "Add-on eliminado exitosamente." });
};

// ---------------------------------------------------------------------------
// Company Addon management
// ---------------------------------------------------------------------------

/**
 * GET /company-addons
 * List addons for the authenticated company.
 */
export const listCompanyAddons = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const companyAddons = await CompanyAddon.findAll({
    where: { companyId, status: "active" },
    include: [{ model: Addon, as: "addon" }]
  });

  return res.json(companyAddons);
};

/**
 * POST /company-addons/subscribe
 * Subscribe the company to an addon. Creates Stripe checkout for monthly addons.
 * Body: { addonId }
 */
export const subscribeAddon = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { addonId } = req.body;

  if (!addonId) {
    throw new AppError("addonId es requerido.", 400);
  }

  const addon = await Addon.findByPk(addonId);
  if (!addon || !addon.isActive) {
    throw new AppError("Add-on no encontrado o no disponible.", 404);
  }

  // Check if already subscribed
  const existing = await CompanyAddon.findOne({
    where: { companyId, addonId, status: "active" }
  });
  if (existing) {
    throw new AppError("Ya tienes este add-on activo.", 400);
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Empresa no encontrada.", 404);
  }

  if (addon.billingType === "one_time") {
    // One-time payment via Stripe Checkout
    const price = Number(addon.oneTimePrice || addon.monthlyPrice);

    if (!company.stripeCustomerId) {
      throw new AppError("Debes tener una suscripción activa primero.", 400);
    }

    const session = await stripe.checkout.sessions.create({
      customer: company.stripeCustomerId,
      payment_method_types: ["card"],
      line_items: [{
        price_data: {
          currency: "usd",
          product_data: {
            name: `ChateaYA Add-on: ${addon.name}`,
            description: addon.description || undefined
          },
          unit_amount: Math.round(price * 100)
        },
        quantity: 1
      }],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/#/addons?success=true&addonId=${addon.id}`,
      cancel_url: `${process.env.FRONTEND_URL}/#/addons`,
      metadata: {
        companyId: String(companyId),
        addonId: String(addon.id),
        type: "addon_one_time"
      }
    });

    return res.json({ id: session.id, url: session.url });
  }

  // Monthly addon - use Stripe Checkout in subscription mode
  if (!company.stripeCustomerId) {
    throw new AppError("Debes tener una suscripción activa primero.", 400);
  }

  const session = await stripe.checkout.sessions.create({
    customer: company.stripeCustomerId,
    payment_method_types: ["card"],
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: {
          name: `ChateaYA Add-on: ${addon.name}`,
          description: addon.description || undefined
        },
        unit_amount: Math.round(Number(addon.monthlyPrice) * 100),
        recurring: { interval: "month" }
      },
      quantity: 1
    }],
    mode: "subscription",
    success_url: `${process.env.FRONTEND_URL}/#/addons?success=true&addonId=${addon.id}`,
    cancel_url: `${process.env.FRONTEND_URL}/#/addons`,
    metadata: {
      companyId: String(companyId),
      addonId: String(addon.id),
      type: "addon_monthly"
    },
    subscription_data: {
      metadata: {
        companyId: String(companyId),
        addonId: String(addon.id),
        type: "addon_monthly"
      }
    }
  });

  return res.json({ id: session.id, url: session.url });
};

/**
 * POST /company-addons/activate
 * Called after successful Stripe checkout to activate the addon.
 * Body: { addonId, stripeSubscriptionItemId? }
 */
export const activateAddon = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { addonId, stripeSubscriptionItemId } = req.body;

  const addon = await Addon.findByPk(addonId);
  if (!addon) {
    throw new AppError("Add-on no encontrado.", 404);
  }

  const [companyAddon, created] = await CompanyAddon.findOrCreate({
    where: { companyId, addonId },
    defaults: {
      companyId,
      addonId,
      status: "active",
      stripeSubscriptionItemId: stripeSubscriptionItemId || null,
      activatedAt: new Date()
    }
  });

  if (!created) {
    await companyAddon.update({
      status: "active",
      stripeSubscriptionItemId: stripeSubscriptionItemId || companyAddon.stripeSubscriptionItemId,
      activatedAt: new Date(),
      cancelledAt: null
    });
  }

  logger.info(`Addon ${addon.name} activated for company ${companyId}`);
  return res.json(companyAddon);
};

/**
 * POST /company-addons/:id/cancel
 * Cancel a company addon subscription.
 */
export const cancelAddon = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const companyAddon = await CompanyAddon.findOne({
    where: { id, companyId }
  });

  if (!companyAddon) {
    throw new AppError("Add-on no encontrado.", 404);
  }

  // Cancel in Stripe if there's a subscription
  if (companyAddon.stripeSubscriptionItemId) {
    try {
      // Find and cancel the Stripe subscription associated with this addon
      const company = await Company.findByPk(companyId);
      if (company?.stripeCustomerId) {
        const subscriptions = await stripe.subscriptions.list({
          customer: company.stripeCustomerId,
          status: "active"
        });

        for (const sub of subscriptions.data) {
          if (sub.metadata?.addonId === String(companyAddon.addonId)) {
            await stripe.subscriptions.cancel(sub.id);
            break;
          }
        }
      }
    } catch (err) {
      logger.error(`Error cancelling addon Stripe subscription: ${err.message}`);
    }
  }

  await companyAddon.update({
    status: "cancelled",
    cancelledAt: new Date()
  });

  logger.info(`Addon ${id} cancelled for company ${companyId}`);
  return res.json({ message: "Add-on cancelado exitosamente." });
};

/**
 * GET /company-addons/check/:featureKey
 * Check if the company has a specific addon active.
 */
export const checkAddon = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { featureKey } = req.params;

  const addon = await Addon.findOne({ where: { featureKey } });
  if (!addon) {
    return res.json({ hasAddon: false });
  }

  const companyAddon = await CompanyAddon.findOne({
    where: { companyId, addonId: addon.id, status: "active" }
  });

  return res.json({ hasAddon: !!companyAddon, addon: addon.toJSON() });
};

// ---------------------------------------------------------------------------
// Admin: manage company addons (super admin)
// ---------------------------------------------------------------------------

/**
 * GET /addons/company/:companyId  (super admin)
 * List all addons for a specific company.
 */
export const listCompanyAddonsAdmin = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;

  const companyAddons = await CompanyAddon.findAll({
    where: { companyId },
    include: [{ model: Addon, as: "addon" }]
  });

  return res.json(companyAddons);
};

/**
 * POST /addons/company/:companyId/grant  (super admin)
 * Grant an addon to a company without payment (admin override).
 * Body: { addonId }
 */
export const grantAddon = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const { addonId } = req.body;

  const addon = await Addon.findByPk(addonId);
  if (!addon) {
    throw new AppError("Add-on no encontrado.", 404);
  }

  const [companyAddon, created] = await CompanyAddon.findOrCreate({
    where: { companyId: Number(companyId), addonId },
    defaults: {
      companyId: Number(companyId),
      addonId,
      status: "active",
      activatedAt: new Date()
    }
  });

  if (!created) {
    await companyAddon.update({
      status: "active",
      activatedAt: new Date(),
      cancelledAt: null
    });
  }

  logger.info(`Admin granted addon ${addon.name} to company ${companyId}`);
  return res.json(companyAddon);
};
