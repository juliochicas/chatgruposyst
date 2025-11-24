import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Unique,
  BelongsToMany,
  BelongsTo,
  ForeignKey,
  HasMany,
  DataType,
  Default
} from "sequelize-typescript";
import User from "./User";
import UserQueue from "./UserQueue";
import Company from "./Company";

import Whatsapp from "./Whatsapp";
import WhatsappQueue from "./WhatsappQueue";
import QueueOption from "./QueueOption";
import Prompt from "./Prompt";
import QueueIntegrations from "./QueueIntegrations";

@Table
class Queue extends Model<Queue> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  color: string;

  @Default("")
  @Column(DataType.STRING)
  greetingMessage: string;

  @Default("")
  @Column(DataType.STRING)
  outOfHoursMessage: string;

  @Column({
    type: DataType.JSONB
  })
  schedules: [];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsToMany(() => Whatsapp, () => WhatsappQueue)
  whatsapps: Array<Whatsapp & { WhatsappQueue: WhatsappQueue }>;

  @BelongsToMany(() => User, () => UserQueue)
  users: Array<User & { UserQueue: UserQueue }>;

  @HasMany(() => QueueOption, {
    onDelete: "DELETE",
    onUpdate: "DELETE",
    hooks: true
  })
  options: QueueOption[];

  @Column(DataType.INTEGER)
  orderQueue: number;

  
  @ForeignKey(() => QueueIntegrations)
  @Column(DataType.INTEGER)
  integrationId: number;

  @BelongsTo(() => QueueIntegrations)
  queueIntegrations: QueueIntegrations;

  @ForeignKey(() => Prompt)
  @Column(DataType.INTEGER)
  promptId: number;

  @BelongsTo(() => Prompt)
  prompt: Prompt;
}

export default Queue;
