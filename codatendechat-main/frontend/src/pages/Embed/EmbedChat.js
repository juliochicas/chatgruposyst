import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  makeStyles,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Typography,
  TextField,
  IconButton,
  Divider,
  Badge,
  Chip,
  Paper,
} from "@material-ui/core";
import {
  Send as SendIcon,
  WhatsApp as WhatsAppIcon,
  ChatBubble as ChatIcon,
  ArrowBack as BackIcon,
} from "@material-ui/icons";
import axios from "axios";

const useStyles = makeStyles((theme) => ({
  container: {
    display: "flex",
    height: "100%",
  },
  ticketList: {
    width: "100%",
    maxWidth: 350,
    borderRight: `1px solid ${theme.palette.divider}`,
    overflowY: "auto",
    [theme.breakpoints.down("sm")]: {
      maxWidth: "100%",
    },
  },
  ticketListHidden: {
    display: "none",
  },
  chatArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    [theme.breakpoints.down("sm")]: {
      width: "100%",
    },
  },
  chatAreaHidden: {
    display: "none",
    [theme.breakpoints.up("md")]: {
      display: "flex",
    },
  },
  chatHeader: {
    padding: theme.spacing(1, 2),
    borderBottom: `1px solid ${theme.palette.divider}`,
    display: "flex",
    alignItems: "center",
    gap: theme.spacing(1),
    backgroundColor: theme.palette.background.default,
  },
  messagesArea: {
    flex: 1,
    overflowY: "auto",
    padding: theme.spacing(1),
  },
  messageRow: {
    display: "flex",
    marginBottom: theme.spacing(1),
  },
  messageRowOwn: {
    justifyContent: "flex-end",
  },
  messageBubble: {
    maxWidth: "75%",
    padding: theme.spacing(0.75, 1.5),
    borderRadius: 10,
    backgroundColor: "#e3f2fd",
  },
  messageBubbleOwn: {
    backgroundColor: "#c8e6c9",
  },
  messageSender: {
    fontWeight: 600,
    fontSize: "0.7rem",
    color: theme.palette.primary.main,
  },
  messageBody: {
    fontSize: "0.85rem",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
  messageTime: {
    fontSize: "0.6rem",
    color: theme.palette.text.secondary,
    textAlign: "right",
    marginTop: 2,
  },
  inputArea: {
    display: "flex",
    alignItems: "center",
    padding: theme.spacing(0.5, 1),
    borderTop: `1px solid ${theme.palette.divider}`,
    gap: theme.spacing(0.5),
  },
  emptyState: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    height: "100%",
    color: theme.palette.text.secondary,
  },
  ticketBadge: {
    marginLeft: "auto",
  },
  statusChip: {
    fontSize: "0.65rem",
    height: 20,
  },
}));

const EmbedChat = ({ user, token, embedToken }) => {
  const classes = useStyles();
  const backendUrl = process.env.REACT_APP_BACKEND_URL;

  const [tickets, setTickets] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [sending, setSending] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 960);

  const messagesEndRef = useRef(null);
  const pollInterval = useRef(null);

  const apiHeaders = {
    Authorization: `Bearer ${token}`,
    "X-Embed-Token": embedToken,
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 960);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Load tickets
  const loadTickets = useCallback(async () => {
    try {
      const { data } = await axios.get(`${backendUrl}/tickets`, {
        headers: apiHeaders,
        params: { showAll: "true", withUnreadMessages: "true" },
      });
      setTickets(data.tickets || []);
    } catch {
      // Silently fail on polling
    }
  }, [token, backendUrl]);

  useEffect(() => {
    loadTickets();
    // Poll for ticket updates every 10 seconds
    pollInterval.current = setInterval(loadTickets, 10000);
    return () => clearInterval(pollInterval.current);
  }, [loadTickets]);

  // Load messages when ticket selected
  const loadMessages = useCallback(async () => {
    if (!selectedTicket) return;
    try {
      const { data } = await axios.get(
        `${backendUrl}/messages/${selectedTicket.id}`,
        {
          headers: apiHeaders,
          params: { pageNumber: 1 },
        }
      );
      setMessages(data.messages || []);
    } catch {
      // Silently fail
    }
  }, [selectedTicket, token, backendUrl]);

  useEffect(() => {
    loadMessages();
    // Poll messages every 5 seconds when a ticket is selected
    const msgPoll = setInterval(loadMessages, 5000);
    return () => clearInterval(msgPoll);
  }, [loadMessages]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedTicket) return;
    setSending(true);
    try {
      await axios.post(
        `${backendUrl}/messages/${selectedTicket.id}`,
        { body: messageText.trim(), fromMe: true },
        { headers: apiHeaders }
      );
      setMessageText("");
      loadMessages();
    } catch {
      // Handle error
    }
    setSending(false);
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatTime = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handleSelectTicket = (ticket) => {
    setSelectedTicket(ticket);
    setMessages([]);
  };

  const handleBack = () => {
    setSelectedTicket(null);
  };

  const showList = !isMobile || !selectedTicket;
  const showChat = !isMobile || selectedTicket;

  return (
    <div className={classes.container}>
      {/* Ticket/Conversation List */}
      <div
        className={`${classes.ticketList} ${!showList ? classes.ticketListHidden : ""}`}
      >
        <List dense disablePadding>
          {tickets.length === 0 && (
            <div className={classes.emptyState} style={{ padding: 24 }}>
              <Typography variant="body2">
                No hay conversaciones activas.
              </Typography>
            </div>
          )}
          {tickets.map((ticket) => (
            <React.Fragment key={ticket.id}>
              <ListItem
                button
                selected={selectedTicket?.id === ticket.id}
                onClick={() => handleSelectTicket(ticket)}
              >
                <ListItemIcon>
                  <WhatsAppIcon
                    style={{
                      color:
                        ticket.status === "open"
                          ? "#4caf50"
                          : ticket.status === "pending"
                          ? "#ff9800"
                          : "#9e9e9e",
                    }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Typography variant="body2" noWrap>
                      <strong>{ticket.contact?.name || `#${ticket.id}`}</strong>
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" noWrap color="textSecondary">
                      {ticket.lastMessage || "Sin mensajes"}
                    </Typography>
                  }
                />
                {ticket.unreadMessages > 0 && (
                  <Badge
                    badgeContent={ticket.unreadMessages}
                    color="primary"
                    className={classes.ticketBadge}
                  />
                )}
              </ListItem>
              <Divider />
            </React.Fragment>
          ))}
        </List>
      </div>

      {/* Chat Area */}
      <div
        className={`${classes.chatArea} ${!showChat ? classes.chatAreaHidden : ""}`}
      >
        {selectedTicket ? (
          <>
            {/* Chat Header */}
            <div className={classes.chatHeader}>
              {isMobile && (
                <IconButton size="small" onClick={handleBack}>
                  <BackIcon />
                </IconButton>
              )}
              <WhatsAppIcon style={{ color: "#4caf50" }} />
              <div>
                <Typography variant="body1">
                  <strong>
                    {selectedTicket.contact?.name || `Ticket #${selectedTicket.id}`}
                  </strong>
                </Typography>
                <Typography variant="caption" color="textSecondary">
                  {selectedTicket.contact?.number || ""}
                </Typography>
              </div>
              <Chip
                size="small"
                label={selectedTicket.status}
                className={classes.statusChip}
                color="primary"
                variant="outlined"
              />
            </div>

            {/* Messages */}
            <div className={classes.messagesArea}>
              {messages.map((msg) => {
                const isOwn = msg.fromMe;
                return (
                  <div
                    key={msg.id}
                    className={`${classes.messageRow} ${
                      isOwn ? classes.messageRowOwn : ""
                    }`}
                  >
                    <div
                      className={`${classes.messageBubble} ${
                        isOwn ? classes.messageBubbleOwn : ""
                      }`}
                    >
                      <div className={classes.messageBody}>{msg.body}</div>
                      <div className={classes.messageTime}>
                        {formatTime(msg.createdAt)}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className={classes.inputArea}>
              <TextField
                fullWidth
                variant="outlined"
                size="small"
                placeholder="Escribe un mensaje..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                multiline
                maxRows={3}
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
        ) : (
          <div className={classes.emptyState}>
            <div style={{ textAlign: "center" }}>
              <ChatIcon style={{ fontSize: 48, opacity: 0.3 }} />
              <Typography variant="body1">
                Selecciona una conversación
              </Typography>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmbedChat;
