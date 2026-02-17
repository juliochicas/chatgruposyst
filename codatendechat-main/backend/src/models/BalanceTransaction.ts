import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  AllowNull,
  Default,
  DataType,
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import User from "./User";

@Table({ tableName: "BalanceTransactions" })
class BalanceTransaction extends Model<BalanceTransaction> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @AllowNull(false)
  @Column
  type: string; // "credit" | "debit" | "refund" | "adjustment"

  @AllowNull(false)
  @Column(DataType.DECIMAL(10, 2))
  amount: number;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(true)
  @Column
  stripeRefundId: string;

  @AllowNull(true)
  @Column
  stripePaymentIntentId: string;

  @ForeignKey(() => User)
  @AllowNull(true)
  @Column
  performedBy: number;

  @BelongsTo(() => User)
  performer: User;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  balanceAfter: number;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default BalanceTransaction;
