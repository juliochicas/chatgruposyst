import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  AutoIncrement,
  Default,
  AllowNull,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import ShopifyConnection from "./ShopifyConnection";
import Company from "./Company";

@Table
class ShopifyProduct extends Model<ShopifyProduct> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  shopifyProductId: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  title: string;

  @AllowNull
  @Column(DataType.TEXT)
  description: string;

  @AllowNull
  @Column(DataType.STRING)
  handle: string;

  @AllowNull
  @Column(DataType.STRING)
  vendor: string;

  @AllowNull
  @Column(DataType.STRING)
  productType: string;

  @Default([])
  @Column(DataType.JSONB)
  tags: string[];

  @AllowNull
  @Column(DataType.TEXT)
  imageUrl: string;

  @Default([])
  @Column(DataType.JSONB)
  images: object[];

  @AllowNull
  @Column(DataType.DECIMAL(10, 2))
  priceMin: number;

  @AllowNull
  @Column(DataType.DECIMAL(10, 2))
  priceMax: number;

  @AllowNull
  @Column(DataType.STRING)
  currency: string;

  @Default([])
  @Column(DataType.JSONB)
  variants: object[];

  @Default("active")
  @Column(DataType.STRING)
  status: string;

  @Default(0)
  @Column
  totalInventory: number;

  @AllowNull
  @Column(DataType.TEXT)
  productUrl: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => ShopifyConnection)
  @Column
  shopifyConnectionId: number;

  @BelongsTo(() => ShopifyConnection)
  shopifyConnection: ShopifyConnection;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;
}

export default ShopifyProduct;
