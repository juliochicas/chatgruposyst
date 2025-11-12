import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("Channels", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      provider: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "active"
      },
      externalId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      tokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
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
    await queryInterface.addIndex("Channels", ["companyId", "type"]);
    await queryInterface.addIndex("Channels", ["companyId", "name"], {
      unique: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Channels", ["companyId", "type"]);
    await queryInterface.removeIndex("Channels", ["companyId", "name"]);
    await queryInterface.dropTable("Channels");
  }
};

