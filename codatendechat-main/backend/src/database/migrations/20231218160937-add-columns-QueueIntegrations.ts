import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("QueueIntegrations", "typebotKeywordRestart", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
    await queryInterface.addColumn("QueueIntegrations", "typebotRestartMessage", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("QueueIntegrations", "typebotKeywordRestart");
    await queryInterface.removeColumn("QueueIntegrations", "typebotRestartMessage");
  }
};