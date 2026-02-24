import { Op } from "sequelize";
import ListTicketsService from "../ListTicketsService";
import Ticket from "../../../models/Ticket";
import TicketTag from "../../../models/TicketTag";
import ShowUserService from "../../UserServices/ShowUserService";

jest.mock("../../../models/Ticket");
jest.mock("../../../models/TicketTag");
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

  it("should use optimized subquery instead of loop when filtering by multiple tags", async () => {
    const tags = [1, 2, 3];
    const companyId = 1;
    const userId = "user-id";

    // Mock Ticket.findAndCountAll
    (Ticket.findAndCountAll as jest.Mock).mockResolvedValue({
      count: 0,
      rows: []
    });

    // Mock ShowUserService
    (ShowUserService as jest.Mock).mockResolvedValue({ queues: [] });

    await ListTicketsService({
      tags,
      companyId,
      userId,
      queueIds: [],
      users: []
    });

    // Verify optimization: TicketTag.findAll should NOT be called
    expect(TicketTag.findAll).not.toHaveBeenCalled();

    // Verify Ticket.findAndCountAll was called
    expect(Ticket.findAndCountAll).toHaveBeenCalled();

    // Check if the where clause contains the literal subquery
    // Since literal returns a complex object, we check that 'id' in where clause is present
    // and distinct from the previous array intersection logic
    const callArgs = (Ticket.findAndCountAll as jest.Mock).mock.calls[0][0];
    const whereClause = callArgs.where;

    // The id condition should be present and be a literal (which is an object in Sequelize)
    expect(whereClause).toHaveProperty("id");
    const idCondition = whereClause.id;

    // Verify it's an [Op.in] with a literal object
    // Depending on Sequelize version, literal might be string or object.
    // In strict mode, we just verify it's not an array of numbers (which was the old behavior)
    // The old behavior was [Op.in]: [100, 101] (result of intersection)
    // The new behavior is [Op.in]: Literal { val: '...' }

    expect(idCondition[Op.in]).toBeDefined();
    expect(Array.isArray(idCondition[Op.in])).toBe(false);
  });
});
