// Archivo: backend/src/models/QueueChannel.ts
// Este archivo reemplaza a QueueWhatsapp.ts

import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Queue from "./Queue";
import Channel from "./Channel";
import Company from "./Company";

@Table({
  tableName: "QueueChannels"
})
class QueueChannel extends Model<QueueChannel> {
  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @ForeignKey(() => Channel)
  @Column
  channelId: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @BelongsTo(() => Queue)
  queue: Queue;

  @BelongsTo(() => Channel)
  channel: Channel;
}

export default QueueChannel;
