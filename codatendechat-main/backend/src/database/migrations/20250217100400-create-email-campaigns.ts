import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.createTable("EmailCampaigns", {
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
      subject: {
        type: DataTypes.STRING,
        allowNull: false
      },
      htmlBody: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      textBody: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "DRAFT"
        // DRAFT, SCHEDULED, SENDING, PAUSED, COMPLETED, CANCELLED
      },
      useAIVariation: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      aiPromptId: {
        type: DataTypes.INTEGER,
        references: { model: "Prompts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      contactListId: {
        type: DataTypes.INTEGER,
        references: { model: "ContactLists", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      contactSource: {
        type: DataTypes.STRING,
        defaultValue: "list"
        // list, active, import
      },
      activeDaysFilter: {
        type: DataTypes.INTEGER,
        defaultValue: 30
      },
      scheduledAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      completedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      totalSent: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      totalOpened: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      totalReplied: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      totalFailed: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      batchSize: {
        type: DataTypes.INTEGER,
        defaultValue: 50
      },
      delayBetweenBatches: {
        type: DataTypes.INTEGER,
        defaultValue: 60
        // seconds between batches
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
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

    await queryInterface.createTable("EmailCampaignShippings", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      emailCampaignId: {
        type: DataTypes.INTEGER,
        references: { model: "EmailCampaigns", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      contactEmail: {
        type: DataTypes.STRING,
        allowNull: false
      },
      contactName: {
        type: DataTypes.STRING,
        allowNull: true
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: true
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      resendEmailId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "PENDING"
        // PENDING, SENT, DELIVERED, OPENED, REPLIED, FAILED, BOUNCED
      },
      sentAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      openedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      repliedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      errorMessage: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      jobId: {
        type: DataTypes.STRING,
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

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("EmailCampaignShippings");
    await queryInterface.dropTable("EmailCampaigns");
  }
};
