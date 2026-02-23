import ListTicketsService from "../ListTicketsService";
import TicketTag from "../../../models/TicketTag";
import Ticket from "../../../models/Ticket";

jest.mock("../../../models/TicketTag");
jest.mock("../../../models/Ticket");
jest.mock("../../../models/Contact");
jest.mock("../../../models/Message");
jest.mock("../../../models/Queue");
jest.mock("../../../models/User");
jest.mock("../../../models/Tag");
jest.mock("../../../models/Whatsapp");
jest.mock("../../UserServices/ShowUserService");

describe("ListTicketsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should make only one query to filter by multiple tags", async () => {
    // Mock return value for TicketTag.findAll
    // The current implementation calls findAll multiple times.
    // The optimized implementation calls findAll once.
    (TicketTag.findAll as jest.Mock).mockResolvedValue([
      { ticketId: 10 },
      { ticketId: 20 }
    ]);
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 2,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: [1, 2],
      users: []
    });

    // This expectation will fail for the current implementation (it will be 2)
    // It will pass for the optimized implementation (it will be 1)
    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);
  });

  it("should optimize user filtering for single user", async () => {
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: [],
      users: [99]
    });

    // The current implementation calls Ticket.findAll({ where: { userId: 99 } }) then Ticket.findAndCountAll({ where: { id: ... } })
    // The optimized implementation calls Ticket.findAndCountAll({ where: { userId: 99 } }) directly.

    // We expect Ticket.findAll NOT to be called (only findAndCountAll)
    expect(Ticket.findAll).not.toHaveBeenCalled();

    // Verify findAndCountAll was called with correct filter
    // Note: The structure of where might be complex, so we check specifically for userId
    const callArgs = (Ticket.findAndCountAll as jest.Mock).mock.calls[0][0];
    // Depending on implementation, userId might be at top level of where or nested
    // In optimized implementation: whereCondition = { ..., userId: 99 }
    expect(callArgs.where).toHaveProperty("userId", 99);
  });

  it("should return empty immediately if multiple users are selected (intersection)", async () => {
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    const result = await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: [],
      users: [1, 2]
    });

    expect(result.count).toBe(0);
    // Should return early, so no main query
    expect(Ticket.findAndCountAll).not.toHaveBeenCalled();
  });

  it("should return empty immediately if no tickets match tags", async () => {
    (TicketTag.findAll as jest.Mock).mockResolvedValue([]);

    const result = await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: [1, 2],
      users: []
    });

    expect(result.count).toBe(0);
    expect(Ticket.findAndCountAll).not.toHaveBeenCalled();
  });
});
