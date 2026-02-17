import ShopifyConnection from "../../models/ShopifyConnection";

interface Request {
  companyId: number;
}

const ListShopifyConnectionsService = async ({
  companyId
}: Request): Promise<ShopifyConnection[]> => {
  const connections = await ShopifyConnection.findAll({
    where: { companyId },
    order: [["shopDomain", "ASC"]]
  });

  return connections;
};

export default ListShopifyConnectionsService;
