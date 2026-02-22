import ListTicketsService from "../ListTicketsService";
import TicketTag from "../../../models/TicketTag";
import Ticket from "../../../models/Ticket";

// Mock dependencies
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

  it("should query TicketTag once using GROUP BY/HAVING (Optimized)", async () => {
    // Setup mocks
    (TicketTag.findAll as jest.Mock).mockResolvedValue([]);
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: [1, 2, 3], // 3 tags
      users: []
    });

    // Optimized: calls findAll 1 time
    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);
  });

  it("should NOT query Ticket for users loop (Optimized)", async () => {
    // Setup mocks
    (Ticket.findAll as jest.Mock).mockResolvedValue([]);
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: [],
      users: [10, 20] // 2 users
    });

    // Optimized: Loop removed, so Ticket.findAll is NOT called.
    expect(Ticket.findAll).toHaveBeenCalledTimes(0);
  });
});
