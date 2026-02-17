import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "UltraMsgConfigs" })
class UltraMsgConfig extends Model<UltraMsgConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  instanceId: string;

  @Column
  token: string;

  @Default(false)
  @Column
  isActive: boolean;

  @Default("DISCONNECTED")
  @Column
  status: string;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default UltraMsgConfig;
