import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Addons catalog table (admin-defined)
    await queryInterface.createTable("Addons", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      monthlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
      },
      oneTimePrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: null
      },
      billingType: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "monthly" // "monthly" | "one_time"
      },
      featureKey: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // 2. Company-Addon relationship (which companies have which addons)
    await queryInterface.createTable("CompanyAddons", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      addonId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Addons", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active" // "active" | "cancelled" | "pending"
      },
      stripeSubscriptionItemId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      activatedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      cancelledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });

    // Add balance field to Companies for credits/refunds
    await queryInterface.addColumn("Companies", "balance", {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0
    });

    // Unique constraint: one addon per company
    await queryInterface.addIndex("CompanyAddons", ["companyId", "addonId"], {
      unique: true,
      name: "company_addon_unique"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Companies", "balance");
    await queryInterface.dropTable("CompanyAddons");
    await queryInterface.dropTable("Addons");
  }
};
