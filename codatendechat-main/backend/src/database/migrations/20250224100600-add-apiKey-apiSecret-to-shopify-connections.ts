import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("ShopifyConnections", "apiKey", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("ShopifyConnections", "apiSecret", {
      type: DataTypes.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("ShopifyConnections", "apiKey");
    await queryInterface.removeColumn("ShopifyConnections", "apiSecret");
  }
};
