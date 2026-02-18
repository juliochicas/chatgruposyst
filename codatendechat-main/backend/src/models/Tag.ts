import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  BelongsToMany,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import Ticket from "./Ticket";
import TicketTag from "./TicketTag";
import Prompt from "./Prompt";
import ShopifyConnection from "./ShopifyConnection";

@Table
class Tag extends Model<Tag> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  color: string;

  @HasMany(() => TicketTag)
  ticketTags: TicketTag[];

  @BelongsToMany(() => Ticket, () => TicketTag)
  tickets: Ticket[];

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Tag)
  @Column
  parentId: number;

  @BelongsTo(() => Tag, "parentId")
  parent: Tag;

  @HasMany(() => Tag, "parentId")
  children: Tag[];

  @ForeignKey(() => Prompt)
  @Column
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;

  @ForeignKey(() => ShopifyConnection)
  @Column
  shopifyConnectionId: number;

  @BelongsTo(() => ShopifyConnection)
  shopifyConnection: ShopifyConnection;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  kanban: number;
}

export default Tag;
