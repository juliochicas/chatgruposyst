import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addIndex("Messages", ["companyId", "ticketId", "createdAt"], {
      name: "idx_ms_company_id_ticket_id_created_at"
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeIndex("Messages", "idx_ms_company_id_ticket_id_created_at");
  }
};
