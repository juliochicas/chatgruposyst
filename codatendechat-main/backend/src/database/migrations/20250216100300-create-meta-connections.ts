import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("MetaConnections", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false
      },
      channel: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "facebook"
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "DISCONNECTED"
      },
      isDefault: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      // Meta OAuth tokens
      accessToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      refreshToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      tokenExpiresAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      // Facebook Page info
      pageId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      pageName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      pageAccessToken: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      // Instagram Business Account info
      instagramAccountId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      instagramUsername: {
        type: DataTypes.STRING,
        allowNull: true
      },
      // Webhook verification
      webhookVerifyToken: {
        type: DataTypes.STRING,
        allowNull: true
      },
      // Bot messages (same pattern as WhatsApp)
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
      integrationId: {
        type: DataTypes.INTEGER,
        references: { model: "QueueIntegrations", key: "id" },
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
    return queryInterface.dropTable("MetaConnections");
  }
};
