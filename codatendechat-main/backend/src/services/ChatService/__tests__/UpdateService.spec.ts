import UpdateService from "../UpdateService";
import Chat from "../../../models/Chat";
import ChatUser from "../../../models/ChatUser";
import User from "../../../models/User";

jest.mock("../../../models/Chat");
jest.mock("../../../models/ChatUser");
jest.mock("../../../models/User");

describe("UpdateService", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should update chat users efficiently using bulkCreate", async () => {
    // Mock Chat.findByPk
    const mockUpdate = jest.fn();
    const mockReload = jest.fn();
    const mockRecord = {
      id: 1,
      ownerId: 99,
      update: mockUpdate,
      reload: mockReload
    };
    (Chat.findByPk as jest.Mock).mockResolvedValue(mockRecord);

    // Mock ChatUser.destroy
    (ChatUser.destroy as jest.Mock).mockResolvedValue(true);

    // Mock ChatUser.create
    (ChatUser.create as jest.Mock).mockResolvedValue({});

    // Mock ChatUser.bulkCreate
    (ChatUser.bulkCreate as jest.Mock).mockResolvedValue([]);

    // Create 100 users. One of them will be the owner (id 99).
    const users = Array.from({ length: 100 }, (_, i) => ({ id: i + 1 }));

    const chatData = {
      id: 1,
      title: "Test Chat",
      users: users
    };

    await UpdateService(chatData);

    // Verification
    expect(Chat.findByPk).toHaveBeenCalledWith(1, expect.objectContaining({ include: expect.anything() }));
    expect(mockRecord.update).toHaveBeenCalledWith({ title: "Test Chat" });
    expect(ChatUser.destroy).toHaveBeenCalledWith({ where: { chatId: 1 } });

    // Check bulkCreate call
    expect(ChatUser.bulkCreate).toHaveBeenCalledTimes(1);
    const bulkCreateArg = (ChatUser.bulkCreate as jest.Mock).mock.calls[0][0];

    // Expect 100 records (1 owner initial + 99 from loop)
    expect(bulkCreateArg).toHaveLength(100);

    // Check that owner is included (once)
    const ownerRecords = bulkCreateArg.filter((u: any) => u.userId === 99);
    expect(ownerRecords).toHaveLength(1);
    expect(ownerRecords[0]).toEqual({ chatId: 1, userId: 99 });

    // Check that other users are included
    const user1 = bulkCreateArg.find((u: any) => u.userId === 1);
    expect(user1).toEqual({ chatId: 1, userId: 1 });
  });
});
