import {
  Table,
  Column,
  CreatedAt,
  UpdatedAt,
  Model,
  DataType,
  PrimaryKey,
  Default,
  BelongsTo,
  ForeignKey
} from "sequelize-typescript";
import Contact from "./Contact";
import Ticket from "./Ticket";
import Company from "./Company";
import Queue from "./Queue";

@Table
class Message extends Model<Message> {
  @PrimaryKey
  @Column(DataType.STRING)
  id: string;

  @Column(DataType.STRING)
  remoteJid: string;

  @Column(DataType.STRING)
  participant: string;

  @Column(DataType.STRING)
  dataJson: string;

  @Default(0)
  @Column(DataType.INTEGER)
  ack: number;

  @Default(false)
  @Column(DataType.BOOLEAN)
  read: boolean;

  @Default(false)
  @Column(DataType.BOOLEAN)
  fromMe: boolean;

  @Column(DataType.TEXT)
  body: string;

  @Column(DataType.STRING)
  get mediaUrl(): string | null {
    if (this.getDataValue("mediaUrl")) {
      return `${process.env.BACKEND_URL}/public/${this.getDataValue(
        "mediaUrl"
      )}`;
    }
    return null;
  }

  @Column(DataType.STRING)
  mediaType: string;

  @Default(false)
  @Column(DataType.BOOLEAN)
  isDeleted: boolean;

  @CreatedAt
  @Column(DataType.DATE(6))
  createdAt: Date;

  @UpdatedAt
  @Column(DataType.DATE(6))
  updatedAt: Date;

  @ForeignKey(() => Message)
  @Column(DataType.STRING)
  quotedMsgId: string;

  @BelongsTo(() => Message, "quotedMsgId")
  quotedMsg: Message;

  @ForeignKey(() => Ticket)
  @Column(DataType.INTEGER)
  ticketId: number;

  @BelongsTo(() => Ticket)
  ticket: Ticket;

  @ForeignKey(() => Contact)
  @Column(DataType.INTEGER)
  contactId: number;

  @BelongsTo(() => Contact, "contactId")
  contact: Contact;

  @ForeignKey(() => Company)
  @Column(DataType.INTEGER)
  companyId: number;

  @BelongsTo(() => Company)
  company: Company;

  @ForeignKey(() => Queue)
  @Column(DataType.INTEGER)
  queueId: number;

  @BelongsTo(() => Queue)
  queue: Queue;
  
  @Default(false)
  @Column(DataType.BOOLEAN)
  isEdited: boolean;
}

export default Message;
