import MetaConnection from "../../models/MetaConnection";
import Queue from "../../models/Queue";

interface Request {
  companyId: number;
}

const ListMetaConnectionsService = async ({
  companyId
}: Request): Promise<MetaConnection[]> => {
  const metaConnections = await MetaConnection.findAll({
    where: { companyId },
    include: [
      {
        model: Queue,
        as: "queues",
        attributes: ["id", "name", "color"]
      }
    ],
    order: [["name", "ASC"]]
  });

  return metaConnections;
};

export default ListMetaConnectionsService;
