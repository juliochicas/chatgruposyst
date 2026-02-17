import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  AllowNull,
  Unique,
  Default,
} from "sequelize-typescript";
import Company from "./Company";

@Table
class EmbedConfig extends Model<EmbedConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Unique
  @Column
  companyId: number;

  @Unique
  @Column
  embedToken: string;

  @AllowNull(true)
  @Column
  allowedDomains: string;

  @Default(true)
  @Column
  isActive: boolean;

  @AllowNull(true)
  @Default("#2196f3")
  @Column
  primaryColor: string;

  @AllowNull(true)
  @Column
  title: string;

  @AllowNull(true)
  @Column
  welcomeMessage: string;

  @BelongsTo(() => Company)
  company: Company;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EmbedConfig;
