import {
  AllowNull,
  AutoIncrement,
  BelongsTo,
  Column,
  CreatedAt,
  ForeignKey,
  Model,
  PrimaryKey,
  Table,
  UpdatedAt,
  DataType
} from "sequelize-typescript";
import Queue from "./Queue";
import Company from "./Company";

@Table
class Prompt extends Model<Prompt> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @AllowNull(false)
  @Column(DataType.STRING)
  name: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  prompt: string;

  @AllowNull(false)
  @Column(DataType.STRING)
  apiKey: string;

  @Column({ defaultValue: 10, type: DataType.INTEGER })
  maxMessages: number;

  @Column({ defaultValue: 100, type: DataType.INTEGER })
  maxTokens: number;

  @Column({ defaultValue: 1, type: DataType.INTEGER })
  temperature: number;

  @Column({ defaultValue: 0, type: DataType.INTEGER })
  promptTokens: number;

  @Column({ defaultValue: 0, type: DataType.INTEGER })
  completionTokens: number;

  @Column({ defaultValue: 0, type: DataType.INTEGER })
  totalTokens: number;

  @Column(DataType.STRING)
  model: string;

  @AllowNull
  @ForeignKey(() => Queue)
  @Column(DataType.INTEGER)
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Prompt;
