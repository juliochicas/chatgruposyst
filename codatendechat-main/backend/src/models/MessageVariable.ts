import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  ForeignKey,
  BelongsTo,
  Default,
} from "sequelize-typescript";
import Company from "./Company";

@Table({ tableName: "MessageVariables" })
class MessageVariable extends Model<MessageVariable> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  key: string;

  @AllowNull(false)
  @Column
  label: string;

  @Default("")
  @Column
  value: string;

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

export default MessageVariable;
