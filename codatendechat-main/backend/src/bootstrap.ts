// IMPORTANTE: reflect-metadata DEBE ser importado ANTES que cualquier modelo
// Esto es crítico para que sequelize-typescript funcione correctamente
import "reflect-metadata";

import dotenv from "dotenv";

dotenv.config({
  path: process.env.NODE_ENV === "test" ? ".env.test" : ".env"
});
