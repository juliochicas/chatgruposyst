import ListTicketsService from "../services/TicketServices/ListTicketsService";
import Ticket from "../models/Ticket";
import TicketTag from "../models/TicketTag";
import ShowUserService from "../services/UserServices/ShowUserService";
import { Op } from "sequelize";

// Mock the models
jest.mock("../models/Ticket");
jest.mock("../models/TicketTag");
jest.mock("../models/Contact");
jest.mock("../models/Message");
jest.mock("../models/Queue");
jest.mock("../models/User");
jest.mock("../models/Tag");
jest.mock("../models/Whatsapp");
jest.mock("../services/UserServices/ShowUserService");

describe("ListTicketsService N+1 Optimization", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should use Op.in for users filter wrapped in Op.and to avoid overwrite", async () => {
    // Mock implementations
    (Ticket.findAll as jest.Mock).mockResolvedValue([{ id: 1 }]);
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({ count: 0, rows: [] });

    const users = [101, 102, 103];

    await ListTicketsService({
      users,
      queueIds: [],
      tags: [],
      companyId: 1,
      userId: "1"
    });

    // Expect Ticket.findAll NOT to be called for user filtering
    expect(Ticket.findAll).not.toHaveBeenCalled();

    // Verify findAndCountAll is called with Op.and containing userId filter
    const callArgs = (Ticket.findAndCountAll as jest.Mock).mock.calls[0][0];
    const whereArg = callArgs.where;

    // Check if where condition uses Op.and to combine filters safely
    // Note: The implementation should wrap existing conditions and new condition in Op.and
    expect(whereArg[Op.and]).toBeDefined();

    // Verify the users filter is present inside Op.and array
    expect(whereArg[Op.and]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          userId: { [Op.in]: users }
        })
      ])
    );
  });
});
