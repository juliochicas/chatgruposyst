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
  BelongsToMany,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Queue from "./Queue";
import Ticket from "./Ticket";
import MetaConnectionQueue from "./MetaConnectionQueue";
import Company from "./Company";
import Prompt from "./Prompt";
import QueueIntegrations from "./QueueIntegrations";

@Table
class MetaConnection extends Model<MetaConnection> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @Default("facebook")
  @Column(DataType.STRING)
  channel: string; // "facebook" | "instagram" | "threads"

  @Default("DISCONNECTED")
  @Column
  status: string;

  @Default(false)
  @AllowNull
  @Column
  isDefault: boolean;

  // Meta OAuth tokens
  @AllowNull
  @Column(DataType.TEXT)
  accessToken: string;

  @AllowNull
  @Column(DataType.TEXT)
  refreshToken: string;

  @AllowNull
  @Column(DataType.DATE)
  tokenExpiresAt: Date;

  // Facebook Page info
  @AllowNull
  @Column(DataType.STRING)
  pageId: string;

  @AllowNull
  @Column(DataType.STRING)
  pageName: string;

  @AllowNull
  @Column(DataType.TEXT)
  pageAccessToken: string;

  // Instagram Business Account info
  @AllowNull
  @Column(DataType.STRING)
  instagramAccountId: string;

  @AllowNull
  @Column(DataType.STRING)
  instagramUsername: string;

  // Webhook verification
  @AllowNull
  @Column(DataType.STRING)
  webhookVerifyToken: string;

  // Threads Account info
  @AllowNull
  @Column(DataType.STRING)
  threadsUserId: string;

  @AllowNull
  @Column(DataType.STRING)
  threadsUsername: string;

  @AllowNull
  @Column(DataType.TEXT)
  threadsAccessToken: string;

  // Bot messages (same pattern as WhatsApp)
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

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @BelongsToMany(() => Queue, () => MetaConnectionQueue)
  queues: Array<Queue & { MetaConnectionQueue: MetaConnectionQueue }>;

  @HasMany(() => MetaConnectionQueue)
  metaConnectionQueues: MetaConnectionQueue[];

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

  @ForeignKey(() => QueueIntegrations)
  @Column
  integrationId: number;

  @BelongsTo(() => QueueIntegrations)
  queueIntegrations: QueueIntegrations;
}

export default MetaConnection;
