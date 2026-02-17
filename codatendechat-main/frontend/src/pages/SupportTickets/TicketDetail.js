import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useHistory } from "react-router-dom";
import {
  makeStyles,
  Paper,
  Button,
  Typography,
  TextField,
  IconButton,
  Chip,
  Grid,
  Divider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Checkbox,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@material-ui/core";
import {
  ArrowBack as ArrowBackIcon,
  Send as SendIcon,
  Star as StarIcon,
  StarBorder as StarBorderIcon,
} from "@material-ui/icons";
import { toast } from "react-toastify";

import MainContainer from "../../components/MainContainer";
import MainHeader from "../../components/MainHeader";
import Title from "../../components/Title";
import api from "../../services/api";
import toastError from "../../errors/toastError";
import { AuthContext } from "../../context/Auth/AuthContext";
import { SocketContext } from "../../context/Socket/SocketContext";
import { i18n } from "../../translate/i18n";

const useStyles = makeStyles((theme) => ({
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    height: "calc(100vh - 180px)",
  },
  ticketInfo: {
    padding: theme.spacing(2),
    backgroundColor: theme.palette.background.default,
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(2),
    ...theme.scrollbarStyles,
  },
  messageRow: {
    display: "flex",
    marginBottom: theme.spacing(1.5),
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "70%",
    padding: theme.spacing(1, 2),
    borderRadius: 12,
    backgroundColor: "#e3f2fd",
    position: "relative",
  },
  messageBubbleOwn: {
    backgroundColor: "#c8e6c9",
  },
  messageBubbleInternal: {
    backgroundColor: "#fff9c4",
    border: "1px dashed #ff9800",
  },
  messageSender: {
    fontWeight: 600,
    fontSize: "0.75rem",
    color: theme.palette.primary.main,
    marginBottom: 2,
  },
  messageBody: {
    fontSize: "0.875rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  messageTime: {
    fontSize: "0.65rem",
    color: theme.palette.text.secondary,
    textAlign: "right",
    marginTop: 4,
  },
  internalLabel: {
    fontSize: "0.65rem",
    color: "#ff9800",
    fontStyle: "italic",
  },
  inputArea: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(1, 2),
    borderTop: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(1),
  },
  chipOpen: { backgroundColor: "#4caf50", color: "#fff" },
  chipInProgress: { backgroundColor: "#2196f3", color: "#fff" },
  chipWaiting: { backgroundColor: "#ff9800", color: "#fff" },
  chipResolved: { backgroundColor: "#9e9e9e", color: "#fff" },
  chipClosed: { backgroundColor: "#607d8b", color: "#fff" },
  chipLow: { backgroundColor: "#8bc34a", color: "#fff" },
  chipMedium: { backgroundColor: "#ff9800", color: "#fff" },
  chipHigh: { backgroundColor: "#f44336", color: "#fff" },
  chipUrgent: { backgroundColor: "#b71c1c", color: "#fff" },
  adminPanel: {
    padding: theme.spacing(2),
    borderLeft: `1px solid ${theme.palette.divider}`,
  },
  ratingArea: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    padding: theme.spacing(1, 0),
  },
}));

const statusLabels = {
  open: "Abierto",
  in_progress: "En Progreso",
  waiting_response: "Esperando Respuesta",
  resolved: "Resuelto",
  closed: "Cerrado",
};

const priorityLabels = {
  low: "Baja",
  medium: "Media",
  high: "Alta",
  urgent: "Urgente",
};

const categoryLabels = {
  billing: "Facturación",
  technical: "Técnico",
  general: "General",
  feature_request: "Solicitud",
  bug: "Error/Bug",
};

const TicketDetail = () => {
  const classes = useStyles();
  const { id } = useParams();
  const history = useHistory();
  const { user } = useContext(AuthContext);
  const socketManager = useContext(SocketContext);

  const [ticket, setTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [sending, setSending] = useState(false);
  const [ratingOpen, setRatingOpen] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);

  const messagesEndRef = useRef(null);
  const isSuper = user?.super === true;

  useEffect(() => {
    loadTicket();
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    const companyId = localStorage.getItem("companyId");
    const socket = socketManager.getSocket(companyId);

    socket.on("support-message", (data) => {
      if (data.action === "create" && String(data.ticketId) === String(id)) {
        setMessages((prev) => {
          const exists = prev.find((m) => m.id === data.message.id);
          if (exists) return prev;
          return [...prev, data.message];
        });
      }
    });

    socket.on("support-ticket", (data) => {
      if (data.action === "update" && String(data.ticket?.id) === String(id)) {
        setTicket((prev) => (prev ? { ...prev, ...data.ticket } : prev));
      }
    });

    return () => {
      socket.off("support-message");
      socket.off("support-ticket");
    };
  }, [id, socketManager]);

  const loadTicket = async () => {
    try {
      const { data } = await api.get(`/support-tickets/${id}`);
      setTicket(data);
      setMessages(data.messages || []);
    } catch (e) {
      toastError(e);
      history.push("/support-tickets");
    }
  };

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async () => {
    if (!messageText.trim()) return;
    setSending(true);
    try {
      await api.post(`/support-tickets/${id}/messages`, {
        body: messageText.trim(),
        isInternal,
      });
      setMessageText("");
      setIsInternal(false);
    } catch (e) {
      toastError(e);
    }
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUpdateTicket = async (updates) => {
    try {
      await api.put(`/support-tickets/${id}`, updates);
      toast.success("Ticket actualizado.");
      loadTicket();
    } catch (e) {
      toastError(e);
    }
  };

  const handleRate = async () => {
    if (ratingValue < 1 || ratingValue > 5) {
      toast.error("Selecciona una calificación de 1 a 5.");
      return;
    }
    try {
      await api.post(`/support-tickets/${id}/rate`, { rating: ratingValue });
      toast.success("Calificación registrada.");
      setRatingOpen(false);
      loadTicket();
    } catch (e) {
      toastError(e);
    }
  };

  const getStatusChipClass = (status) => {
    const map = {
      open: classes.chipOpen,
      in_progress: classes.chipInProgress,
      waiting_response: classes.chipWaiting,
      resolved: classes.chipResolved,
      closed: classes.chipClosed,
    };
    return map[status] || "";
  };

  const getPriorityChipClass = (priority) => {
    const map = {
      low: classes.chipLow,
      medium: classes.chipMedium,
      high: classes.chipHigh,
      urgent: classes.chipUrgent,
    };
    return map[priority] || "";
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!ticket) {
    return (
      <MainContainer>
        <MainHeader>
          <Title>{i18n.t("supportTickets.detail.loading")}</Title>
        </MainHeader>
      </MainContainer>
    );
  }

  const isClosed = ticket.status === "closed" || ticket.status === "resolved";
  const canRate =
    ticket.userId === user.id &&
    isClosed &&
    !ticket.rating;

  return (
    <MainContainer>
      <MainHeader>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <IconButton onClick={() => history.push("/support-tickets")} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Title>
            #{ticket.id} - {ticket.subject}
          </Title>
        </div>
      </MainHeader>

      <Paper variant="outlined" className={classes.chatContainer}>
        {/* Ticket Info Bar */}
        <div className={classes.ticketInfo}>
          <Grid container spacing={2} alignItems="center">
            <Grid item>
              <Chip
                size="small"
                label={statusLabels[ticket.status] || ticket.status}
                className={getStatusChipClass(ticket.status)}
              />
            </Grid>
            <Grid item>
              <Chip
                size="small"
                label={priorityLabels[ticket.priority] || ticket.priority}
                className={getPriorityChipClass(ticket.priority)}
              />
            </Grid>
            <Grid item>
              <Typography variant="body2" color="textSecondary">
                {categoryLabels[ticket.category] || ticket.category || "-"}
              </Typography>
            </Grid>
            {ticket.assignee && (
              <Grid item>
                <Typography variant="body2" color="textSecondary">
                  {i18n.t("supportTickets.detail.assignedTo")}: {ticket.assignee.name}
                </Typography>
              </Grid>
            )}
            {isSuper && (
              <Grid item>
                <Typography variant="body2" color="textSecondary">
                  {i18n.t("supportTickets.detail.company")}: {ticket.company?.name || "-"}
                </Typography>
              </Grid>
            )}
            {ticket.rating && (
              <Grid item>
                <div style={{ display: "flex", alignItems: "center" }}>
                  {[...Array(5)].map((_, i) => (
                    <StarIcon
                      key={i}
                      style={{
                        fontSize: 16,
                        color: i < ticket.rating ? "#ff9800" : "#ccc",
                      }}
                    />
                  ))}
                </div>
              </Grid>
            )}

            {/* Admin controls */}
            {isSuper && (
              <>
                <Grid item style={{ marginLeft: "auto" }}>
                  <FormControl size="small" variant="outlined" style={{ minWidth: 130 }}>
                    <InputLabel>{i18n.t("supportTickets.detail.status")}</InputLabel>
                    <Select
                      label={i18n.t("supportTickets.detail.status")}
                      value={ticket.status}
                      onChange={(e) => handleUpdateTicket({ status: e.target.value })}
                    >
                      <MenuItem value="open">Abierto</MenuItem>
                      <MenuItem value="in_progress">En Progreso</MenuItem>
                      <MenuItem value="waiting_response">Esperando</MenuItem>
                      <MenuItem value="resolved">Resuelto</MenuItem>
                      <MenuItem value="closed">Cerrado</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item>
                  <FormControl size="small" variant="outlined" style={{ minWidth: 110 }}>
                    <InputLabel>{i18n.t("supportTickets.detail.priority")}</InputLabel>
                    <Select
                      label={i18n.t("supportTickets.detail.priority")}
                      value={ticket.priority}
                      onChange={(e) => handleUpdateTicket({ priority: e.target.value })}
                    >
                      <MenuItem value="low">Baja</MenuItem>
                      <MenuItem value="medium">Media</MenuItem>
                      <MenuItem value="high">Alta</MenuItem>
                      <MenuItem value="urgent">Urgente</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </>
            )}

            {/* Rate button for ticket creator */}
            {canRate && (
              <Grid item style={{ marginLeft: isSuper ? 0 : "auto" }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="primary"
                  onClick={() => setRatingOpen(true)}
                  startIcon={<StarBorderIcon />}
                >
                  {i18n.t("supportTickets.detail.rate")}
                </Button>
              </Grid>
            )}
          </Grid>
        </div>

        <Divider />

        {/* Messages Area */}
        <div className={classes.messagesArea}>
          {messages.map((msg) => {
            const isOwn = msg.senderId === user.id || msg.sender?.id === user.id;
            return (
              <div
                key={msg.id}
                className={`${classes.messageRow} ${isOwn ? classes.messageRowOwn : ""}`}
              >
                <div
                  className={`${classes.messageBubble} ${
                    isOwn ? classes.messageBubbleOwn : ""
                  } ${msg.isInternal ? classes.messageBubbleInternal : ""}`}
                >
                  <div className={classes.messageSender}>
                    {msg.sender?.name || i18n.t("supportTickets.detail.system")}
                    {msg.isInternal && (
                      <span className={classes.internalLabel}>
                        {" "}({i18n.t("supportTickets.detail.internalNote")})
                      </span>
                    )}
                  </div>
                  <div className={classes.messageBody}>{msg.body}</div>
                  <div className={classes.messageTime}>{formatTime(msg.createdAt)}</div>
                </div>
              </div>
            );
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        {!isClosed && (
          <>
            <Divider />
            <div className={classes.inputArea}>
              {isSuper && (
                <FormControlLabel
                  control={
                    <Checkbox
                      size="small"
                      checked={isInternal}
                      onChange={(e) => setIsInternal(e.target.checked)}
                      color="default"
                    />
                  }
                  label={
                    <Typography variant="caption">
                      {i18n.t("supportTickets.detail.internalNote")}
                    </Typography>
                  }
                />
              )}
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder={i18n.t("supportTickets.detail.typePlaceholder")}
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={4}
                disabled={sending}
              />
              <IconButton
                color="primary"
                onClick={handleSendMessage}
                disabled={sending || !messageText.trim()}
              >
                <SendIcon />
              </IconButton>
            </div>
          </>
        )}
      </Paper>

      {/* Rating Dialog */}
      <Dialog open={ratingOpen} onClose={() => setRatingOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>{i18n.t("supportTickets.rating.title")}</DialogTitle>
        <DialogContent>
          <Typography gutterBottom>
            {i18n.t("supportTickets.rating.description")}
          </Typography>
          <div className={classes.ratingArea}>
            {[1, 2, 3, 4, 5].map((star) => (
              <IconButton
                key={star}
                size="small"
                onClick={() => setRatingValue(star)}
              >
                {star <= ratingValue ? (
                  <StarIcon style={{ color: "#ff9800", fontSize: 32 }} />
                ) : (
                  <StarBorderIcon style={{ fontSize: 32 }} />
                )}
              </IconButton>
            ))}
          </div>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRatingOpen(false)}>
            {i18n.t("supportTickets.rating.cancel")}
          </Button>
          <Button onClick={handleRate} color="primary" variant="contained">
            {i18n.t("supportTickets.rating.submit")}
          </Button>
        </DialogActions>
      </Dialog>
    </MainContainer>
  );
};

export default TicketDetail;
