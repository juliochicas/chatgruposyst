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
  BelongsTo,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "EmailConfigs" })
class EmailConfig extends Model<EmailConfig> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  apiKey: string;

  @AllowNull(false)
  @Column
  fromEmail: string;

  @AllowNull(false)
  @Column
  fromName: string;

  @Column
  replyTo: string;

  @Default(false)
  @Column
  isActive: boolean;

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

export default EmailConfig;
