import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("ShopifyConnections", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      shopDomain: {
        type: DataTypes.STRING,
        allowNull: false
      },
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      shopName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shopEmail: {
        type: DataTypes.STRING,
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: "USD"
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "disconnected"
      },
      lastSyncAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      webhookSecret: {
        type: DataTypes.STRING,
        allowNull: true
      },
      storefrontAccessToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      syncProducts: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      syncOrders: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      // Bot messages (same pattern as Meta/WhatsApp)
      greetingMessage: {
        type: DataTypes.TEXT,
        defaultValue: ""
      },
      farewellMessage: {
        type: DataTypes.TEXT,
        defaultValue: ""
      },
      complationMessage: {
        type: DataTypes.TEXT,
        defaultValue: ""
      },
      outOfHoursMessage: {
        type: DataTypes.TEXT,
        defaultValue: ""
      },
      ratingMessage: {
        type: DataTypes.TEXT,
        defaultValue: ""
      },
      // Queue/Bot config
      transferQueueId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      timeToTransfer: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      maxUseBotQueues: {
        type: DataTypes.INTEGER,
        defaultValue: 3
      },
      expiresTicket: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      expiresInactiveMessage: {
        type: DataTypes.TEXT,
        defaultValue: ""
      },
      // Foreign keys
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      promptId: {
        type: DataTypes.INTEGER,
        references: { model: "Prompts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("ShopifyConnections");
  }
};
