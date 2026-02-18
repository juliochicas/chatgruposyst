import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.addColumn("Tags", "promptId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: { model: "Prompts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }),
      queryInterface.addColumn("Tags", "shopifyConnectionId", {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: { model: "ShopifyConnections", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
      }),
    ]);
  },

  down: (queryInterface: QueryInterface) => {
    return Promise.all([
      queryInterface.removeColumn("Tags", "promptId"),
      queryInterface.removeColumn("Tags", "shopifyConnectionId"),
    ]);
  },
};
