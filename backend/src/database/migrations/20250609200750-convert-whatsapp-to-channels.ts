import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    // 1. Renombrar tabla Whatsapps a Channels
    await queryInterface.renameTable("Whatsapps", "Channels");

    // 2. Agregar columna para tipo de canal
    await queryInterface.addColumn("Channels", "type", {
      type: DataTypes.STRING(50),
      allowNull: false,
      defaultValue: "whatsapp"
    });

    // 3. Agregar columnas específicas para cada canal
    await queryInterface.addColumn("Channels", "facebookPageId", {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "facebookPageToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "instagramBusinessId", {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "instagramToken", {
      type: DataTypes.TEXT,
      allowNull: true
    });

    await queryInterface.addColumn("Channels", "webhookVerifyToken", {
      type: DataTypes.STRING(255),
      allowNull: true
    });

    // 4. Crear índice para el tipo de canal
    await queryInterface.addIndex("Channels", ["type"], {
      name: "idx_channels_type"
    });

    // 5. Agregar columna para configuraciones específicas del canal
    await queryInterface.addColumn("Channels", "channelConfig", {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    });

    // 6. Renombrar columnas en Messages
    await queryInterface.renameColumn("Messages", "whatsappId", "channelId");

    // 7. Renombrar columnas en Tickets
    await queryInterface.renameColumn("Tickets", "whatsappId", "channelId");

    // 8. Renombrar tabla QueueWhatsapps
    await queryInterface.renameTable("QueueWhatsapps", "QueueChannels");
    await queryInterface.renameColumn("QueueChannels", "whatsappId", "channelId");

    // 9. Renombrar en ContactWallets si existe
    const tables = await queryInterface.showAllTables();
    if (tables.includes("ContactWallets")) {
      await queryInterface.renameColumn("ContactWallets", "whatsappId", "channelId");
    }

    // 10. Crear tabla Plans
    await queryInterface.createTable("Plans", {
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
      monthlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      yearlyPrice: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
      },
      limits: {
        type: DataTypes.JSON,
        allowNull: false
      },
      features: {
        type: DataTypes.JSON,
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      stripeProductId: {
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

    // 11. Crear tabla SystemConfigurations
    await queryInterface.createTable("SystemConfigurations", {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
      },
      companyId: {
        type: DataTypes.INTEGER,
        references: { model: "Companies", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
        allowNull: false
      },
      category: {
        type: DataTypes.STRING,
        allowNull: false
      },
      key: {
        type: DataTypes.STRING,
        allowNull: false
      },
      value: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      displayName: {
        type: DataTypes.STRING,
        allowNull: false
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      isRequired: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
      },
      validation: {
        type: DataTypes.JSON,
        allowNull: true
      },
      helpUrl: {
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

    // 12. Agregar campos a Companies para el sistema de planes
    await queryInterface.addColumn("Companies", "planId", {
      type: DataTypes.INTEGER,
      references: { model: "Plans", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "usage", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    });

    await queryInterface.addColumn("Companies", "customLimits", {
      type: DataTypes.JSON,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "stripeCustomerId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "stripeSubscriptionId", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "subscriptionStatus", {
      type: DataTypes.STRING,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "trialEndsAt", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "nextBillingDate", {
      type: DataTypes.DATE,
      allowNull: true
    });

    await queryInterface.addColumn("Companies", "settings", {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: {}
    });
  },

  down: async (queryInterface: QueryInterface) => {
    // Revertir todos los cambios en orden inverso
    await queryInterface.removeColumn("Companies", "settings");
    await queryInterface.removeColumn("Companies", "nextBillingDate");
    await queryInterface.removeColumn("Companies", "trialEndsAt");
    await queryInterface.removeColumn("Companies", "subscriptionStatus");
    await queryInterface.removeColumn("Companies", "stripeSubscriptionId");
    await queryInterface.removeColumn("Companies", "stripeCustomerId");
    await queryInterface.removeColumn("Companies", "customLimits");
    await queryInterface.removeColumn("Companies", "usage");
    await queryInterface.removeColumn("Companies", "planId");

    await queryInterface.dropTable("SystemConfigurations");
    await queryInterface.dropTable("Plans");

    await queryInterface.renameColumn("QueueChannels", "channelId", "whatsappId");
    await queryInterface.renameTable("QueueChannels", "QueueWhatsapps");
    
    await queryInterface.renameColumn("Tickets", "channelId", "whatsappId");
    await queryInterface.renameColumn("Messages", "channelId", "whatsappId");
    
    await queryInterface.removeColumn("Channels", "channelConfig");
    await queryInterface.removeIndex("Channels", "idx_channels_type");
    await queryInterface.removeColumn("Channels", "webhookVerifyToken");
    await queryInterface.removeColumn("Channels", "instagramToken");
    await queryInterface.removeColumn("Channels", "instagramBusinessId");
    await queryInterface.removeColumn("Channels", "facebookPageToken");
    await queryInterface.removeColumn("Channels", "facebookPageId");
    await queryInterface.removeColumn("Channels", "type");
    
    await queryInterface.renameTable("Channels", "Whatsapps");
  }
};
