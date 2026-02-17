import ShopifyConnection from "../../models/ShopifyConnection";
import AppError from "../../errors/AppError";

const ShowShopifyConnectionService = async (
  id: string | number,
  companyId: number
): Promise<ShopifyConnection> => {
  const connection = await ShopifyConnection.findOne({
    where: { id, companyId }
  });

  if (!connection) {
    throw new AppError("ERR_SHOPIFY_CONNECTION_NOT_FOUND", 404);
  }

  return connection;
};

export default ShowShopifyConnectionService;
