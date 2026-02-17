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
  DataType,
  HasMany
} from "sequelize-typescript";
import CompanyAddon from "./CompanyAddon";

@Table({ tableName: "Addons" })
class Addon extends Model<Addon> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Unique
  @Column
  name: string;

  @AllowNull(true)
  @Column(DataType.TEXT)
  description: string;

  @AllowNull(false)
  @Default(0)
  @Column(DataType.DECIMAL(10, 2))
  monthlyPrice: number;

  @AllowNull(true)
  @Column(DataType.DECIMAL(10, 2))
  oneTimePrice: number;

  @AllowNull(false)
  @Default("monthly")
  @Column
  billingType: string; // "monthly" | "one_time"

  @AllowNull(false)
  @Unique
  @Column
  featureKey: string;

  @AllowNull(false)
  @Default(true)
  @Column
  isActive: boolean;

  @HasMany(() => CompanyAddon, {
    onUpdate: "CASCADE",
    onDelete: "CASCADE",
    hooks: true
  })
  companyAddons: CompanyAddon[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Addon;
