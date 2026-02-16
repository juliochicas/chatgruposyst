import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  ForeignKey,
  BelongsTo,
  PrimaryKey,
  AutoIncrement
} from "sequelize-typescript";
import MetaConnection from "./MetaConnection";
import Queue from "./Queue";

@Table
class MetaConnectionQueue extends Model<MetaConnectionQueue> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => MetaConnection)
  @Column
  metaConnectionId: number;

  @BelongsTo(() => MetaConnection)
  metaConnection: MetaConnection;

  @ForeignKey(() => Queue)
  @Column
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default MetaConnectionQueue;
