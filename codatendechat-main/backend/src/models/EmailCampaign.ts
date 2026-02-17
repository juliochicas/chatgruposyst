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
  HasMany,
  AllowNull
} from "sequelize-typescript";
import Company from "./Company";
import ContactList from "./ContactList";
import Prompt from "./Prompt";
import EmailCampaignShipping from "./EmailCampaignShipping";

@Table({ tableName: "EmailCampaigns" })
class EmailCampaign extends Model<EmailCampaign> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @AllowNull(false)
  @Column
  name: string;

  @AllowNull(false)
  @Column
  subject: string;

  @Column
  htmlBody: string;

  @Column
  textBody: string;

  @Default("DRAFT")
  @Column
  status: string;

  @Default(false)
  @Column
  useAIVariation: boolean;

  @ForeignKey(() => Prompt)
  @Column
  aiPromptId: number;

  @BelongsTo(() => Prompt)
  aiPrompt: Prompt;

  @ForeignKey(() => ContactList)
  @Column
  contactListId: number;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @Default("list")
  @Column
  contactSource: string;

  @Default(30)
  @Column
  activeDaysFilter: number;

  @Column
  scheduledAt: Date;

  @Column
  completedAt: Date;

  @Default(0)
  @Column
  totalSent: number;

  @Default(0)
  @Column
  totalOpened: number;

  @Default(0)
  @Column
  totalReplied: number;

  @Default(0)
  @Column
  totalFailed: number;

  @Default(50)
  @Column
  batchSize: number;

  @Default(60)
  @Column
  delayBetweenBatches: number;

  @ForeignKey(() => Company)
  @Column
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @HasMany(() => EmailCampaignShipping)
  shippings: EmailCampaignShipping[];

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EmailCampaign;
