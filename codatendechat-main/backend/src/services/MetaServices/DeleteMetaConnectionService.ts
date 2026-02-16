import MetaConnection from "../../models/MetaConnection";
import AppError from "../../errors/AppError";

const DeleteMetaConnectionService = async (
  id: string | number
): Promise<void> => {
  const metaConnection = await MetaConnection.findOne({
    where: { id }
  });

  if (!metaConnection) {
    throw new AppError("ERR_NO_META_CONNECTION_FOUND", 404);
  }

  await metaConnection.destroy();
};

export default DeleteMetaConnectionService;
