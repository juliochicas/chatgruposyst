import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.createTable("ShopifyProducts", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      shopifyProductId: {
        type: DataTypes.STRING,
        allowNull: false
      },
      title: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      handle: {
        type: DataTypes.STRING,
        allowNull: true
      },
      vendor: {
        type: DataTypes.STRING,
        allowNull: true
      },
      productType: {
        type: DataTypes.STRING,
        allowNull: true
      },
      tags: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
      },
      imageUrl: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      images: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
      },
      priceMin: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      priceMax: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
      },
      currency: {
        type: DataTypes.STRING,
        allowNull: true
      },
      variants: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: []
      },
      status: {
        type: DataTypes.STRING,
        defaultValue: "active"
      },
      totalInventory: {
        type: DataTypes.INTEGER,
        defaultValue: 0
      },
      productUrl: {
        type: DataTypes.TEXT,
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
    return queryInterface.dropTable("ShopifyProducts");
  }
};
