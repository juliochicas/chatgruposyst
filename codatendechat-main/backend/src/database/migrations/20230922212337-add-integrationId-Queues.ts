import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Queues", "integrationId", {
      type: DataTypes.INTEGER,
      references: { model: "QueueIntegrations", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
    await queryInterface.addColumn("Whatsapps", "integrationId", {
      type: DataTypes.INTEGER,
      references: { model: "QueueIntegrations", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL"
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Queues", "integrationId");
    await queryInterface.removeColumn("Whatsapps", "integrationId");
  }
};