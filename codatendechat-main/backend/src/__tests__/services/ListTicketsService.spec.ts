import ListTicketsService from "../../services/TicketServices/ListTicketsService";
import TicketTag from "../../models/TicketTag";
import Ticket from "../../models/Ticket";
import ShowUserService from "../../services/UserServices/ShowUserService";
import { Op } from "sequelize";

// Mocks
jest.mock("../../models/TicketTag");
jest.mock("../../models/Ticket");
jest.mock("../../models/User");
jest.mock("../../models/Contact");
jest.mock("../../models/Message");
jest.mock("../../models/Queue");
jest.mock("../../models/Tag");
jest.mock("../../models/Whatsapp");
jest.mock("../../services/UserServices/ShowUserService");

describe("ListTicketsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should filter tickets by tags using a single query (Optimized)", async () => {
    // Setup mocks
    (TicketTag.findAll as jest.Mock).mockResolvedValue([
      { ticketId: 1, tagId: 1 },
      { ticketId: 1, tagId: 2 },
      { ticketId: 2, tagId: 1 },
      { ticketId: 3, tagId: 2 }
    ]);

    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 1,
      rows: [{ id: 1 }]
    });

    const tags = [1, 2];
    const result = await ListTicketsService({
      userId: "1",
      queueIds: [],
      tags: tags,
      users: [],
      companyId: 1
    });

    // Verify TicketTag.findAll was called ONCE
    // Current implementation calls it N times (2 times here)
    // Optimized implementation calls it 1 time
    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);
  });

  it("should optimize users filter to avoid extra queries when single user", async () => {
     (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
        count: 0,
        rows: []
     });

     await ListTicketsService({
        userId: "1",
        queueIds: [],
        tags: [],
        users: [1],
        companyId: 1
     });

     // Optimized implementation should NOT call Ticket.findAll at all
     expect(Ticket.findAll).toHaveBeenCalledTimes(0);

     const findAndCountAllArgs = (Ticket.findAndCountAll as jest.Mock).mock.calls[0][0];
     // verify userId: 1 is in where clause
     expect(findAndCountAllArgs.where).toHaveProperty("userId", 1);
  });
});
