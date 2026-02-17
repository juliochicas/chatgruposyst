import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Support Tickets
    await queryInterface.createTable("SupportTickets", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      subject: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "open"
        // "open" | "in_progress" | "waiting_response" | "resolved" | "closed"
      },
      priority: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: "medium"
        // "low" | "medium" | "high" | "urgent"
      },
      category: {
        type: DataTypes.STRING,
        allowNull: true
        // "billing" | "technical" | "general" | "feature_request" | "bug"
      },
      companyId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      assignedTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL"
      },
      lastMessageAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      resolvedAt: {
        type: DataTypes.DATE,
        allowNull: true
      },
      rating: {
        type: DataTypes.INTEGER,
        allowNull: true
        // 1-5 stars after resolution
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

    // 2. Support Messages (chat within a ticket)
    await queryInterface.createTable("SupportMessages", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "SupportTickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      senderId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: "Users", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
      },
      body: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      isInternal: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
        // true = internal note visible only to admins
      },
      attachmentUrl: {
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

    // Indexes
    await queryInterface.addIndex("SupportTickets", ["companyId"]);
    await queryInterface.addIndex("SupportTickets", ["status"]);
    await queryInterface.addIndex("SupportMessages", ["ticketId"]);
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.dropTable("SupportMessages");
    await queryInterface.dropTable("SupportTickets");
  }
};
