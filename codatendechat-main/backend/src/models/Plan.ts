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
  DataType
} from "sequelize-typescript";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @AllowNull(false)
  @Unique
  @Column(DataType.STRING)
  name: string;

  @Column(DataType.INTEGER)
  users: number;

  @Column(DataType.INTEGER)
  connections: number;

  @Column(DataType.INTEGER)
  queues: number;

  @Column(DataType.INTEGER)
  value: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @Column(DataType.BOOLEAN)
  useSchedules: boolean;   

  @Column(DataType.BOOLEAN)
  useCampaigns: boolean; 
  
  @Column(DataType.BOOLEAN)
  useInternalChat: boolean;   
  
  @Column(DataType.BOOLEAN)
  useExternalApi: boolean;   
  
  @Column(DataType.BOOLEAN)
  useKanban: boolean;

  @Column(DataType.BOOLEAN)
  useOpenAi: boolean;

  @Column(DataType.BOOLEAN)
  useIntegrations: boolean;
}

export default Plan;
