import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const plans = await queryInterface.rawSelect("Plans", { where: {} }, ["id"]);
    if (plans) return; // Skip if plans already exist

    return queryInterface.bulkInsert("Plans", [
      {
        name: "Pro",
        users: 8,
        connections: 1,
        queues: 0,
        value: 99,
        description: "Para equipos en crecimiento",
        isPublic: true,
        isFeatured: false,
        isCustom: false,
        features: JSON.stringify([
          "8 usuarios incluidos",
          "1 conexion WhatsApp",
          "Chats ilimitados",
          "Chatbots ilimitados",
          "Historial ilimitado",
          "IA avanzada",
          "Campanas masivas",
          "Exportar historial",
          "Soporte prioritario"
        ]),
        useCampaigns: true,
        useSchedules: true,
        useInternalChat: true,
        useExternalApi: true,
        useKanban: true,
        useOpenAi: true,
        useIntegrations: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Basic",
        users: 3,
        connections: 1,
        queues: 8,
        value: 39,
        description: "Ideal para comenzar",
        isPublic: true,
        isFeatured: true,
        isCustom: false,
        features: JSON.stringify([
          "3 usuarios incluidos",
          "1 conexion WhatsApp",
          "Chats ilimitados",
          "Contactos ilimitados",
          "Hasta 8 chatbots",
          "Historial de 1 ano",
          "Integracion IA (GPT-4o)",
          "Soporte por WhatsApp"
        ]),
        useCampaigns: false,
        useSchedules: true,
        useInternalChat: true,
        useExternalApi: false,
        useKanban: true,
        useOpenAi: true,
        useIntegrations: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        name: "Personalizado",
        users: 3,
        connections: 1,
        queues: 0,
        value: 39,
        description: "Ajusta a tu medida",
        isPublic: true,
        isFeatured: false,
        isCustom: true,
        features: JSON.stringify([
          "Usuarios ajustables (+/-)",
          "Conexiones ajustables (+/-)",
          "Todo lo del plan Basic",
          "Chatbots ilimitados",
          "Campanas masivas",
          "IA avanzada",
          "Soporte prioritario"
        ]),
        useCampaigns: true,
        useSchedules: true,
        useInternalChat: true,
        useExternalApi: true,
        useKanban: true,
        useOpenAi: true,
        useIntegrations: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]);
  },

  down: async (queryInterface: QueryInterface) => {
    return queryInterface.bulkDelete("Plans", {});
  }
};
