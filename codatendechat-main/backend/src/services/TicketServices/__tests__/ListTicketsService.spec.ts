
import ListTicketsService from "../ListTicketsService";
import TicketTag from "../../../models/TicketTag";
import Ticket from "../../../models/Ticket";
import ShowUserService from "../../UserServices/ShowUserService";
import { Op } from "sequelize";

// Mock dependencies
jest.mock("../../../models/Ticket");
jest.mock("../../../models/Contact");
jest.mock("../../../models/Message");
jest.mock("../../../models/Queue");
jest.mock("../../../models/User");
jest.mock("../../UserServices/ShowUserService");
jest.mock("../../../models/Tag");
jest.mock("../../../models/TicketTag");
jest.mock("../../../models/Whatsapp");

describe("ListTicketsService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should use optimized query when filtering by tags", async () => {
    // Arrange
    const tags = [1, 2];
    const mockTicketIds = [{ ticketId: 100 }, { ticketId: 101 }];

    (TicketTag.findAll as jest.Mock).mockResolvedValue(mockTicketIds);
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({ count: 2, rows: [] });

    // Act
    await ListTicketsService({
      userId: "1",
      companyId: 1,
      queueIds: [],
      tags: tags,
      users: []
    });

    // Assert
    expect(TicketTag.findAll).toHaveBeenCalledTimes(1);
    expect(TicketTag.findAll).toHaveBeenCalledWith(expect.objectContaining({
      attributes: ["ticketId"],
      where: {
        tagId: { [Op.in]: tags }
      },
      group: ["ticketId"]
    }));
  });
});
