import { Request, Response } from "express";
import MessageVariable from "../models/MessageVariable";
import AppError from "../errors/AppError";
import { clearCustomVarCache } from "../helpers/Mustache";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;

  const variables = await MessageVariable.findAll({
    where: { companyId },
    order: [["label", "ASC"]],
  });

  return res.json(variables);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { key, label, value } = req.body;

  if (!key || !label) {
    throw new AppError("ERR_MISSING_FIELDS", 400);
  }

  // Sanitize key: remove spaces, special chars, ensure camelCase-friendly
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");

  if (!sanitizedKey) {
    throw new AppError("ERR_INVALID_KEY", 400);
  }

  const variable = await MessageVariable.create({
    key: sanitizedKey,
    label,
    value: value || "",
    companyId,
  });

  clearCustomVarCache(companyId);
  return res.status(201).json(variable);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;
  const { key, label, value } = req.body;

  const variable = await MessageVariable.findOne({
    where: { id, companyId },
  });

  if (!variable) {
    throw new AppError("ERR_VARIABLE_NOT_FOUND", 404);
  }

  if (key) {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_]/g, "");
    if (!sanitizedKey) {
      throw new AppError("ERR_INVALID_KEY", 400);
    }
    variable.key = sanitizedKey;
  }

  if (label) variable.label = label;
  if (value !== undefined) variable.value = value;

  await variable.save();
  clearCustomVarCache(companyId);

  return res.json(variable);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { id } = req.params;

  const variable = await MessageVariable.findOne({
    where: { id, companyId },
  });

  if (!variable) {
    throw new AppError("ERR_VARIABLE_NOT_FOUND", 404);
  }

  await variable.destroy();
  clearCustomVarCache(companyId);

  return res.status(200).json({ message: "Variable deleted" });
};
