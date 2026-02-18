import { Request, Response } from "express";
import { Op } from "sequelize";
import AppError from "../errors/AppError";
import SupportTicket from "../models/SupportTicket";
import SupportMessage from "../models/SupportMessage";
import User from "../models/User";
import Company from "../models/Company";
import { getIO } from "../libs/socket";
import { logger } from "../utils/logger";

// ---------------------------------------------------------------------------
// List tickets (company user sees own tickets, super admin sees all)
// ---------------------------------------------------------------------------

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { status, priority, page = "1" } = req.query as any;

  const user = await User.findByPk(req.user.id);
  const isSuper = user?.super === true;

  const where: any = {};

  // Super admins see all tickets; regular users only see their company's
  if (!isSuper) {
    where.companyId = companyId;
  }

  if (status) {
    where.status = status;
  }

  if (priority) {
    where.priority = priority;
  }

  const limit = 20;
  const offset = (Number(page) - 1) * limit;

  const { rows: tickets, count } = await SupportTicket.findAndCountAll({
    where,
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] },
      { model: User, as: "assignee", attributes: ["id", "name", "email"] },
      { model: Company, attributes: ["id", "name"] }
    ],
    order: [
      ["status", "ASC"],
      ["priority", "DESC"],
      ["lastMessageAt", "DESC"],
      ["createdAt", "DESC"]
    ],
    limit,
    offset
  });

  return res.json({
    tickets,
    count,
    hasMore: count > offset + limit
  });
};

// ---------------------------------------------------------------------------
// Show single ticket with messages
// ---------------------------------------------------------------------------

export const show = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { companyId } = req.user;

  const user = await User.findByPk(req.user.id);
  const isSuper = user?.super === true;

  const ticket = await SupportTicket.findByPk(id, {
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] },
      { model: User, as: "assignee", attributes: ["id", "name", "email"] },
      { model: Company, attributes: ["id", "name"] },
      {
        model: SupportMessage,
        as: "messages",
        include: [
          { model: User, as: "sender", attributes: ["id", "name", "email"] }
        ],
        order: [["createdAt", "ASC"]]
      }
    ]
  });

  if (!ticket) {
    throw new AppError("Ticket no encontrado.", 404);
  }

  // Non-super users can only see their own company's tickets
  if (!isSuper && ticket.companyId !== companyId) {
    throw new AppError("No tienes permiso para ver este ticket.", 403);
  }

  // Filter out internal notes for non-super users
  if (!isSuper && ticket.messages) {
    ticket.messages = ticket.messages.filter(m => !m.isInternal);
  }

  return res.json(ticket);
};

// ---------------------------------------------------------------------------
// Create ticket (any authenticated user)
// ---------------------------------------------------------------------------

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { companyId } = req.user;
  const { subject, description, priority = "medium", category } = req.body;

  if (!subject) {
    throw new AppError("El asunto del ticket es requerido.", 400);
  }

  const ticket = await SupportTicket.create({
    subject,
    description,
    priority,
    category,
    status: "open",
    companyId,
    userId: req.user.id,
    lastMessageAt: new Date()
  });

  // Create initial message from description
  if (description) {
    await SupportMessage.create({
      ticketId: ticket.id,
      senderId: req.user.id,
      body: description,
      isInternal: false
    });
  }

  // Reload with associations
  const fullTicket = await SupportTicket.findByPk(ticket.id, {
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] },
      { model: Company, attributes: ["id", "name"] }
    ]
  });

  // Notify super admins via socket
  const io = getIO();
  io.emit("support-ticket", {
    action: "create",
    ticket: fullTicket
  });

  logger.info(`Support ticket #${ticket.id} created by user ${req.user.id} (company ${companyId})`);
  return res.status(201).json(fullTicket);
};

// ---------------------------------------------------------------------------
// Send message in a ticket
// ---------------------------------------------------------------------------

export const sendMessage = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { body, isInternal = false } = req.body;
  const { companyId } = req.user;

  if (!body || !body.trim()) {
    throw new AppError("El mensaje no puede estar vacío.", 400);
  }

  const user = await User.findByPk(req.user.id);
  const isSuper = user?.super === true;

  const ticket = await SupportTicket.findByPk(id);
  if (!ticket) {
    throw new AppError("Ticket no encontrado.", 404);
  }

  // Permission check
  if (!isSuper && ticket.companyId !== companyId) {
    throw new AppError("No tienes permiso para responder en este ticket.", 403);
  }

  // Only super admins can send internal notes
  const messageIsInternal = isSuper ? isInternal : false;

  const message = await SupportMessage.create({
    ticketId: ticket.id,
    senderId: req.user.id,
    body: body.trim(),
    isInternal: messageIsInternal
  });

  // Update ticket status and lastMessageAt
  const updates: any = { lastMessageAt: new Date() };

  if (isSuper && ticket.status === "open") {
    updates.status = "in_progress";
  }
  if (!isSuper && ticket.status === "waiting_response") {
    updates.status = "in_progress";
  }
  if (isSuper && !messageIsInternal) {
    updates.status = "waiting_response";
  }

  await ticket.update(updates);

  // Reload message with sender
  const fullMessage = await SupportMessage.findByPk(message.id, {
    include: [
      { model: User, as: "sender", attributes: ["id", "name", "email"] }
    ]
  });

  // Real-time notification via socket
  const io = getIO();

  // Notify the ticket room
  io.to(`support-ticket-${ticket.id}`).emit("support-message", {
    action: "create",
    ticketId: ticket.id,
    message: fullMessage
  });

  // Notify company channel for ticket status update
  io.to(`company-${ticket.companyId}-mainchannel`).emit("support-ticket", {
    action: "update",
    ticket: { ...ticket.toJSON(), ...updates }
  });

  // Notify admin channel
  io.emit("support-ticket", {
    action: "update",
    ticket: { ...ticket.toJSON(), ...updates }
  });

  return res.status(201).json(fullMessage);
};

// ---------------------------------------------------------------------------
// Update ticket (status, priority, assignment) - admin only
// ---------------------------------------------------------------------------

export const update = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { status, priority, assignedTo, category } = req.body;

  const user = await User.findByPk(req.user.id);
  const isSuper = user?.super === true;

  const ticket = await SupportTicket.findByPk(id);
  if (!ticket) {
    throw new AppError("Ticket no encontrado.", 404);
  }

  // Only super admins or company admins can update
  if (!isSuper && ticket.companyId !== req.user.companyId) {
    throw new AppError("No tienes permiso para actualizar este ticket.", 403);
  }

  const updates: any = {};

  if (status) {
    updates.status = status;
    if (status === "resolved" || status === "closed") {
      updates.resolvedAt = new Date();
    }
  }

  if (priority && isSuper) {
    updates.priority = priority;
  }

  if (assignedTo !== undefined && isSuper) {
    updates.assignedTo = assignedTo;
  }

  if (category && isSuper) {
    updates.category = category;
  }

  await ticket.update(updates);

  const fullTicket = await SupportTicket.findByPk(id, {
    include: [
      { model: User, as: "user", attributes: ["id", "name", "email"] },
      { model: User, as: "assignee", attributes: ["id", "name", "email"] },
      { model: Company, attributes: ["id", "name"] }
    ]
  });

  // Notify via socket
  const io = getIO();
  io.to(`support-ticket-${ticket.id}`).emit("support-ticket", {
    action: "update",
    ticket: fullTicket
  });
  io.to(`company-${ticket.companyId}-mainchannel`).emit("support-ticket", {
    action: "update",
    ticket: fullTicket
  });

  return res.json(fullTicket);
};

// ---------------------------------------------------------------------------
// Rate ticket (only the creator, after resolved)
// ---------------------------------------------------------------------------

export const rate = async (req: Request, res: Response): Promise<Response> => {
  const { id } = req.params;
  const { rating } = req.body;

  if (!rating || rating < 1 || rating > 5) {
    throw new AppError("La calificación debe ser entre 1 y 5.", 400);
  }

  const ticket = await SupportTicket.findByPk(id);
  if (!ticket) {
    throw new AppError("Ticket no encontrado.", 404);
  }

  if (Number(ticket.userId) !== Number(req.user.id)) {
    throw new AppError("Solo el creador del ticket puede calificar.", 403);
  }

  if (!["resolved", "closed"].includes(ticket.status)) {
    throw new AppError("Solo puedes calificar tickets resueltos.", 400);
  }

  await ticket.update({ rating });

  return res.json({ message: "Calificación registrada.", rating });
};

// ---------------------------------------------------------------------------
// Stats (super admin only)
// ---------------------------------------------------------------------------

export const stats = async (_req: Request, res: Response): Promise<Response> => {
  const [open, inProgress, waitingResponse, resolved, total] = await Promise.all([
    SupportTicket.count({ where: { status: "open" } }),
    SupportTicket.count({ where: { status: "in_progress" } }),
    SupportTicket.count({ where: { status: "waiting_response" } }),
    SupportTicket.count({ where: { status: { [Op.in]: ["resolved", "closed"] } } }),
    SupportTicket.count()
  ]);

  return res.json({
    open,
    inProgress,
    waitingResponse,
    resolved,
    total
  });
};
