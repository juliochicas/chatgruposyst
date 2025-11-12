import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Tickets", "channelId", {
      type: DataTypes.INTEGER,
      references: { model: "Channels", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("Tickets", "channelType", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Tickets", "channelExternalId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Messages", "channelId", {
      type: DataTypes.INTEGER,
      references: { model: "Channels", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("Messages", "channelType", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Messages", "channelExternalId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Messages", "metadata", {
      type: DataTypes.JSONB,
      allowNull: true
    });

    await queryInterface.addIndex("Tickets", ["channelId"]);
    await queryInterface.addIndex("Tickets", ["channelType"]);
    await queryInterface.addIndex("Messages", ["channelId"]);
    await queryInterface.addIndex("Messages", ["channelType"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeIndex("Tickets", ["channelId"]);
    await queryInterface.removeIndex("Tickets", ["channelType"]);
    await queryInterface.removeIndex("Messages", ["channelId"]);
    await queryInterface.removeIndex("Messages", ["channelType"]);

    await queryInterface.removeColumn("Messages", "metadata");
    await queryInterface.removeColumn("Messages", "channelExternalId");
    await queryInterface.removeColumn("Messages", "channelType");
    await queryInterface.removeColumn("Messages", "channelId");

    await queryInterface.removeColumn("Tickets", "channelExternalId");
    await queryInterface.removeColumn("Tickets", "channelType");
    await queryInterface.removeColumn("Tickets", "channelId");
  }
};

