import ListTicketsService from "../ListTicketsService";
import Ticket from "../../../models/Ticket";
import TicketTag from "../../../models/TicketTag";
import { Op } from "sequelize";

// Mock dependencies
jest.mock("../../../models/Ticket");
jest.mock("../../../models/TicketTag");
jest.mock("../../../models/Contact");
jest.mock("../../../models/Message");
jest.mock("../../../models/Queue");
jest.mock("../../../models/User");
jest.mock("../../../services/UserServices/ShowUserService");
jest.mock("../../../models/Tag");
jest.mock("../../../models/Whatsapp");

describe("ListTicketsService", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should use optimized query for tags filter and handle duplicates", async () => {
    // Setup mocks
    (TicketTag.findAll as jest.Mock).mockResolvedValue([
      { ticketId: 1 },
      { ticketId: 2 }
    ]);

    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 2,
      rows: []
    });

    const tags = [1, 2, 2];
    const uniqueTags = [1, 2];

    await ListTicketsService({
      companyId: 1,
      userId: "1",
      queueIds: [],
      tags: tags,
      users: [],
      pageNumber: "1"
    });

    // In the optimized version, it should be called once.
    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);

    // Check for optimized query structure and deduplication
    expect(TicketTag.findAll).toHaveBeenCalledWith(expect.objectContaining({
      where: { tagId: { [Op.in]: uniqueTags } },
      group: ["ticketId"]
    }));
  });
});
