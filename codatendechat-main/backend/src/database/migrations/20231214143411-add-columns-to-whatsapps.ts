import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Whatsapps", "maxUseBotQueues", {
      type: DataTypes.INTEGER,
      defaultValue: 3,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "expiresTicket", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "expiresInactiveMessage", {
      type: DataTypes.STRING,
      defaultValue: "",
      allowNull: true
    });
    await queryInterface.addColumn("Whatsapps", "timeUseBotQueues", {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Whatsapps", "maxUseBotQueues");
    await queryInterface.removeColumn("Whatsapps", "expiresTicket");
    await queryInterface.removeColumn("Whatsapps", "expiresInactiveMessage");
    await queryInterface.removeColumn("Whatsapps", "timeUseBotQueues");
  }
};