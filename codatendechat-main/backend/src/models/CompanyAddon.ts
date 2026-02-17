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
  ForeignKey,
  BelongsTo
} from "sequelize-typescript";
import Company from "./Company";
import Addon from "./Addon";

@Table({ tableName: "CompanyAddons" })
class CompanyAddon extends Model<CompanyAddon> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Addon)
  @Column
  addonId: number;

  @BelongsTo(() => Addon)
  addon: Addon;

  @AllowNull(false)
  @Default("active")
  @Column
  status: string; // "active" | "cancelled" | "pending"

  @AllowNull(true)
  @Column
  stripeSubscriptionItemId: string;

  @AllowNull(true)
  @Column
  activatedAt: Date;

  @AllowNull(true)
  @Column
  cancelledAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default CompanyAddon;
