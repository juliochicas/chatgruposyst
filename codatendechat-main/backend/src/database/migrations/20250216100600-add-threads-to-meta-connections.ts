import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("MetaConnections", "threadsUserId", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("MetaConnections", "threadsUsername", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("MetaConnections", "threadsAccessToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("MetaConnections", "threadsUserId");
    await queryInterface.removeColumn("MetaConnections", "threadsUsername");
    await queryInterface.removeColumn("MetaConnections", "threadsAccessToken");
  }
};
