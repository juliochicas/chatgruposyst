
import { Request, Response } from "express";
import * as DashboardController from "../../controllers/DashbardController";
import { TicketsAttendance } from "../../services/ReportService/TicketsAttendance";
import { TicketsDayService } from "../../services/ReportService/TicketsDayService";

// Mock the services with factory to avoid importing original files that might require DB connection
jest.mock("../../services/ReportService/TicketsAttendance", () => ({
  TicketsAttendance: jest.fn(),
}));
jest.mock("../../services/ReportService/TicketsDayService", () => ({
  TicketsDayService: jest.fn(),
}));
jest.mock("../../services/ReportService/DashbardDataService", () => ({
    __esModule: true,
    default: jest.fn(),
}));

describe("DashboardController", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let mockJson: jest.Mock;

  beforeEach(() => {
    mockJson = jest.fn();
    mockResponse = {
      json: mockJson,
      status: jest.fn().mockReturnThis(),
    };
    // Mock request with malicious query param and legitimate user param
    mockRequest = {
      query: {
        initialDate: "2023-01-01",
        finalDate: "2023-01-31",
        companyId: "999",
      },
      user: {
        id: "user1",
        profile: "admin",
        companyId: 123,
      },
    } as unknown as Request; // Cast to unknown then Request to satisfy TS
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("reportsUsers should use companyId from req.user (123), not req.query (999)", async () => {
    (TicketsAttendance as jest.Mock).mockResolvedValue({ data: [] });

    await DashboardController.reportsUsers(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(TicketsAttendance).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 123,
      })
    );
    expect(TicketsAttendance).not.toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "999",
        })
      );
  });

  it("reportsDay should use companyId from req.user (123), not req.query (999)", async () => {
    (TicketsDayService as jest.Mock).mockResolvedValue({ count: 0, data: [] });

    await DashboardController.reportsDay(
      mockRequest as Request,
      mockResponse as Response
    );

    expect(TicketsDayService).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 123,
      })
    );
    expect(TicketsDayService).not.toHaveBeenCalledWith(
        expect.objectContaining({
            companyId: "999",
          })
        );
  });
});
