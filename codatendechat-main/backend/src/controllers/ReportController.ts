import { Request, Response } from "express";

import ExportMetricsService from "../services/ReportService/ExportMetricsService";

export const exportMetrics = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { companyId } = req.user;
  const { dateFrom, dateTo, agentId, channelType, origin } = req.query;

  const buffer = await ExportMetricsService({
    companyId,
    dateFrom: dateFrom as string,
    dateTo: dateTo as string,
    agentId: agentId ? Number(agentId) : undefined,
    channelType: channelType as string,
    origin: origin as string
  });

  res.setHeader(
    "Content-Disposition",
    `attachment; filename="chatgruposyst_metrics_${Date.now()}.xlsx"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  return res.send(buffer);
};

