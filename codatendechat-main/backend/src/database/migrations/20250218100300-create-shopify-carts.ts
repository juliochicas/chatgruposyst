import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("ShopifyCarts", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      ticketId: {
        type: DataTypes.INTEGER,
        references: { model: "Tickets", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      contactId: {
        type: DataTypes.INTEGER,
        references: { model: "Contacts", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "SET NULL",
        allowNull: true
      },
      items: {
        type: DataTypes.JSONB,
        allowNull: false,
        defaultValue: []
      },
      subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0
      },
      currency: {
        type: DataTypes.STRING,
        defaultValue: "USD"
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "active"
      },
      checkoutUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      shopifyOrderId: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shopifyOrderNumber: {
        type: DataTypes.STRING,
        allowNull: true
      },
      shopifyConnectionId: {
        type: DataTypes.INTEGER,
        references: { model: "ShopifyConnections", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE"
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
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.dropTable("ShopifyCarts");
  }
};
