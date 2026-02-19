/* eslint-disable import/no-import-module-exports */
import { QueryInterface } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    // Add index to optimize message retrieval for ticket view (ListMessagesService)
    // Supports: where ticketId = ? and companyId = ? order by createdAt desc
    return queryInterface.addIndex(
      "Messages",
      ["companyId", "ticketId", "createdAt"],
      {
        name: "idx_ms_company_ticket_created"
      }
    );
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeIndex(
      "Messages",
      "idx_ms_company_ticket_created"
    );
  }
};
