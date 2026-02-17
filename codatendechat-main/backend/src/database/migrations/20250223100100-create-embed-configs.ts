import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("EmbedConfigs", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false,
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false,
        unique: true,
      },
      embedToken: {
        type: DataTypes.STRING(128),
        allowNull: false,
        unique: true,
      },
      allowedDomains: {
        type: DataTypes.TEXT,
        allowNull: true,
        comment: "Comma-separated list of allowed domains for iframe embedding",
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      primaryColor: {
        type: DataTypes.STRING(20),
        allowNull: true,
        defaultValue: "#2196f3",
      },
      title: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      welcomeMessage: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
      },
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("EmbedConfigs");
  },
};
