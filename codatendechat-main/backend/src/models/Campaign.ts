import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  Default,
  ForeignKey,
  BelongsTo,
  HasMany
} from "sequelize-typescript";
import CampaignShipping from "./CampaignShipping";
import Company from "./Company";
import ContactList from "./ContactList";
import Whatsapp from "./Whatsapp";
import Files from "./Files";
import Tag from "./Tag";
import Prompt from "./Prompt";

@Table({ tableName: "Campaigns" })
class Campaign extends Model<Campaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @Column
  name: string;

  @Column({ defaultValue: "" })
  message1: string;

  @Column({ defaultValue: "" })
  message2: string;

  @Column({ defaultValue: "" })
  message3: string;

  @Column({ defaultValue: "" })
  message4: string;

  @Column({ defaultValue: "" })
  message5: string;

  @Column({ defaultValue: "INATIVA" })
  status: string; // INATIVA, PROGRAMADA, EM_ANDAMENTO, CANCELADA, FINALIZADA

  @Column
  mediaPath: string;

  @Column
  mediaName: string;

  @Column
  scheduledAt: Date;

  @Column
  completedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Tag)
  @Column
  tagId: number;

  @BelongsTo(() => Tag)
  tag: Tag;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @ForeignKey(() => Whatsapp)
  @Column
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Files)
  @Column
  fileListId: number;

  @BelongsTo(() => Files)
  fileList: Files;

  @HasMany(() => CampaignShipping)
  shipping: CampaignShipping[];

  // UltraMsg & AI Variation fields
  @Default("baileys")
  @Column
  sendVia: string; // "baileys" | "ultramsg"

  @Default(false)
  @Column
  useAIVariation: boolean;

  @ForeignKey(() => Prompt)
  @Column
  aiPromptId: number;

  @BelongsTo(() => Prompt)
  aiPrompt: Prompt;

  @Default("list")
  @Column
  contactSource: string; // "list" | "tag" | "active"

  @Default(30)
  @Column
  activeDaysFilter: number;

  @Default(0)
  @Column
  dailyLimit: number;

  @Default(false)
  @Column
  sendOnlyBusinessHours: boolean;

  @Default(0)
  @Column
  pauseAfterMessages: number;

  @Default(0)
  @Column
  pauseDuration: number;
}

export default Campaign;
