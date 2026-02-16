import AppError from "../../errors/AppError";
import MetaConnection from "../../models/MetaConnection";
import Queue from "../../models/Queue";

const ShowMetaConnectionService = async (
  id: string | number,
  companyId: number
): Promise<MetaConnection> => {
  const metaConnection = await MetaConnection.findOne({
    where: { id, companyId },
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color"]
      }
    ]
  });

  if (!metaConnection) {
    throw new AppError("ERR_NO_META_CONNECTION_FOUND", 404);
  }

  return metaConnection;
};

export default ShowMetaConnectionService;
