import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Plans", "useOpenAi", {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    });
    await queryInterface.addColumn("Plans", "useIntegrations", {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "useOpenAi");
    await queryInterface.removeColumn("Plans", "useIntegrations");
  }
};
