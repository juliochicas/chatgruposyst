import { Request, Response } from "express";

import {
  GenerateMetaAuthUrl,
  HandleMetaOAuthCallback
} from "../services/ChannelService/MetaOAuthService";
import metaConfig from "../config/meta";
import { logger } from "../utils/logger";

export const getAuthUrl = (req: Request, res: Response): Response => {
  const { companyId, id: userId } = req.user;

  const { url } = GenerateMetaAuthUrl({
    companyId,
    userId
  });

  return res.json({ url });
};

export const oauthCallback = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { code, state, error, error_description: errorDescription } = req.query;

  const redirectUrl = new URL(metaConfig.postConnectRedirect);

  if (error) {
    redirectUrl.searchParams.set("meta_status", "error");
    redirectUrl.searchParams.set(
      "meta_message",
      String(errorDescription || error)
    );
    return res.redirect(redirectUrl.toString());
  }

  try {
    await HandleMetaOAuthCallback({
      code: String(code),
      state: String(state)
    });
    redirectUrl.searchParams.set("meta_status", "success");
  } catch (err) {
    logger.error({ err }, "Meta OAuth callback failed");
    redirectUrl.searchParams.set("meta_status", "error");
    redirectUrl.searchParams.set("meta_message", err.message);
  }

  return res.redirect(redirectUrl.toString());
};

