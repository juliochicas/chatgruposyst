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
  HasMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import Prompt from "./Prompt";
import ShopifyProduct from "./ShopifyProduct";
import ShopifyCart from "./ShopifyCart";

@Table
class ShopifyConnection extends Model<ShopifyConnection> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  shopDomain: string;

  @AllowNull
  @Column(DataType.TEXT)
  accessToken: string;

  @AllowNull
  @Column(DataType.STRING)
  shopName: string;

  @AllowNull
  @Column(DataType.STRING)
  shopEmail: string;

  @Default("USD")
  @Column(DataType.STRING)
  currency: string;

  @Default("disconnected")
  @Column(DataType.STRING)
  status: string;

  @AllowNull
  @Column(DataType.DATE)
  lastSyncAt: Date;

  @AllowNull
  @Column(DataType.STRING)
  webhookSecret: string;

  @AllowNull
  @Column(DataType.TEXT)
  storefrontAccessToken: string;

  @Default(true)
  @Column
  syncProducts: boolean;

  @Default(true)
  @Column
  syncOrders: boolean;

  // Bot messages (same pattern as Meta/WhatsApp)
  @Default("")
  @Column(DataType.TEXT)
  greetingMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  complationMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  outOfHoursMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  ratingMessage: string;

  // Queue/Bot config
  @Column
  transferQueueId: number;

  @Column
  timeToTransfer: number;

  @Default(3)
  @Column
  maxUseBotQueues: number;

  @Default(0)
  @Column
  expiresTicket: number;

  @Default("")
  @Column(DataType.TEXT)
  expiresInactiveMessage: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @HasMany(() => ShopifyProduct)
  products: ShopifyProduct[];

  @HasMany(() => ShopifyCart)
  carts: ShopifyCart[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;
}

export default ShopifyConnection;
