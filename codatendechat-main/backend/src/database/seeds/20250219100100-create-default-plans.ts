import { QueryInterface } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    const plans = await queryInterface.rawSelect("Plans", { where: {} }, ["id"]);
    if (plans) return; // Skip if plans already exist

    return queryInterface.bulkInsert("Plans", [
      {
        name: "Basico",
        users: 3,
        connections: 1,
        queues: 8,
        value: 39,
        description: "Ideal para equipos pequenos",
        isPublic: true,
        isFeatured: false,
        isCustom: false,
        features: JSON.stringify([
          "3 agentes incluidos",
          "1 conexion WhatsApp",
          "Chats ilimitados",
          "Contactos ilimitados",
          "Hasta 8 chatbots",
          "Historial de 1 ano",
          "Instagram y Facebook",
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
        name: "Pro",
        users: 8,
        connections: 3,
        queues: 0,
        value: 99,
        description: "Para equipos en crecimiento",
        isPublic: true,
        isFeatured: true,
        isCustom: false,
        features: JSON.stringify([
          "8 agentes incluidos",
          "3 conexiones WhatsApp",
          "Chats ilimitados",
          "Chatbots ilimitados",
          "Historial ilimitado",
          "5+ cuentas Instagram/Facebook",
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
        name: "Personalizado",
        users: 0,
        connections: 0,
        queues: 0,
        value: 0,
        description: "Para operaciones grandes",
        isPublic: true,
        isFeatured: false,
        isCustom: true,
        features: JSON.stringify([
          "Agentes ilimitados",
          "Conexiones ilimitadas",
          "Todo lo del plan Pro",
          "Onboarding personalizado",
          "SLA garantizado",
          "Integraciones a medida",
          "Servidor dedicado",
          "Soporte 24/7"
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
