import Chat from "../../models/Chat";
import ChatUser from "../../models/ChatUser";
import User from "../../models/User";

interface Data {
  ownerId: number;
  companyId: number;
  users: any[];
  title: string;
}

const CreateService = async (data: Data): Promise<Chat> => {
  const { ownerId, companyId, users, title } = data;

  const record = await Chat.create({
    ownerId,
    companyId,
    title
  });

  if (Array.isArray(users) && users.length > 0) {
    const chatUsers = users.map(user => ({ chatId: record.id, userId: user.id }));
    chatUsers.unshift({ chatId: record.id, userId: ownerId });
    await ChatUser.bulkCreate(chatUsers);
  }

  await record.reload({
    include: [
      { model: ChatUser, as: "users", include: [{ model: User, as: "user" }] },
      { model: User, as: "owner" }
    ]
  });

  return record;
};

export default CreateService;
