import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("QueueIntegrations", "typebotSlug", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
    await queryInterface.addColumn("QueueIntegrations", "typebotExpires", {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0
    });
    await queryInterface.addColumn("QueueIntegrations", "typebotKeywordFinish", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
    await queryInterface.addColumn("QueueIntegrations", "typebotUnknownMessage", {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: ""
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("QueueIntegrations", "typebotSlug");
    await queryInterface.removeColumn("QueueIntegrations", "typebotExpires");
    await queryInterface.removeColumn("QueueIntegrations", "typebotKeywordFinish");
    await queryInterface.removeColumn("QueueIntegrations", "typebotUnknownMessage");
  }
};