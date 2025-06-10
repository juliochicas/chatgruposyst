// Archivo: backend/src/models/Channel.ts
// Este archivo reemplaza completamente a Whatsapp.ts

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
  Unique,
  BelongsToMany,
  HasMany,
  BelongsTo,
  ForeignKey,
  AfterUpdate,
  AfterCreate
} from "sequelize-typescript";
import { Op } from "sequelize";
import Queue from "./Queue";
import Ticket from "./Ticket";
import QueueChannel from "./QueueChannel";
import Company from "./Company";

export enum ChannelType {
  WHATSAPP = "whatsapp",
  INSTAGRAM = "instagram",
  FACEBOOK = "facebook"
}

@Table
class Channel extends Model<Channel> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Default(ChannelType.WHATSAPP)
  @Column(DataType.ENUM(...Object.values(ChannelType)))
  type: ChannelType;

  @Column(DataType.STRING)
  session: string;

  @Column(DataType.TEXT)
  qrcode: string;

  @Column(DataType.STRING)
  status: string;

  @Column(DataType.STRING)
  number: string;

  @Column(DataType.STRING)
  profilePicUrl: string;

  @Default(false)
  @AllowNull(false)
  @Column(DataType.BOOLEAN)
  isDefault: boolean;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @Column(DataType.STRING)
  token: string;

  @Default(0)
  @Column(DataType.INTEGER)
  retries: number;

  @Column(DataType.STRING)
  urlMessageStatus: string;

  @Default("")
  @Column(DataType.TEXT)
  greetingMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  farewellMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  rejectCallMessage: string;

  @Default("")
  @Column(DataType.TEXT)
  color: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  groupAsTicket: boolean;

  // Campos específicos para Facebook
  @Column(DataType.STRING)
  facebookPageId: string;

  @Column(DataType.TEXT)
  facebookPageToken: string;

  // Campos específicos para Instagram
  @Column(DataType.STRING)
  instagramBusinessId: string;

  @Column(DataType.TEXT)
  instagramToken: string;

  // Token de verificación para webhooks de Meta
  @Column(DataType.STRING)
  webhookVerifyToken: string;

  // Configuraciones específicas del canal
  @Default({})
  @Column(DataType.JSONB)
  channelConfig: any;

  @BelongsTo(() => Company)
  company: Company;

  @BelongsToMany(() => Queue, () => QueueChannel)
  queues: Array<Queue & { QueueChannel: QueueChannel }>;

  @HasMany(() => Ticket)
  tickets: Ticket[];

  @HasMany(() => QueueChannel)
  queueChannels: QueueChannel[];

  @AfterUpdate
  @AfterCreate
  static async updateDefault(instance: Channel) {
    if (instance.isDefault) {
      await Channel.update(
        { isDefault: false },
        {
          where: {
            id: { [Op.not]: instance.id },
            companyId: instance.companyId,
            type: instance.type
          }
        }
      );
    }
  }

  getAuthToken(): string {
    switch (this.type) {
      case ChannelType.FACEBOOK:
        return this.facebookPageToken;
      case ChannelType.INSTAGRAM:
        return this.instagramToken;
      case ChannelType.WHATSAPP:
        return this.token;
      default:
        return this.token;
    }
  }

  getChannelIdentifier(): string {
    switch (this.type) {
      case ChannelType.FACEBOOK:
        return this.facebookPageId;
      case ChannelType.INSTAGRAM:
        return this.instagramBusinessId;
      case ChannelType.WHATSAPP:
        return this.number;
      default:
        return this.id.toString();
    }
  }
}

export default Channel;
