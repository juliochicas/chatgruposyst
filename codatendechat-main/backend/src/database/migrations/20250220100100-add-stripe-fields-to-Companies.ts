import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Companies", "stripeCustomerId", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
    await queryInterface.addColumn("Companies", "stripeSubscriptionId", {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: null
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Companies", "stripeCustomerId");
    await queryInterface.removeColumn("Companies", "stripeSubscriptionId");
  }
};
