import Company from "../../models/Company";
import User from "../../models/User";
import Contact from "../../models/Contact";
import Ticket from "../../models/Ticket";
import Message from "../../models/Message";
import Queue from "../../models/Queue";
import Whatsapp from "../../models/Whatsapp";
import Setting from "../../models/Setting";
import Invoices from "../../models/Invoices";
import QuickMessage from "../../models/QuickMessage";
import Schedule from "../../models/Schedule";
import Tag from "../../models/Tag";
import CompanyAddon from "../../models/CompanyAddon";
import Addon from "../../models/Addon";
import { logger } from "../../utils/logger";
import fs from "fs";
import path from "path";
import AppError from "../../errors/AppError";

interface BackupResult {
  filePath: string;
  fileName: string;
  summary: {
    company: string;
    users: number;
    contacts: number;
    tickets: number;
    messages: number;
    queues: number;
    connections: number;
    exportedAt: string;
  };
}

const CompanyBackupService = async (companyId: number): Promise<BackupResult> => {
  const company = await Company.findByPk(companyId);
  if (!company) {
    throw new AppError("ERR_COMPANY_NOT_FOUND", 404);
  }

  logger.info(`CompanyBackup: Starting backup for company ${companyId} (${company.name})`);

  // Fetch all related data
  const [
    users,
    contacts,
    tickets,
    messages,
    queues,
    whatsapps,
    settings,
    invoices,
    quickMessages,
    schedules,
    tags,
    companyAddons
  ] = await Promise.all([
    User.findAll({
      where: { companyId },
      attributes: { exclude: ["passwordHash", "tokenVersion"] }
    }),
    Contact.findAll({ where: { companyId } }),
    Ticket.findAll({ where: { companyId } }),
    Message.findAll({ where: { companyId } }),
    Queue.findAll({ where: { companyId } }),
    Whatsapp.findAll({ where: { companyId } }),
    Setting.findAll({ where: { companyId } }),
    Invoices.findAll({ where: { companyId } }),
    QuickMessage.findAll({ where: { companyId } }),
    Schedule.findAll({ where: { companyId } }),
    Tag.findAll({ where: { companyId } }),
    CompanyAddon.findAll({
      where: { companyId },
      include: [{ model: Addon, as: "addon" }]
    })
  ]);

  const backupData = {
    exportInfo: {
      version: "1.0",
      platform: "ChateaYA",
      exportedAt: new Date().toISOString(),
      companyId
    },
    company: company.toJSON(),
    users: users.map(u => u.toJSON()),
    contacts: contacts.map(c => c.toJSON()),
    tickets: tickets.map(t => t.toJSON()),
    messages: messages.map(m => m.toJSON()),
    queues: queues.map(q => q.toJSON()),
    whatsapps: whatsapps.map(w => {
      const json = w.toJSON() as any;
      // Remove sensitive session data
      delete json.session;
      return json;
    }),
    settings: settings.map(s => s.toJSON()),
    invoices: invoices.map(i => i.toJSON()),
    quickMessages: quickMessages.map(qm => qm.toJSON()),
    schedules: schedules.map(s => s.toJSON()),
    tags: tags.map(t => t.toJSON()),
    companyAddons: companyAddons.map(ca => ca.toJSON())
  };

  // Write to file
  const backupsDir = path.resolve(__dirname, "..", "..", "..", "backups");
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const safeCompanyName = company.name.replace(/[^a-zA-Z0-9]/g, "_");
  const fileName = `backup_${safeCompanyName}_${companyId}_${timestamp}.json`;
  const filePath = path.join(backupsDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(backupData, null, 2), "utf-8");

  const summary = {
    company: company.name,
    users: users.length,
    contacts: contacts.length,
    tickets: tickets.length,
    messages: messages.length,
    queues: queues.length,
    connections: whatsapps.length,
    exportedAt: new Date().toISOString()
  };

  logger.info(
    `CompanyBackup: Backup complete for company ${companyId} – ` +
    `${contacts.length} contacts, ${tickets.length} tickets, ${messages.length} messages`
  );

  return { filePath, fileName, summary };
};

export default CompanyBackupService;
