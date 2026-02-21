import ListTicketsService from "../../../services/TicketServices/ListTicketsService";
import Ticket from "../../../models/Ticket";
import TicketTag from "../../../models/TicketTag";

// Mock the models
jest.mock("../../../models/Ticket");
jest.mock("../../../models/TicketTag");
jest.mock("../../../models/Contact");
jest.mock("../../../models/Message");
jest.mock("../../../models/Queue");
jest.mock("../../../models/User");
jest.mock("../../../models/Tag");
jest.mock("../../../models/Whatsapp");
jest.mock("../../../services/UserServices/ShowUserService");

describe("ListTicketsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should call TicketTag.findAll ONLY ONCE when multiple tags are provided", async () => {
    const mockTags = [1, 2];

    // Mock TicketTag.findAll to return dummy ticket tags (grouped result)
    (TicketTag.findAll as jest.Mock).mockResolvedValue([{ ticketId: 100 }]);

    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      tags: mockTags,
      pageNumber: "1",
      queueIds: [],
      users: []
    });

    // Expect TicketTag.findAll to be called ONCE
    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);
  });

  it("should NOT call Ticket.findAll when multiple users are provided (fast fail)", async () => {
    const mockUsers = [1, 2];

    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      tags: [],
      pageNumber: "1",
      queueIds: [],
      users: mockUsers
    });

    // Expect Ticket.findAll to NOT be called
    expect(Ticket.findAll).not.toHaveBeenCalled();

    // Expect findAndCountAll to be called with id: -1 in where clause
    expect(Ticket.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: -1
        })
      })
    );
  });

  it("should filter by userId directly when ONE user is provided", async () => {
    const mockUsers = [1];

    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      tags: [],
      pageNumber: "1",
      queueIds: [],
      users: mockUsers
    });

    // Expect Ticket.findAll to NOT be called
    expect(Ticket.findAll).not.toHaveBeenCalled();

    // Expect findAndCountAll to be called with userId: 1 in where clause
    expect(Ticket.findAndCountAll).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 1
        })
      })
    );
  });

  it("should handle duplicate tags by treating them as unique", async () => {
    const mockTags = [1, 1, 2];

    (TicketTag.findAll as jest.Mock).mockResolvedValue([{ ticketId: 100 }]);

    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      tags: mockTags,
      pageNumber: "1",
      queueIds: [],
      users: []
    });

    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);
  });
});
