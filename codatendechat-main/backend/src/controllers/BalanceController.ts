import { Request, Response } from "express";
import Stripe from "stripe";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import BalanceTransaction from "../models/BalanceTransaction";
import sequelize from "../database";
import { logger } from "../utils/logger";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16" as any
});

// ---------------------------------------------------------------------------
// Company: view own balance and transactions
// ---------------------------------------------------------------------------

/**
 * GET /balance
 * Get the current balance and recent transactions for the authenticated company.
 */
export const getBalance = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name", "balance"]
  });

  if (!company) {
    throw new AppError("Empresa no encontrada.", 404);
  }

  const transactions = await BalanceTransaction.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    limit: 50
  });

  return res.json({
    balance: Number(company.balance) || 0,
    transactions
  });
};

// ---------------------------------------------------------------------------
// Admin: manage company balance (super admin only)
// ---------------------------------------------------------------------------

/**
 * GET /balance/company/:companyId
 * Get balance and transactions for a specific company (super admin).
 */
export const getCompanyBalance = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;

  const company = await Company.findByPk(companyId, {
    attributes: ["id", "name", "balance"]
  });

  if (!company) {
    throw new AppError("Empresa no encontrada.", 404);
  }

  const transactions = await BalanceTransaction.findAll({
    where: { companyId },
    order: [["createdAt", "DESC"]],
    limit: 100
  });

  return res.json({
    balance: Number(company.balance) || 0,
    transactions
  });
};

/**
 * POST /balance/company/:companyId/credit
 * Add credit (saldo a favor) to a company account.
 * Body: { amount, description }
 */
export const addCredit = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const { amount, description } = req.body;
  const performedBy = req.user.id;

  if (!amount || amount <= 0) {
    throw new AppError("El monto debe ser mayor a 0.", 400);
  }

  const transaction = await sequelize.transaction();

  try {
    const company = await Company.findByPk(companyId, { transaction, lock: true });
    if (!company) {
      await transaction.rollback();
      throw new AppError("Empresa no encontrada.", 404);
    }

    const currentBalance = Number(company.balance) || 0;
    const newBalance = currentBalance + Number(amount);

    await company.update({ balance: newBalance }, { transaction });

    const balanceTx = await BalanceTransaction.create({
      companyId: Number(companyId),
      type: "credit",
      amount: Number(amount),
      description: description || "Crédito agregado por administrador",
      performedBy,
      balanceAfter: newBalance
    }, { transaction });

    await transaction.commit();

    logger.info(`Balance credit: +$${amount} for company ${companyId} by user ${performedBy}`);
    return res.json({ balance: newBalance, transaction: balanceTx });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * POST /balance/company/:companyId/debit
 * Deduct from company balance (e.g. for internal charges).
 * Body: { amount, description }
 */
export const addDebit = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const { amount, description } = req.body;
  const performedBy = req.user.id;

  if (!amount || amount <= 0) {
    throw new AppError("El monto debe ser mayor a 0.", 400);
  }

  const transaction = await sequelize.transaction();

  try {
    const company = await Company.findByPk(companyId, { transaction, lock: true });
    if (!company) {
      await transaction.rollback();
      throw new AppError("Empresa no encontrada.", 404);
    }

    const currentBalance = Number(company.balance) || 0;
    const newBalance = currentBalance - Number(amount);

    await company.update({ balance: newBalance }, { transaction });

    const balanceTx = await BalanceTransaction.create({
      companyId: Number(companyId),
      type: "debit",
      amount: -Number(amount),
      description: description || "Cargo aplicado por administrador",
      performedBy,
      balanceAfter: newBalance
    }, { transaction });

    await transaction.commit();

    logger.info(`Balance debit: -$${amount} for company ${companyId} by user ${performedBy}`);
    return res.json({ balance: newBalance, transaction: balanceTx });
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
};

/**
 * POST /balance/company/:companyId/refund
 * Process a Stripe refund and credit the company balance.
 * Body: { paymentIntentId?, amount?, description }
 *   - If paymentIntentId is provided, issues a Stripe refund
 *   - If not, just adds a balance credit (manual adjustment)
 */
export const processRefund = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;
  const { paymentIntentId, amount, description } = req.body;
  const performedBy = req.user.id;

  const dbTransaction = await sequelize.transaction();

  try {
    const company = await Company.findByPk(companyId, { transaction: dbTransaction, lock: true });
    if (!company) {
      await dbTransaction.rollback();
      throw new AppError("Empresa no encontrada.", 404);
    }

    let refundAmount = Number(amount);
    let stripeRefundId: string | null = null;

    // If we have a Stripe payment intent, process the refund through Stripe
    if (paymentIntentId) {
      try {
        const refundParams: Stripe.RefundCreateParams = {
          payment_intent: paymentIntentId
        };

        // Partial refund if amount specified
        if (amount && amount > 0) {
          refundParams.amount = Math.round(Number(amount) * 100); // cents
        }

        const stripeRefund = await stripe.refunds.create(refundParams);
        stripeRefundId = stripeRefund.id;
        refundAmount = (stripeRefund.amount || 0) / 100;

        logger.info(
          `Stripe refund processed: ${stripeRefundId} for $${refundAmount} (PI: ${paymentIntentId})`
        );
      } catch (stripeErr: any) {
        await dbTransaction.rollback();
        throw new AppError(
          `Error al procesar el reembolso en Stripe: ${stripeErr.message}`,
          400
        );
      }
    }

    if (!refundAmount || refundAmount <= 0) {
      await dbTransaction.rollback();
      throw new AppError("El monto del reembolso debe ser mayor a 0.", 400);
    }

    // Credit the company balance
    const currentBalance = Number(company.balance) || 0;
    const newBalance = currentBalance + refundAmount;

    await company.update({ balance: newBalance }, { transaction: dbTransaction });

    const balanceTx = await BalanceTransaction.create({
      companyId: Number(companyId),
      type: "refund",
      amount: refundAmount,
      description: description || `Reembolso${paymentIntentId ? ` (Stripe: ${paymentIntentId})` : ""}`,
      stripeRefundId,
      stripePaymentIntentId: paymentIntentId || null,
      performedBy,
      balanceAfter: newBalance
    }, { transaction: dbTransaction });

    await dbTransaction.commit();

    logger.info(
      `Refund: +$${refundAmount} credited to company ${companyId} balance by user ${performedBy}`
    );

    return res.json({
      balance: newBalance,
      transaction: balanceTx,
      stripeRefundId
    });
  } catch (err) {
    if (dbTransaction) {
      try { await dbTransaction.rollback(); } catch (_) {}
    }
    throw err;
  }
};

/**
 * GET /balance/company/:companyId/stripe-charges
 * List recent Stripe charges for a company (to pick one for refund).
 */
export const listStripeCharges = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.params;

  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("Empresa no encontrada.", 404);
  }

  if (!company.stripeCustomerId) {
    return res.json({ charges: [] });
  }

  try {
    const charges = await stripe.charges.list({
      customer: company.stripeCustomerId,
      limit: 20
    });

    const formatted = charges.data.map(c => ({
      id: c.id,
      paymentIntentId: c.payment_intent,
      amount: c.amount / 100,
      currency: c.currency,
      status: c.status,
      description: c.description,
      created: new Date(c.created * 1000).toISOString(),
      refunded: c.refunded,
      amountRefunded: c.amount_refunded / 100
    }));

    return res.json({ charges: formatted });
  } catch (err: any) {
    logger.error(`Error listing Stripe charges: ${err.message}`);
    throw new AppError("Error al obtener los cargos de Stripe.", 400);
  }
};
