import { Request, Response, NextFunction } from "express";
import Company from "../models/Company";
import AppError from "../errors/AppError";

/**
 * Middleware that blocks API access for companies whose dueDate has passed.
 *
 * Exempt routes (users can still access billing/auth even when expired):
 *  - /auth/*
 *  - /subscription/*
 *  - /invoices/*
 *  - /companies/* (so admin can still manage)
 *  - /plans/*
 *  - /users/me (so frontend can load user data)
 */
const EXEMPT_PATTERNS = [
  /^\/auth/,
  /^\/subscription/,
  /^\/invoices/,
  /^\/companies/,
  /^\/plans/,
  /^\/settings/,
  /^\/users\/me/,          // so frontend can load user profile
  /^\/users\/\d+$/         // so frontend can fetch user details
];

const isCompanyActive = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  // Skip if no authenticated user (public routes)
  if (!req.user || !req.user.companyId) {
    return next();
  }

  // Skip exempt routes
  const path = req.path || req.url;
  for (const pattern of EXEMPT_PATTERNS) {
    if (pattern.test(path)) {
      return next();
    }
  }

  try {
    const company = await Company.findByPk(req.user.companyId, {
      attributes: ["id", "dueDate", "status"]
    });

    if (!company) {
      throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
    }

    // Check if company is explicitly disabled
    if (company.status === false) {
      throw new AppError("ERR_COMPANY_DISABLED", 403);
    }

    // Check dueDate expiration
    if (company.dueDate) {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const due = new Date(company.dueDate);
      due.setHours(0, 0, 0, 0);

      if (due < now) {
        throw new AppError("ERR_COMPANY_EXPIRED", 403);
      }
    }
  } catch (err) {
    if (err instanceof AppError) {
      throw err;
    }
    // If DB error, let the request through (don't block on infra issues)
  }

  return next();
};

export default isCompanyActive;
