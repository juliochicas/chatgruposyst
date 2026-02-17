import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";
import SupportMessage from "./SupportMessage";

@Table({ tableName: "SupportTickets" })
class SupportTicket extends Model<SupportTicket> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  subject: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Default("open")
  @Column
  status: string;

  @AllowNull(false)
  @Default("medium")
  @Column
  priority: string;

  @AllowNull(true)
  @Column
  category: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => User)
  @Column
  userId: number;

  @BelongsTo(() => User, "userId")
  user: User;

  @AllowNull(true)
  @ForeignKey(() => User)
  @Column
  assignedTo: number;

  @BelongsTo(() => User, "assignedTo")
  assignee: User;

  @AllowNull(true)
  @Column
  lastMessageAt: Date;

  @AllowNull(true)
  @Column
  resolvedAt: Date;

  @AllowNull(true)
  @Column
  rating: number;

  @HasMany(() => SupportMessage, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    hooks: true
  })
  messages: SupportMessage[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SupportTicket;
