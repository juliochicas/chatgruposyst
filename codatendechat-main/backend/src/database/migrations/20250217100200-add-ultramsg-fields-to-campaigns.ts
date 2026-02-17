import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Campaigns", "sendVia", {
      type: DataTypes.STRING,
      defaultValue: "baileys",
      allowNull: false
    });

    await queryInterface.addColumn("Campaigns", "useAIVariation", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn("Campaigns", "aiPromptId", {
      type: DataTypes.INTEGER,
      references: { model: "Prompts", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("Campaigns", "contactSource", {
      type: DataTypes.STRING,
      defaultValue: "list",
      allowNull: false
    });

    await queryInterface.addColumn("Campaigns", "activeDaysFilter", {
      type: DataTypes.INTEGER,
      defaultValue: 30,
      allowNull: true
    });

    await queryInterface.addColumn("Campaigns", "dailyLimit", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    });

    await queryInterface.addColumn("Campaigns", "sendOnlyBusinessHours", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });

    await queryInterface.addColumn("Campaigns", "pauseAfterMessages", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    });

    await queryInterface.addColumn("Campaigns", "pauseDuration", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Campaigns", "sendVia");
    await queryInterface.removeColumn("Campaigns", "useAIVariation");
    await queryInterface.removeColumn("Campaigns", "aiPromptId");
    await queryInterface.removeColumn("Campaigns", "contactSource");
    await queryInterface.removeColumn("Campaigns", "activeDaysFilter");
    await queryInterface.removeColumn("Campaigns", "dailyLimit");
    await queryInterface.removeColumn("Campaigns", "sendOnlyBusinessHours");
    await queryInterface.removeColumn("Campaigns", "pauseAfterMessages");
    await queryInterface.removeColumn("Campaigns", "pauseDuration");
  }
};
