import { Request, Response } from "express";
import UltraMsgConfig from "../models/UltraMsgConfig";
import AppError from "../errors/AppError";
import {
  getInstanceStatus,
  getMessageStatistics
} from "../services/UltraMsgServices/UltraMsgAPI";

export const index = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const configs = await UltraMsgConfig.findAll({
    where: { companyId }
  });

  return res.status(200).json(configs);
};

export const show = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const config = await UltraMsgConfig.findOne({
    where: { id, companyId }
  });

  if (!config) {
    throw new AppError("ERR_ULTRAMSG_CONFIG_NOT_FOUND", 404);
  }

  return res.status(200).json(config);
};

export const store = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { instanceId, token } = req.body;

  if (!instanceId || !token) {
    throw new AppError("Instance ID y Token son requeridos");
  }

  // Check if config already exists for this company
  const existing = await UltraMsgConfig.findOne({ where: { companyId } });

  let config;
  if (existing) {
    await existing.update({ instanceId, token });
    config = existing;
  } else {
    config = await UltraMsgConfig.create({
      instanceId,
      token,
      companyId,
      isActive: false,
      status: "DISCONNECTED"
    });
  }

  return res.status(200).json(config);
};

export const update = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;
  const data = req.body;

  const config = await UltraMsgConfig.findOne({
    where: { id, companyId }
  });

  if (!config) {
    throw new AppError("ERR_ULTRAMSG_CONFIG_NOT_FOUND", 404);
  }

  await config.update(data);

  return res.status(200).json(config);
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const config = await UltraMsgConfig.findOne({
    where: { id, companyId }
  });

  if (!config) {
    throw new AppError("ERR_ULTRAMSG_CONFIG_NOT_FOUND", 404);
  }

  await config.destroy();

  return res.status(200).json({ message: "Configuración eliminada" });
};

export const testConnection = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const config = await UltraMsgConfig.findOne({ where: { companyId } });

  if (!config) {
    throw new AppError("ERR_ULTRAMSG_CONFIG_NOT_FOUND", 404);
  }

  try {
    const status = await getInstanceStatus({
      instanceId: config.instanceId,
      token: config.token
    });

    const isConnected =
      status?.status?.accountStatus?.status === "authenticated";

    await config.update({
      status: isConnected ? "CONNECTED" : "DISCONNECTED",
      isActive: isConnected
    });

    return res.status(200).json({
      success: true,
      status: isConnected ? "CONNECTED" : "DISCONNECTED",
      details: status
    });
  } catch (error: any) {
    await config.update({ status: "ERROR", isActive: false });

    return res.status(200).json({
      success: false,
      status: "ERROR",
      message: error.message
    });
  }
};

export const getStatus = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const config = await UltraMsgConfig.findOne({ where: { companyId } });

  if (!config) {
    return res.status(200).json({ configured: false });
  }

  try {
    const status = await getInstanceStatus({
      instanceId: config.instanceId,
      token: config.token
    });

    return res.status(200).json({
      configured: true,
      isActive: config.isActive,
      status: status
    });
  } catch (error: any) {
    return res.status(200).json({
      configured: true,
      isActive: false,
      status: "ERROR",
      message: error.message
    });
  }
};

export const getStats = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;

  const config = await UltraMsgConfig.findOne({ where: { companyId } });

  if (!config) {
    throw new AppError("ERR_ULTRAMSG_CONFIG_NOT_FOUND", 404);
  }

  try {
    const stats = await getMessageStatistics({
      instanceId: config.instanceId,
      token: config.token
    });

    return res.status(200).json(stats);
  } catch (error: any) {
    return res.status(200).json({ error: error.message });
  }
};
