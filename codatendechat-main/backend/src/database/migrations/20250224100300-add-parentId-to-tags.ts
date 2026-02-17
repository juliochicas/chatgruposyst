import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: (queryInterface: QueryInterface) => {
    return queryInterface.addColumn("Tags", "parentId", {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: null,
      references: { model: "Tags", key: "id" },
      onUpdate: "CASCADE",
      onDelete: "SET NULL",
    });
  },

  down: (queryInterface: QueryInterface) => {
    return queryInterface.removeColumn("Tags", "parentId");
  },
};
