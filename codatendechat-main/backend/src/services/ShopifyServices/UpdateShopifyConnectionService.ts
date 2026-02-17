import ShopifyConnection from "../../models/ShopifyConnection";
import AppError from "../../errors/AppError";

interface Request {
  connectionData: any;
  connectionId: string | number;
  companyId: number;
}

const UpdateShopifyConnectionService = async ({
  connectionData,
  connectionId,
  companyId
}: Request): Promise<ShopifyConnection> => {
  const connection = await ShopifyConnection.findOne({
    where: { id: connectionId, companyId }
  });

  if (!connection) {
    throw new AppError("ERR_SHOPIFY_CONNECTION_NOT_FOUND", 404);
  }

  await connection.update(connectionData);

  return connection;
};

export default UpdateShopifyConnectionService;
