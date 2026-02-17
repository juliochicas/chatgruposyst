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
  Default,
  DataType
} from "sequelize-typescript";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @Column
  users: number;

  @Column
  connections: number;

  @Column
  queues: number;

  @Column
  value: number;

  @Column
  description: string;

  @Default(true)
  @Column
  isPublic: boolean;

  @Default(false)
  @Column
  isFeatured: boolean;

  @Default(false)
  @Column
  isCustom: boolean;

  @Column(DataType.JSONB)
  features: string[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column
  useSchedules: boolean;

  @Column
  useCampaigns: boolean;

  @Column
  useInternalChat: boolean;

  @Column
  useExternalApi: boolean;

  @Column
  useKanban: boolean;

  @Column
  useOpenAi: boolean;

  @Column
  useIntegrations: boolean;
}

export default Plan;
