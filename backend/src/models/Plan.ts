// Archivo: backend/src/models/Plan.ts
// Sistema de planes tipo Zendesk/HubSpot pero más simple

import {
  Table,
  Column,
  Model,
  DataType,
  HasMany,
  CreatedAt,
  UpdatedAt,
  PrimaryKey,
  AutoIncrement,
  Default
} from "sequelize-typescript";
import Company from "./Company";

@Table
class Plan extends Model<Plan> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string; // "Starter", "Professional", "Enterprise"

  @Column(DataType.DECIMAL(10, 2))
  monthlyPrice: number;

  @Column(DataType.DECIMAL(10, 2))
  yearlyPrice: number;

  // Límites del plan
  @Column(DataType.JSON)
  limits: {
    users: number;
    channels: number;
    contacts: number;
    messagesPerMonth: number;
    aiCredits: number;
    storage: number; // GB
    automations: number;
    integrations: string[]; // ["whatsapp", "facebook", "instagram", "shopify", "ai"]
  };

  // Características del plan
  @Column(DataType.JSON)
  features: {
    // Canales
    whatsapp: boolean;
    facebook: boolean;
    instagram: boolean;
    tiktok: boolean;
    
    // Funcionalidades
    aiAssistant: boolean;
    aiAutomation: boolean;
    shopifyIntegration: boolean;
    stripeIntegration: boolean;
    advancedAnalytics: boolean;
    customReports: boolean;
    apiAccess: boolean;
    whitelabel: boolean;
    
    // Soporte
    supportLevel: "community" | "email" | "priority" | "dedicated";
    sla: number; // horas de respuesta
  };

  @Default(true)
  @Column
  isActive: boolean;

  @Column
  stripeProductId: string;

  @HasMany(() => Company)
  companies: Company[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default Plan;
