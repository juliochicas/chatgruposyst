import { Request, Response } from "express";
import Stripe from "stripe";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import Invoices from "../models/Invoices";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any
});

export const index = async (req: Request, res: Response): Promise<Response> => {
  return res.json({ status: "Stripe integration active" });
};

export const createSubscription = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const { price, users, connections, invoiceId } = req.body;

  if (!price || !users || !connections) {
    throw new AppError("Validation fails: price, users and connections are required", 400);
  }

  try {
    const company = await Company.findByPk(companyId);
    if (!company) {
      throw new AppError("Company not found", 404);
    }

    const unitAmount = Math.round(parseFloat(price) * 100);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Plan - ${users} users, ${connections} connections`,
              description: `Invoice #${invoiceId}`
            },
            unit_amount: unitAmount
          },
          quantity: 1
        }
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/#/financeiro?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/#/financeiro`,
      metadata: {
        invoiceId: String(invoiceId),
        companyId: String(companyId)
      }
    });

    return res.json({
      id: session.id,
      url: session.url
    });
  } catch (error) {
    logger.error(error);
    throw new AppError("Error creating Stripe checkout session", 400);
  }
};

export const createWebhook = async (
  req: Request,
  res: Response
): Promise<Response> => {
  return res.json({ ok: true });
};

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

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    if (session.payment_status === "paid") {
      const invoiceId = session.metadata?.invoiceId;
      const companyId = session.metadata?.companyId;

      if (invoiceId && companyId) {
        try {
          const invoice = await Invoices.findByPk(invoiceId);
          const company = await Company.findByPk(companyId);

          if (company && invoice) {
            const expiresAt = new Date(company.dueDate);
            expiresAt.setDate(expiresAt.getDate() + 30);
            const date = expiresAt.toISOString().split("T")[0];

            await company.update({ dueDate: date });
            await invoice.update({ status: "paid" });
            await company.reload();

            const io = getIO();
            const companyUpdate = await Company.findOne({
              where: { id: companyId }
            });

            io.to(`company-${companyId}-mainchannel`).emit(
              `company-${companyId}-payment`,
              {
                action: "CONCLUIDA",
                company: companyUpdate
              }
            );
          }
        } catch (error) {
          logger.error(`Error processing payment for invoice ${invoiceId}: ${error}`);
        }
      }
    }
  }

  return res.json({ received: true });
};
