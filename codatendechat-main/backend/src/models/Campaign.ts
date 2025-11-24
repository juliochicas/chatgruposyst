import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  PrimaryKey,
  AutoIncrement,
  ForeignKey,
  BelongsTo,
  HasMany,
  DataType
} from "sequelize-typescript";
import CampaignShipping from "./CampaignShipping";
import Company from "./Company";
import ContactList from "./ContactList";
import Whatsapp from "./Whatsapp";
import Files from "./Files";
import Tag from "./Tag";

@Table({ tableName: "Campaigns" })
class Campaign extends Model<Campaign> {
  @PrimaryKey
  @AutoIncrement
  @Column(DataType.INTEGER)
  id: number;

  @Column(DataType.STRING)
  name: string;

  @Column({ defaultValue: "", type: DataType.STRING })
  message1: string;

  @Column({ defaultValue: "", type: DataType.STRING })
  message2: string;

  @Column({ defaultValue: "", type: DataType.STRING })
  message3: string;

  @Column({ defaultValue: "", type: DataType.STRING })
  message4: string;

  @Column({ defaultValue: "", type: DataType.STRING })
  message5: string;

  @Column({ defaultValue: "INATIVA", type: DataType.STRING })
  status: string; // INATIVA, PROGRAMADA, EM_ANDAMENTO, CANCELADA, FINALIZADA

  @Column(DataType.STRING)
  mediaPath: string;

  @Column(DataType.STRING)
  mediaName: string;

  @Column(DataType.DATE)
  scheduledAt: Date;

  @Column(DataType.DATE)
  completedAt: Date;

  @CreatedAt
  createdAt: Date;

  @UpdatedAt
  updatedAt: Date;

  @ForeignKey(() => Tag)
  @Column(DataType.INTEGER)
  tagId: number;

  @BelongsTo(() => Tag)
  tag: Tag;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => ContactList)
  @Column(DataType.INTEGER)
  contactListId: number;

  @BelongsTo(() => ContactList)
  contactList: ContactList;

  @ForeignKey(() => Whatsapp)
  @Column(DataType.INTEGER)
  whatsappId: number;

  @BelongsTo(() => Whatsapp)
  whatsapp: Whatsapp;

  @ForeignKey(() => Files)
  @Column(DataType.INTEGER)
  fileListId: number;

  @BelongsTo(() => Files)
  fileList: Files;

  @HasMany(() => CampaignShipping)
  shipping: CampaignShipping[];
}

export default Campaign;
