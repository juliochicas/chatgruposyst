import { Request, Response } from "express";
import Stripe from "stripe";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Plan from "../models/Plan";
import Invoices from "../models/Invoices";
import Subscriptions from "../models/Subscriptions";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get or create a Stripe Customer for the given company.
 */
const getOrCreateStripeCustomer = async (company: Company): Promise<string> => {
  if (company.stripeCustomerId) {
    return company.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    name: company.name,
    email: company.email || undefined,
    metadata: { companyId: String(company.id) }
  });

  await company.update({ stripeCustomerId: customer.id });
  return customer.id;
};

/**
 * Set dueDate 30 days from now (or from current dueDate if still in future).
 */
const extendDueDate = async (company: Company, days = 30): Promise<void> => {
  const now = new Date();
  const current = company.dueDate ? new Date(company.dueDate) : now;
  const base = current > now ? current : now;
  base.setDate(base.getDate() + days);
  await company.update({ dueDate: base.toISOString().split("T")[0] });
};

// ---------------------------------------------------------------------------
// Controllers
// ---------------------------------------------------------------------------

export const index = async (_req: Request, res: Response): Promise<Response> => {
  return res.json({ status: "Stripe subscription integration active" });
};

/**
 * POST /subscription
 * Creates a Stripe Checkout Session in subscription mode.
 * Body: { planId, recurrence?, users?, connections? }
 *   - recurrence: "monthly" | "annual" (default "monthly")
 *   - users / connections: only used for custom plans to calculate price
 */
export const createSubscription = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const {
    planId,
    recurrence = "monthly",
    users: extraUsers,
    connections: extraConnections,
    invoiceId
  } = req.body;

  if (!planId) {
    throw new AppError("planId is required", 400);
  }

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  const plan = await Plan.findByPk(planId);
  if (!plan) {
    throw new AppError("Plan not found", 404);
  }

  try {
    const customerId = await getOrCreateStripeCustomer(company);

    // Calculate price
    let totalMonthly = plan.value; // plan base price in USD

    // For custom plans, add extra users/connections
    if (plan.isCustom) {
      const baseUsers = plan.users || 3;
      const baseConnections = plan.connections || 1;
      const requestedUsers = extraUsers || baseUsers;
      const requestedConnections = extraConnections || baseConnections;

      const additionalUsers = Math.max(0, requestedUsers - baseUsers);
      const additionalConnections = Math.max(0, requestedConnections - baseConnections);

      totalMonthly += additionalUsers * 13; // $13 per extra user
      totalMonthly += additionalConnections * 20; // $20 per extra connection
    }

    // Annual = 12 months with 20% discount
    const isAnnual = recurrence === "annual";
    let unitAmount: number;
    let interval: "month" | "year";

    if (isAnnual) {
      unitAmount = Math.round(totalMonthly * 12 * 0.8 * 100); // 20% off, in cents
      interval = "year";
    } else {
      unitAmount = Math.round(totalMonthly * 100);
      interval = "month";
    }

    const planLabel = plan.isCustom
      ? `${plan.name} (${extraUsers || plan.users}U / ${extraConnections || plan.connections}C)`
      : plan.name;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `ChateaYA - ${planLabel}`,
              description: isAnnual
                ? `Suscripción anual – ${planLabel}`
                : `Suscripción mensual – ${planLabel}`
            },
            unit_amount: unitAmount,
            recurring: { interval }
          },
          quantity: 1
        }
      ],
      mode: "subscription",
      success_url: `${process.env.FRONTEND_URL}/#/financeiro?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/#/financeiro`,
      metadata: {
        companyId: String(companyId),
        planId: String(plan.id),
        invoiceId: invoiceId ? String(invoiceId) : "",
        recurrence,
        users: String(extraUsers || plan.users),
        connections: String(extraConnections || plan.connections)
      },
      subscription_data: {
        metadata: {
          companyId: String(companyId),
          planId: String(plan.id)
        }
      }
    });

    return res.json({ id: session.id, url: session.url });
  } catch (error) {
    logger.error("Error creating Stripe checkout session:", error);
    throw new AppError("Error creating Stripe checkout session", 400);
  }
};

/**
 * POST /subscription/portal
 * Creates a Stripe Customer Portal session so the customer can manage billing.
 */
export const createPortalSession = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Company not found", 404);
  }

  if (!company.stripeCustomerId) {
    throw new AppError("No billing account found. Please subscribe first.", 400);
  }

  try {
    const session = await stripe.billingPortal.sessions.create({
      customer: company.stripeCustomerId,
      return_url: `${process.env.FRONTEND_URL}/#/financeiro`
    });

    return res.json({ url: session.url });
  } catch (error) {
    logger.error("Error creating portal session:", error);
    throw new AppError("Error creating portal session", 400);
  }
};

/**
 * POST /subscription/webhook
 * Stripe webhook handler – handles full subscription lifecycle.
 */
export const webhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).json({ error: "Missing stripe-signature header" });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook Error: ${err.message}` });
  }

  try {
    switch (event.type) {
      // -----------------------------------------------------------------
      // Checkout completed – subscription just created
      // -----------------------------------------------------------------
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription" && session.subscription) {
          const companyId = session.metadata?.companyId;
          const planId = session.metadata?.planId;
          const invoiceId = session.metadata?.invoiceId;
          const subscriptionId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;

          if (companyId) {
            const company = await Company.findByPk(companyId);
            if (company) {
              await company.update({
                stripeSubscriptionId: subscriptionId,
                planId: planId ? Number(planId) : company.planId,
                recurrence: session.metadata?.recurrence || "monthly"
              });

              // Mark invoice as paid if provided
              if (invoiceId) {
                const invoice = await Invoices.findByPk(invoiceId);
                if (invoice) {
                  await invoice.update({ status: "paid" });
                }
              }

              // Update/create Subscriptions record
              const [sub] = await Subscriptions.findOrCreate({
                where: { companyId: Number(companyId) },
                defaults: {
                  companyId: Number(companyId),
                  isActive: true,
                  providerSubscriptionId: subscriptionId
                }
              });
              await sub.update({
                isActive: true,
                providerSubscriptionId: subscriptionId,
                lastPlanChange: new Date()
              });

              // Extend due date
              await extendDueDate(company);

              // Notify frontend
              await company.reload();
              const io = getIO();
              io.to(`company-${companyId}-mainchannel`).emit(
                `company-${companyId}-payment`,
                { action: "CONCLUIDA", company }
              );
            }
          }
        }

        // Backward compat: one-time payment checkout
        if (session.mode === "payment" && session.payment_status === "paid") {
          const invoiceId = session.metadata?.invoiceId;
          const companyId = session.metadata?.companyId;

          if (invoiceId && companyId) {
            const invoice = await Invoices.findByPk(invoiceId);
            const company = await Company.findByPk(companyId);
            if (company && invoice) {
              await extendDueDate(company);
              await invoice.update({ status: "paid" });
              await company.reload();

              const io = getIO();
              io.to(`company-${companyId}-mainchannel`).emit(
                `company-${companyId}-payment`,
                { action: "CONCLUIDA", company }
              );
            }
          }
        }
        break;
      }

      // -----------------------------------------------------------------
      // Recurring invoice paid – renew subscription period
      // -----------------------------------------------------------------
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          const company = await Company.findOne({
            where: { stripeSubscriptionId: subscriptionId }
          });

          if (company) {
            const isAnnual = company.recurrence === "annual";
            await extendDueDate(company, isAnnual ? 365 : 30);

            // Create internal invoice record
            await Invoices.create({
              detail: `Stripe invoice ${invoice.id}`,
              status: "paid",
              value: (invoice.amount_paid || 0) / 100,
              dueDate: new Date().toISOString().split("T")[0],
              companyId: company.id
            });

            // Update subscription record
            const sub = await Subscriptions.findOne({
              where: { companyId: company.id }
            });
            if (sub) {
              await sub.update({
                isActive: true,
                lastInvoiceUrl: invoice.hosted_invoice_url || null
              });
            }

            await company.reload();
            const io = getIO();
            io.to(`company-${company.id}-mainchannel`).emit(
              `company-${company.id}-payment`,
              { action: "CONCLUIDA", company }
            );

            logger.info(
              `invoice.paid: Company ${company.id} renewed until ${company.dueDate}`
            );
          }
        }
        break;
      }

      // -----------------------------------------------------------------
      // Invoice payment failed
      // -----------------------------------------------------------------
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subscriptionId =
          typeof invoice.subscription === "string"
            ? invoice.subscription
            : invoice.subscription?.id;

        if (subscriptionId) {
          const company = await Company.findOne({
            where: { stripeSubscriptionId: subscriptionId }
          });

          if (company) {
            logger.warn(
              `invoice.payment_failed: Company ${company.id} – payment failed for invoice ${invoice.id}`
            );

            // Create a failed invoice record
            await Invoices.create({
              detail: `Pago fallido – Stripe ${invoice.id}`,
              status: "open",
              value: (invoice.amount_due || 0) / 100,
              dueDate: new Date().toISOString().split("T")[0],
              companyId: company.id
            });

            const io = getIO();
            io.to(`company-${company.id}-mainchannel`).emit(
              `company-${company.id}-payment`,
              { action: "PAYMENT_FAILED", company }
            );
          }
        }
        break;
      }

      // -----------------------------------------------------------------
      // Subscription cancelled / expired
      // -----------------------------------------------------------------
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const companyId = subscription.metadata?.companyId;

        const company = companyId
          ? await Company.findByPk(companyId)
          : await Company.findOne({
              where: { stripeSubscriptionId: subscription.id }
            });

        if (company) {
          await company.update({ stripeSubscriptionId: null });

          const sub = await Subscriptions.findOne({
            where: { companyId: company.id }
          });
          if (sub) {
            await sub.update({ isActive: false });
          }

          logger.info(
            `customer.subscription.deleted: Company ${company.id} subscription cancelled`
          );

          const io = getIO();
          io.to(`company-${company.id}-mainchannel`).emit(
            `company-${company.id}-payment`,
            { action: "SUBSCRIPTION_CANCELLED", company }
          );
        }
        break;
      }

      // -----------------------------------------------------------------
      // Subscription updated (plan change, etc.)
      // -----------------------------------------------------------------
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const companyId = subscription.metadata?.companyId;

        const company = companyId
          ? await Company.findByPk(companyId)
          : await Company.findOne({
              where: { stripeSubscriptionId: subscription.id }
            });

        if (company) {
          const isActive = ["active", "trialing"].includes(
            subscription.status
          );

          const sub = await Subscriptions.findOne({
            where: { companyId: company.id }
          });
          if (sub) {
            await sub.update({ isActive });
          }

          logger.info(
            `customer.subscription.updated: Company ${company.id} status=${subscription.status}`
          );
        }
        break;
      }

      default:
        logger.info(`Unhandled Stripe event: ${event.type}`);
    }
  } catch (error) {
    logger.error(`Error processing webhook event ${event.type}:`, error);
  }

  return res.json({ received: true });
};

// Legacy endpoint – kept for backward compatibility
export const createWebhook = async (
  _req: Request,
  res: Response
): Promise<Response> => {
  return res.json({ ok: true });
};
