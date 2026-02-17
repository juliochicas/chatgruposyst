import { Op } from "sequelize";
import ShopifyProduct from "../../models/ShopifyProduct";

interface ListProductsRequest {
  companyId: number;
  search?: string;
  category?: string;
  available?: boolean;
  page?: number;
  limit?: number;
}

interface ListProductsResponse {
  products: ShopifyProduct[];
  total: number;
  page: number;
  totalPages: number;
}

/**
 * List products with search, filter and pagination
 */
export const listProducts = async ({
  companyId,
  search,
  category,
  available,
  page = 1,
  limit = 20
}: ListProductsRequest): Promise<ListProductsResponse> => {
  const where: any = {
    companyId,
    status: "active"
  };

  if (search) {
    where[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { vendor: { [Op.iLike]: `%${search}%` } },
      { handle: { [Op.iLike]: `%${search}%` } }
    ];
  }

  if (category) {
    where.productType = { [Op.iLike]: `%${category}%` };
  }

  if (available === true) {
    where.totalInventory = { [Op.gt]: 0 };
  }

  const offset = (page - 1) * limit;

  const { count, rows } = await ShopifyProduct.findAndCountAll({
    where,
    limit,
    offset,
    order: [["title", "ASC"]]
  });

  return {
    products: rows,
    total: count,
    page,
    totalPages: Math.ceil(count / limit)
  };
};

/**
 * Get a single product by ID
 */
export const getProduct = async (
  productId: number,
  companyId: number
): Promise<ShopifyProduct | null> => {
  return ShopifyProduct.findOne({
    where: { id: productId, companyId }
  });
};

/**
 * Get a product by its Shopify handle
 */
export const getProductByHandle = async (
  handle: string,
  companyId: number
): Promise<ShopifyProduct | null> => {
  return ShopifyProduct.findOne({
    where: { handle, companyId, status: "active" }
  });
};

/**
 * Get product categories (distinct productType values)
 */
export const getCategories = async (
  companyId: number
): Promise<string[]> => {
  const products = await ShopifyProduct.findAll({
    where: {
      companyId,
      status: "active",
      productType: { [Op.not]: null, [Op.ne]: "" }
    },
    attributes: ["productType"],
    group: ["productType"]
  });

  return products.map(p => p.productType);
};
