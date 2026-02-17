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
  AllowNull
} from "sequelize-typescript";
import EmailCampaign from "./EmailCampaign";

@Table({ tableName: "EmailCampaignShippings" })
class EmailCampaignShipping extends Model<EmailCampaignShipping> {
  @PrimaryKey
  @AutoIncrement
  @Column
  id: number;

  @ForeignKey(() => EmailCampaign)
  @AllowNull(false)
  @Column
  emailCampaignId: number;

  @BelongsTo(() => EmailCampaign)
  emailCampaign: EmailCampaign;

  @AllowNull(false)
  @Column
  contactEmail: string;

  @Column
  contactName: string;

  @Column
  subject: string;

  @Column
  body: string;

  @Column
  resendEmailId: string;

  @Default("PENDING")
  @Column
  status: string;

  @Column
  sentAt: Date;

  @Column
  openedAt: Date;

  @Column
  repliedAt: Date;

  @Column
  errorMessage: string;

  @Column
  jobId: string;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;
}

export default EmailCampaignShipping;
