import * as Yup from "yup";
import { Request, Response } from "express";
// import { getIO } from "../libs/socket";
import AppError from "../errors/AppError";
import Company from "../models/Company";
import authConfig from "../config/auth";
import fs from "fs";
import path from "path";

import ListCompaniesService from "../services/CompanyService/ListCompaniesService";
import CreateCompanyService from "../services/CompanyService/CreateCompanyService";
import UpdateCompanyService from "../services/CompanyService/UpdateCompanyService";
import ShowCompanyService from "../services/CompanyService/ShowCompanyService";
import UpdateSchedulesService from "../services/CompanyService/UpdateSchedulesService";
import DeleteCompanyService from "../services/CompanyService/DeleteCompanyService";
import FindAllCompaniesService from "../services/CompanyService/FindAllCompaniesService";
import CompanyBackupService from "../services/CompanyService/CompanyBackupService";
import { verify } from "jsonwebtoken";
import User from "../models/User";
import ShowPlanCompanyService from "../services/CompanyService/ShowPlanCompanyService";
import ListCompaniesPlanService from "../services/CompanyService/ListCompaniesPlanService";
import ShowPlanUsageService from "../services/CompanyService/ShowPlanUsageService";
import { sendAccountDeletedEmail } from "../services/EmailServices/SystemEmailService";
import { logger } from "../utils/logger";

type IndexQuery = {
  searchParam: string;
  pageNumber: string;
};

interface TokenPayload {
  id: string;
  username: string;
  profile: string;
  companyId: number;
  iat: number;
  exp: number;
}

type CompanyData = {
  name: string;
  id?: number;
  phone?: string;
  email?: string;
  status?: boolean;
  planId?: number;
  campaignsEnabled?: boolean;
  dueDate?: string;
  recurrence?: string;
  password: string;
};

type SchedulesData = {
  schedules: [];
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const { companies, count, hasMore } = await ListCompaniesService({
    searchParam,
    pageNumber
  });

  return res.json({ companies, count, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const newCompany: CompanyData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string().required()
  });

  try {
    await schema.validate(newCompany);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const company = await CreateCompanyService(newCompany);

  return res.status(200).json(company);
};

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const company = await ShowCompanyService(id);

  return res.status(200).json(company);
};

export const list = async (req: Request, res: Response): Promise<Response> => {
  const companies: Company[] = await FindAllCompaniesService();

  return res.status(200).json(companies);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const companyData: CompanyData = req.body;

  const schema = Yup.object().shape({
    name: Yup.string()
  });

  try {
    await schema.validate(companyData);
  } catch (err: any) {
    throw new AppError(err.message);
  }

  const { id } = req.params;

  const company = await UpdateCompanyService({ id, ...companyData });

  return res.status(200).json(company);
};

export const updateSchedules = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { schedules }: SchedulesData = req.body;
  const { id } = req.params;

  const company = await UpdateSchedulesService({
    id,
    schedules
  });

  return res.status(200).json(company);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  const company = await DeleteCompanyService(id);

  return res.status(200).json(company);
};

export const listPlan = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id: requestUserId, profile, companyId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(requestUserId);

  if (requestUser.super === true) {
    const company = await ShowPlanCompanyService(id);
    return res.status(200).json(company);
  } else if (companyId.toString() !== id) {
    return res.status(400).json({ error: "No tienes permiso para acceder a este recurso." });
  } else {
    const company = await ShowPlanCompanyService(id);
    return res.status(200).json(company);
  }

};

export const indexPlan = async (req: Request, res: Response): Promise<Response> => {
  const { searchParam, pageNumber } = req.query as IndexQuery;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id, profile, companyId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(id);

  if (requestUser.super === true) {
    const companies = await ListCompaniesPlanService();
    return res.json({ companies });
  } else {
    return res.status(400).json({ error: "No tienes permiso para acceder a este recurso." });
  }

};

/**
 * GET /companies/:id/plan-usage
 * Returns real-time usage vs plan limits for a company.
 */
export const planUsage = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  // Allow if super admin or same company
  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id: userId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(userId);

  if (!requestUser?.super && companyId.toString() !== id) {
    throw new AppError("No tienes permiso para acceder a este recurso.", 403);
  }

  const usage = await ShowPlanUsageService(Number(id));
  return res.status(200).json(usage);
};

/**
 * POST /companies/:id/backup
 * Creates a full backup of the company data. Super admin only.
 */
export const backup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id: userId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(userId);

  if (!requestUser?.super) {
    throw new AppError("Solo super administradores pueden crear backups.", 403);
  }

  const result = await CompanyBackupService(Number(id));

  return res.status(200).json({
    message: "Backup creado exitosamente",
    fileName: result.fileName,
    summary: result.summary
  });
};

/**
 * GET /companies/:id/backup/download
 * Downloads the most recent backup file for a company. Super admin only.
 */
export const downloadBackup = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { id } = req.params;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id: userId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(userId);

  if (!requestUser?.super) {
    throw new AppError("Solo super administradores pueden descargar backups.", 403);
  }

  const backupsDir = path.resolve(__dirname, "..", "..", "backups");

  if (!fs.existsSync(backupsDir)) {
    throw new AppError("No se encontraron backups.", 404);
  }

  // Find the most recent backup for this company
  const files = fs.readdirSync(backupsDir)
    .filter(f => f.includes(`_${id}_`) && f.endsWith(".json"))
    .sort()
    .reverse();

  if (files.length === 0) {
    throw new AppError("No se encontró backup para esta empresa.", 404);
  }

  const filePath = path.join(backupsDir, files[0]);
  res.download(filePath, files[0]);
};

/**
 * DELETE /companies/:id/full
 * Creates a backup, sends notification email, then deletes the company.
 * Super admin only.
 */
export const removeWithBackup = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;

  const authHeader = req.headers.authorization;
  const [, token] = authHeader.split(" ");
  const decoded = verify(token, authConfig.secret);
  const { id: userId } = decoded as TokenPayload;
  const requestUser = await User.findByPk(userId);

  if (!requestUser?.super) {
    throw new AppError("Solo super administradores pueden eliminar empresas.", 403);
  }

  const company = await Company.findByPk(id);
  if (!company) {
    throw new AppError("Empresa no encontrada.", 404);
  }

  // 1. Create backup first
  logger.info(`Company delete: Creating backup before deleting company ${id}`);
  const backupResult = await CompanyBackupService(Number(id));

  // 2. Send notification email to the company
  if (company.email) {
    sendAccountDeletedEmail({
      name: company.name,
      email: company.email
    }).catch(() => {});
  }

  // 3. Delete the company (cascading deletes all related data)
  logger.info(`Company delete: Deleting company ${id} (${company.name})`);
  await DeleteCompanyService(id);

  return res.status(200).json({
    message: "Empresa eliminada exitosamente. Backup guardado.",
    backup: {
      fileName: backupResult.fileName,
      summary: backupResult.summary
    }
  });
};