import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  DataType,
  ForeignKey,
  BelongsTo,
  HasMany,
  Default
} from "sequelize-typescript";

import Company from "./Company";
import Ticket from "./Ticket";
import Message from "./Message";

@Table
class Channel extends Model<Channel> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column
  type: string;

  @Column
  provider: string;

  @Default("active")
  @Column
  status: string;

  @Column
  externalId: string;

  @Column(DataType.TEXT)
  accessToken: string;

  @Column(DataType.TEXT)
  refreshToken: string;

  @Column(DataType.DATE)
  tokenExpiresAt: Date;

  @Column(DataType.JSONB)
  metadata: Record<string, unknown>;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => Message)
  messages: Message[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Channel;

