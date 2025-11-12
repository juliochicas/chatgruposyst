import { Request, Response } from "express";

import CreateChannelService from "../services/ChannelService/CreateChannelService";
import ListChannelService from "../services/ChannelService/ListChannelService";
import UpdateChannelService from "../services/ChannelService/UpdateChannelService";
import DeleteChannelService from "../services/ChannelService/DeleteChannelService";
import ChannelManager from "../libs/channels/ChannelManager";

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { searchParam, type } = req.query;

  const channels = await ListChannelService({
    companyId,
    searchParam: searchParam as string,
    type: type as string
  });

  return res.json(channels);
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const {
    name,
    type,
    provider,
    status,
    externalId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    metadata
  } = req.body;

  const channel = await CreateChannelService({
    name,
    type,
    provider,
    status,
    externalId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    metadata,
    companyId
  });

  return res.status(201).json(channel);
};

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { channelId } = req.params;
  const {
    name,
    type,
    provider,
    status,
    externalId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    metadata
  } = req.body;

  const channel = await UpdateChannelService({
    channelId,
    companyId,
    name,
    type,
    provider,
    status,
    externalId,
    accessToken,
    refreshToken,
    tokenExpiresAt,
    metadata
  });

  ChannelManager.clear(Number(channelId));

  return res.json(channel);
};

export const remove = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { channelId } = req.params;
  const { force } = req.query;

  await DeleteChannelService({
    channelId,
    companyId,
    force: force === "true"
  });

  ChannelManager.clear(Number(channelId));

  return res.status(204).send();
};

