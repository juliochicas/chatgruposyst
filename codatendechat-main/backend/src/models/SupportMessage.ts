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
  BelongsTo
} from "sequelize-typescript";
import User from "./User";
import SupportTicket from "./SupportTicket";

@Table({ tableName: "SupportMessages" })
class SupportMessage extends Model<SupportMessage> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => SupportTicket)
  @Column
  ticketId: number;

  @BelongsTo(() => SupportTicket)
  ticket: SupportTicket;

  @ForeignKey(() => User)
  @Column
  senderId: number;

  @BelongsTo(() => User)
  sender: User;

  @AllowNull(false)
  @Column(DataType.TEXT)
  body: string;

  @AllowNull(false)
  @Default(false)
  @Column
  isInternal: boolean;

  @AllowNull(true)
  @Column
  attachmentUrl: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default SupportMessage;
