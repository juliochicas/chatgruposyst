import ShopifyConnection from "../../models/ShopifyConnection";
import ShopifyProduct from "../../models/ShopifyProduct";
import ShopifyCart from "../../models/ShopifyCart";
import AppError from "../../errors/AppError";

const DeleteShopifyConnectionService = async (
  id: string | number
): Promise<void> => {
  const connection = await ShopifyConnection.findByPk(+id);

  if (!connection) {
    throw new AppError("ERR_SHOPIFY_CONNECTION_NOT_FOUND", 404);
  }

  // Clean up associated data
  await ShopifyProduct.destroy({
    where: { shopifyConnectionId: connection.id }
  });

  await ShopifyCart.destroy({
    where: { shopifyConnectionId: connection.id }
  });

  await connection.destroy();
};

export default DeleteShopifyConnectionService;
