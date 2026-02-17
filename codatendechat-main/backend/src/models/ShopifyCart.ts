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
import Ticket from "./Ticket";
import Contact from "./Contact";
import ShopifyConnection from "./ShopifyConnection";
import Company from "./Company";

@Table
class ShopifyCart extends Model<ShopifyCart> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Ticket)
  @AllowNull
  @Column
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @AllowNull
  @Column
  contactId: number;

  @BelongsTo(() => Contact)
  contact: Contact;

  @Default([])
  @Column(DataType.JSONB)
  items: object[];

  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  subtotal: number;

  @Default("USD")
  @Column(DataType.STRING)
  currency: string;

  @Default("active")
  @Column(DataType.STRING)
  status: string;

  @AllowNull
  @Column(DataType.TEXT)
  checkoutUrl: string;

  @AllowNull
  @Column(DataType.STRING)
  shopifyOrderId: string;

  @AllowNull
  @Column(DataType.STRING)
  shopifyOrderNumber: string;

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

export default ShopifyCart;
