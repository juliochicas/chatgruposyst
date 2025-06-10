// Archivo: backend/src/routes/configurationRoutes.ts
// Rutas para gestionar configuraciones del sistema

import { Router } from "express";
import isAuth from "../middleware/isAuth";
import * as ConfigurationController from "../controllers/ConfigurationController";

const configurationRoutes = Router();

// Todas las rutas requieren autenticación
configurationRoutes.use(isAuth);

// Listar todas las configuraciones agrupadas
configurationRoutes.get("/configurations", ConfigurationController.index);

// Obtener valor de una configuración
configurationRoutes.get("/configurations/:key", ConfigurationController.show);

// Guardar una configuración
configurationRoutes.post("/configurations", ConfigurationController.store);

// Guardar múltiples configuraciones
configurationRoutes.post("/configurations/bulk", ConfigurationController.bulkStore);

// Verificar si una característica está configurada
configurationRoutes.get("/configurations/check/:feature", ConfigurationController.checkFeature);

// Probar una configuración
configurationRoutes.post("/configurations/test", ConfigurationController.test);

// Exportar configuraciones
configurationRoutes.get("/configurations/export", ConfigurationController.exportConfigs);

// Importar configuraciones
configurationRoutes.post("/configurations/import", ConfigurationController.importConfigs);

export default configurationRoutes;
