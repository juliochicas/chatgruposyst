import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
  up: async (queryInterface: QueryInterface) => {
    await queryInterface.addColumn("Plans", "description", {
      type: DataTypes.STRING,
      allowNull: true
    });
    await queryInterface.addColumn("Plans", "isPublic", {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    });
    await queryInterface.addColumn("Plans", "isFeatured", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn("Plans", "isCustom", {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    });
    await queryInterface.addColumn("Plans", "features", {
      type: DataTypes.JSONB,
      allowNull: true
    });
  },

  down: async (queryInterface: QueryInterface) => {
    await queryInterface.removeColumn("Plans", "description");
    await queryInterface.removeColumn("Plans", "isPublic");
    await queryInterface.removeColumn("Plans", "isFeatured");
    await queryInterface.removeColumn("Plans", "isCustom");
    await queryInterface.removeColumn("Plans", "features");
  }
};
